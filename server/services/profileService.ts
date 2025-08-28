/**
 * 👤 PROFILE SERVICE - Gerenciamento de Perfis
 * 
 * Responsabilidades:
 * - CRUD completo de perfis com validação
 * - Lógica de negócio (permissões, hierarquia)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de perfis
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { Profile, InsertProfile, UpdateProfile } from "@shared/schema";
import { insertProfileSchema, updateProfileSchema } from "@shared/schema";
import { TTL } from "../cache";

export interface ProfileCreateRequest {
  name: string;
  description?: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  description?: string;
}

export class ProfileService extends BaseService {

  /**
   * Listar todos os perfis
   */
  async getProfiles(authContext: AuthContext): Promise<Profile[]> {
    this.log('profile-service', 'getProfiles', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Profiles', 'listar perfis');

      const cacheKey = 'profiles:all';
      const cached = await this.cache.get<Profile[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const profiles = await this.storage.getProfiles();
      await this.cache.set(cacheKey, profiles, TTL.LONG); // Perfis mudam raramente
      
      return profiles;
    } catch (error) {
      this.logError('profile-service', 'getProfiles', error);
      throw error;
    }
  }

  /**
   * Obter um perfil por ID
   */
  async getProfile(authContext: AuthContext, profileId: string): Promise<Profile | null> {
    this.log('profile-service', 'getProfile', { userId: authContext.userId, profileId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Profiles', 'visualizar perfil');

      const profile = await this.storage.getProfile(profileId);
      return profile || null;
    } catch (error) {
      this.logError('profile-service', 'getProfile', error);
      throw error;
    }
  }

  /**
   * Criar novo perfil
   */
  async createProfile(authContext: AuthContext, request: ProfileCreateRequest): Promise<Profile> {
    this.log('profile-service', 'createProfile', { userId: authContext.userId, name: request.name });
    
    try {
      this.requirePermission(authContext, 'Criar Profiles', 'criar perfis');

      const validData = insertProfileSchema.parse(request);
      const profile = await this.storage.createProfile(validData);

      // Invalidar cache
      await this.invalidateCache(['profiles:all']);

      this.emitEvent('profile.created', {
        profileId: profile.id,
        userId: authContext.userId,
        profileName: profile.name,
      });

      return profile;
    } catch (error) {
      this.logError('profile-service', 'createProfile', error);
      throw error;
    }
  }

  /**
   * Atualizar perfil existente
   */
  async updateProfile(authContext: AuthContext, profileId: string, request: ProfileUpdateRequest): Promise<Profile> {
    this.log('profile-service', 'updateProfile', { userId: authContext.userId, profileId });
    
    try {
      this.requirePermission(authContext, 'Editar Profiles', 'editar perfis');

      const existingProfile = await this.storage.getProfile(profileId);
      if (!existingProfile) {
        throw new Error('Perfil não encontrado');
      }

      const validData = updateProfileSchema.parse(request);
      const updatedProfile = await this.storage.updateProfile(profileId, validData);

      // Invalidar cache
      await this.invalidateCache(['profiles:all']);

      this.emitEvent('profile.updated', {
        profileId,
        userId: authContext.userId,
        changes: validData,
      });

      return updatedProfile;
    } catch (error) {
      this.logError('profile-service', 'updateProfile', error);
      throw error;
    }
  }

  /**
   * Excluir perfil
   */
  async deleteProfile(authContext: AuthContext, profileId: string): Promise<void> {
    this.log('profile-service', 'deleteProfile', { userId: authContext.userId, profileId });
    
    try {
      this.requirePermission(authContext, 'Excluir Profiles', 'excluir perfis');

      const profile = await this.storage.getProfile(profileId);
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }

      await this.storage.deleteProfile(profileId);

      // Invalidar cache
      await this.invalidateCache(['profiles:all']);

      this.emitEvent('profile.deleted', {
        profileId,
        userId: authContext.userId,
        profileName: profile.name,
      });

    } catch (error) {
      this.logError('profile-service', 'deleteProfile', error);
      throw error;
    }
  }

  /**
   * Gerenciar permissões do perfil
   */
  async getProfilePermissions(authContext: AuthContext, profileId: string): Promise<any[]> {
    this.log('profile-service', 'getProfilePermissions', { userId: authContext.userId, profileId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Profiles', 'visualizar permissões do perfil');
      return await this.storage.getProfilePermissions(profileId);
    } catch (error) {
      this.logError('profile-service', 'getProfilePermissions', error);
      throw error;
    }
  }

  async addPermissionToProfile(authContext: AuthContext, profileId: string, permissionId: string): Promise<any> {
    this.log('profile-service', 'addPermissionToProfile', { userId: authContext.userId, profileId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Gerenciar Permissões', 'adicionar permissão ao perfil');
      return await this.storage.addPermissionToProfile(profileId, permissionId);
    } catch (error) {
      this.logError('profile-service', 'addPermissionToProfile', error);
      throw error;
    }
  }

  async removePermissionFromProfile(authContext: AuthContext, profileId: string, permissionId: string): Promise<void> {
    this.log('profile-service', 'removePermissionFromProfile', { userId: authContext.userId, profileId, permissionId });
    
    try {
      this.requirePermission(authContext, 'Gerenciar Permissões', 'remover permissão do perfil');
      return await this.storage.removePermissionFromProfile(profileId, permissionId);
    } catch (error) {
      this.logError('profile-service', 'removePermissionFromProfile', error);
      throw error;
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService();