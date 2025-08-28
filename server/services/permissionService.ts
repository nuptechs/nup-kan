/**
 * 🔐 PERMISSION SERVICE - Gerenciamento de Permissões
 * 
 * Responsabilidades:
 * - CRUD completo de permissões com validação
 * - Lógica de negócio (categorias, hierarquia)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de permissões
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { Permission, InsertPermission } from "@shared/schema";
import { insertPermissionSchema } from "@shared/schema";
import { TTL } from "../cache";

export interface PermissionCreateRequest {
  name: string;
  category?: string;
  description?: string;
}

export interface PermissionUpdateRequest {
  name?: string;
  category?: string;
  description?: string;
}

export class PermissionService extends BaseService {

  /**
   * Listar todas as permissões
   */
  async getPermissions(authContext: AuthContext): Promise<Permission[]> {
    this.log('permission-service', 'getPermissions', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Permissions', 'listar permissões');

      const cacheKey = 'permissions:all';
      const cached = await this.cache.get<Permission[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const permissions = await this.storage.getPermissions();
      await this.cache.set(cacheKey, permissions, TTL.LONG); // Permissões mudam raramente
      
      return permissions;
    } catch (error) {
      this.logError('permission-service', 'getPermissions', error);
      throw error;
    }
  }

  /**
   * Obter uma permissão por ID
   */
  async getPermission(authContext: AuthContext, permissionId: string): Promise<Permission | null> {
    this.log('permission-service', 'getPermission', { userId: authContext.userId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Listar Permissions', 'visualizar permissão');

      const permission = await this.storage.getPermission(permissionId);
      return permission || null;
    } catch (error) {
      this.logError('permission-service', 'getPermission', error);
      throw error;
    }
  }

  /**
   * Criar nova permissão
   */
  async createPermission(authContext: AuthContext, request: PermissionCreateRequest): Promise<Permission> {
    this.log('permission-service', 'createPermission', { userId: authContext.userId, name: request.name });
    
    try {
      this.requirePermission(authContext, 'Criar Permissions', 'criar permissões');

      const validData = insertPermissionSchema.parse(request);
      const permission = await this.storage.createPermission(validData);

      // Invalidar cache
      await this.invalidateCache(['permissions:all']);

      this.emitEvent('permission.created', {
        permissionId: permission.id,
        userId: authContext.userId,
        permissionName: permission.name,
      });

      return permission;
    } catch (error) {
      this.logError('permission-service', 'createPermission', error);
      throw error;
    }
  }

  /**
   * Atualizar permissão existente
   */
  async updatePermission(authContext: AuthContext, permissionId: string, request: PermissionUpdateRequest): Promise<Permission> {
    this.log('permission-service', 'updatePermission', { userId: authContext.userId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Editar Permissions', 'editar permissões');

      const existingPermission = await this.storage.getPermission(permissionId);
      if (!existingPermission) {
        throw new Error('Permissão não encontrada');
      }

      const updatedPermission = await this.storage.updatePermission(permissionId, request);

      // Invalidar cache
      await this.invalidateCache(['permissions:all']);

      this.emitEvent('permission.updated', {
        permissionId,
        userId: authContext.userId,
        changes: request,
      });

      return updatedPermission;
    } catch (error) {
      this.logError('permission-service', 'updatePermission', error);
      throw error;
    }
  }

  /**
   * Excluir permissão
   */
  async deletePermission(authContext: AuthContext, permissionId: string): Promise<void> {
    this.log('permission-service', 'deletePermission', { userId: authContext.userId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Excluir Permissions', 'excluir permissões');

      const permission = await this.storage.getPermission(permissionId);
      if (!permission) {
        throw new Error('Permissão não encontrada');
      }

      await this.storage.deletePermission(permissionId);

      // Invalidar cache
      await this.invalidateCache(['permissions:all']);

      this.emitEvent('permission.deleted', {
        permissionId,
        userId: authContext.userId,
        permissionName: permission.name,
      });

    } catch (error) {
      this.logError('permission-service', 'deletePermission', error);
      throw error;
    }
  }

  /**
   * Buscar todas as permissões de perfil
   */
  async getAllProfilePermissions(authContext: AuthContext) {
    this.log('permission-service', 'getAllProfilePermissions', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Permissions', 'listar permissões de perfil');

      const profilePermissions = await this.storage.getAllProfilePermissions();
      return profilePermissions;
    } catch (error) {
      this.logError('permission-service', 'getAllProfilePermissions', error);
      throw error;
    }
  }

  /**
   * Adicionar permissão a usuário
   */
  async addPermissionToUser(authContext: AuthContext, userId: string, permissionId: string) {
    this.log('permission-service', 'addPermissionToUser', { userId: authContext.userId, targetUserId: userId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Editar Permissions', 'adicionar permissão ao usuário');

      const result = await this.storage.addPermissionToUser(userId, permissionId);

      this.emitEvent('user_permission.added', {
        userId,
        permissionId,
        addedBy: authContext.userId,
      });

      return result;
    } catch (error) {
      this.logError('permission-service', 'addPermissionToUser', error);
      throw error;
    }
  }

  /**
   * Remover permissão de usuário
   */
  async removePermissionFromUser(authContext: AuthContext, userId: string, permissionId: string) {
    this.log('permission-service', 'removePermissionFromUser', { userId: authContext.userId, targetUserId: userId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Editar Permissions', 'remover permissão do usuário');

      await this.storage.removePermissionFromUser(userId, permissionId);

      this.emitEvent('user_permission.removed', {
        userId,
        permissionId,
        removedBy: authContext.userId,
      });

    } catch (error) {
      this.logError('permission-service', 'removePermissionFromUser', error);
      throw error;
    }
  }

  /**
   * Buscar permissões de equipe
   */
  async getTeamPermissions(authContext: AuthContext, teamId: string) {
    this.log('permission-service', 'getTeamPermissions', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Teams', 'visualizar permissões da equipe');

      const permissions = await this.storage.getTeamPermissions(teamId);
      return permissions;
    } catch (error) {
      this.logError('permission-service', 'getTeamPermissions', error);
      throw error;
    }
  }

  /**
   * Adicionar permissão a equipe
   */
  async addPermissionToTeam(authContext: AuthContext, teamId: string, permissionId: string) {
    this.log('permission-service', 'addPermissionToTeam', { userId: authContext.userId, teamId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Editar Teams', 'adicionar permissão à equipe');

      const result = await this.storage.addPermissionToTeam(teamId, permissionId);

      this.emitEvent('team_permission.added', {
        teamId,
        permissionId,
        addedBy: authContext.userId,
      });

      return result;
    } catch (error) {
      this.logError('permission-service', 'addPermissionToTeam', error);
      throw error;
    }
  }

  /**
   * Remover permissão de equipe
   */
  async removePermissionFromTeam(authContext: AuthContext, teamId: string, permissionId: string) {
    this.log('permission-service', 'removePermissionFromTeam', { userId: authContext.userId, teamId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Editar Teams', 'remover permissão da equipe');

      await this.storage.removePermissionFromTeam(teamId, permissionId);

      this.emitEvent('team_permission.removed', {
        teamId,
        permissionId,
        removedBy: authContext.userId,
      });

    } catch (error) {
      this.logError('permission-service', 'removePermissionFromTeam', error);
      throw error;
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();