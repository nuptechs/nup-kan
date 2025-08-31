/**
 * 📋 COLUMN SERVICE - Gerenciamento de Colunas
 * 
 * Responsabilidades:
 * - CRUD completo de colunas com validação
 * - Lógica de negócio (reordenação, WIP limits)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de colunas
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { Column, InsertColumn, UpdateColumn } from "@shared/schema";
import { insertColumnSchema, updateColumnSchema } from "@shared/schema";
import { TTL } from "../cache";
import { PERMISSIONS } from "../config/permissions";

export interface ColumnCreateRequest {
  boardId: string;
  title: string;
  position: number;
  wipLimit?: number;
  color?: string;
}

export interface ColumnUpdateRequest {
  title?: string;
  position?: number;
  wipLimit?: number;
  color?: string;
}

export class ColumnService extends BaseService {

  /**
   * Listar todas as colunas
   */
  async getColumns(authContext: AuthContext): Promise<Column[]> {
    this.log('column-service', 'getColumns', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.LIST, 'listar colunas');

      const cacheKey = 'columns:all';
      const cached = await this.cache.get<Column[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const columns = await this.storage.getColumns();
      await this.cache.set(cacheKey, columns, TTL.MEDIUM);
      
      return columns;
    } catch (error) {
      this.logError('column-service', 'getColumns', error);
      throw error;
    }
  }

  /**
   * Listar colunas de um board específico
   */
  async getBoardColumns(authContext: AuthContext, boardId: string): Promise<Column[]> {
    this.log('column-service', 'getBoardColumns', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.VIEW, 'visualizar colunas');

      const cacheKey = `board_columns:${boardId}`;
      const cached = await this.cache.get<Column[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const columns = await this.storage.getBoardColumns(boardId);
      await this.cache.set(cacheKey, columns, TTL.MEDIUM);
      
      return columns;
    } catch (error) {
      this.logError('column-service', 'getBoardColumns', error);
      throw error;
    }
  }

  /**
   * Obter uma coluna por ID
   */
  async getColumn(authContext: AuthContext, columnId: string): Promise<Column | null> {
    this.log('column-service', 'getColumn', { userId: authContext.userId, columnId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.VIEW, 'visualizar coluna');

      const column = await this.storage.getColumn(columnId);
      return column || null;
    } catch (error) {
      this.logError('column-service', 'getColumn', error);
      throw error;
    }
  }

  /**
   * Criar nova coluna
   */
  async createColumn(authContext: AuthContext, request: ColumnCreateRequest): Promise<Column> {
    this.log('column-service', 'createColumn', { userId: authContext.userId, title: request.title });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.CREATE, 'criar colunas');

      const validData = insertColumnSchema.parse(request);
      const column = await this.storage.createColumn(validData);

      // Invalidar caches
      await this.invalidateCache([
        'columns:all',
        `board_columns:${request.boardId}`
      ]);

      this.emitEvent('column.created', {
        columnId: column.id,
        boardId: request.boardId,
        userId: authContext.userId,
      });

      return column;
    } catch (error) {
      this.logError('column-service', 'createColumn', error);
      throw error;
    }
  }

  /**
   * Atualizar coluna existente
   */
  async updateColumn(authContext: AuthContext, columnId: string, request: ColumnUpdateRequest): Promise<Column> {
    this.log('column-service', 'updateColumn', { userId: authContext.userId, columnId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.EDIT, 'editar colunas');

      const existingColumn = await this.storage.getColumn(columnId);
      if (!existingColumn) {
        throw new Error('Coluna não encontrada');
      }

      const validData = updateColumnSchema.parse(request);
      const updatedColumn = await this.storage.updateColumn(columnId, validData);

      // Invalidar caches
      await this.invalidateCache([
        'columns:all',
        `board_columns:${existingColumn.boardId}`
      ]);

      this.emitEvent('column.updated', {
        columnId,
        boardId: existingColumn.boardId,
        userId: authContext.userId,
        changes: validData,
      });

      return updatedColumn;
    } catch (error) {
      this.logError('column-service', 'updateColumn', error);
      throw error;
    }
  }

  /**
   * Excluir coluna
   */
  async deleteColumn(authContext: AuthContext, columnId: string): Promise<void> {
    this.log('column-service', 'deleteColumn', { userId: authContext.userId, columnId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.DELETE, 'excluir colunas');

      const column = await this.storage.getColumn(columnId);
      if (!column) {
        throw new Error('Coluna não encontrada');
      }

      await this.storage.deleteColumn(columnId);

      // Invalidar caches
      await this.invalidateCache([
        'columns:all',
        `board_columns:${column.boardId}`
      ]);

      this.emitEvent('column.deleted', {
        columnId,
        boardId: column.boardId,
        userId: authContext.userId,
      });

    } catch (error) {
      this.logError('column-service', 'deleteColumn', error);
      throw error;
    }
  }

  /**
   * Reordenar colunas
   */
  async reorderColumns(authContext: AuthContext, reorderedColumns: { id: string; position: number }[]): Promise<void> {
    this.log('column-service', 'reorderColumns', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.COLUMNS.EDIT, 'reordenar colunas');

      await this.storage.reorderColumns(reorderedColumns);

      // Invalidar todos os caches de colunas
      await this.invalidateCache([
        'columns:*',
        'board_columns:*'
      ]);

      this.emitEvent('columns.reordered', {
        userId: authContext.userId,
        columnsCount: reorderedColumns.length,
      });

    } catch (error) {
      this.logError('column-service', 'reorderColumns', error);
      throw error;
    }
  }
}

// Export singleton instance
export const columnService = new ColumnService();