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
}

// Export singleton instance
export const permissionService = new PermissionService();