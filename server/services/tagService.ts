/**
 * 🏷️ TAG SERVICE - Gerenciamento de Tags
 * 
 * Responsabilidades:
 * - CRUD completo de tags com validação
 * - Lógica de negócio (cores, categorização)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de tags
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { Tag, InsertTag } from "@shared/schema";
import { insertTagSchema } from "@shared/schema";
import { TTL } from "../cache";

export interface TagCreateRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface TagUpdateRequest {
  name?: string;
  color?: string;
  description?: string;
}

export class TagService extends BaseService {

  /**
   * Listar todas as tags
   */
  async getTags(authContext: AuthContext): Promise<Tag[]> {
    this.log('tag-service', 'getTags', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Tags', 'listar tags');

      const cacheKey = 'tags:all';
      const cached = await this.cache.get<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const tags = await this.storage.getTags();
      await this.cache.set(cacheKey, tags, TTL.LONG); // Tags mudam raramente
      
      return tags;
    } catch (error) {
      this.logError('tag-service', 'getTags', error);
      throw error;
    }
  }

  /**
   * Obter uma tag por ID
   */
  async getTag(authContext: AuthContext, tagId: string): Promise<Tag | null> {
    this.log('tag-service', 'getTag', { userId: authContext.userId, tagId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Tags', 'visualizar tag');

      const tag = await this.storage.getTag(tagId);
      return tag || null;
    } catch (error) {
      this.logError('tag-service', 'getTag', error);
      throw error;
    }
  }

  /**
   * Criar nova tag
   */
  async createTag(authContext: AuthContext, request: TagCreateRequest): Promise<Tag> {
    this.log('tag-service', 'createTag', { userId: authContext.userId, name: request.name });
    
    try {
      this.requirePermission(authContext, 'Criar Tags', 'criar tags');

      const validData = insertTagSchema.parse({
        ...request,
        color: request.color || '#3B82F6'
      });
      
      const tag = await this.storage.createTag(validData);

      // Invalidar cache
      await this.invalidateCache(['tags:all']);

      this.emitEvent('tag.created', {
        tagId: tag.id,
        userId: authContext.userId,
        tagName: tag.name,
      });

      return tag;
    } catch (error) {
      this.logError('tag-service', 'createTag', error);
      throw error;
    }
  }

  /**
   * Atualizar tag existente
   */
  async updateTag(authContext: AuthContext, tagId: string, request: TagUpdateRequest): Promise<Tag> {
    this.log('tag-service', 'updateTag', { userId: authContext.userId, tagId });
    
    try {
      this.requirePermission(authContext, 'Editar Tags', 'editar tags');

      const existingTag = await this.storage.getTag(tagId);
      if (!existingTag) {
        throw new Error('Tag não encontrada');
      }

      const updatedTag = await this.storage.updateTag(tagId, request);

      // Invalidar cache
      await this.invalidateCache(['tags:all']);

      this.emitEvent('tag.updated', {
        tagId,
        userId: authContext.userId,
        changes: request,
      });

      return updatedTag;
    } catch (error) {
      this.logError('tag-service', 'updateTag', error);
      throw error;
    }
  }

  /**
   * Excluir tag
   */
  async deleteTag(authContext: AuthContext, tagId: string): Promise<void> {
    this.log('tag-service', 'deleteTag', { userId: authContext.userId, tagId });
    
    try {
      this.requirePermission(authContext, 'Excluir Tags', 'excluir tags');

      const tag = await this.storage.getTag(tagId);
      if (!tag) {
        throw new Error('Tag não encontrada');
      }

      await this.storage.deleteTag(tagId);

      // Invalidar cache
      await this.invalidateCache(['tags:all']);

      this.emitEvent('tag.deleted', {
        tagId,
        userId: authContext.userId,
        tagName: tag.name,
      });

    } catch (error) {
      this.logError('tag-service', 'deleteTag', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tagService = new TagService();