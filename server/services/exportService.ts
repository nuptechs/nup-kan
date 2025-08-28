/**
 * 📊 EXPORT SERVICE - Gerenciamento de Exportações
 * 
 * Responsabilidades:
 * - Histórico de exportações
 * - Lógica de negócio (formatos, permissões)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { ExportHistory, InsertExportHistory } from "@shared/schema";
import { TTL } from "../cache";

export interface ExportCreateRequest {
  userId: string;
  exportType: string;
  fileName: string;
  fileSize?: number;
  status?: string;
  metadata?: any;
}

export class ExportService extends BaseService {

  async getExportHistory(authContext: AuthContext, userId: string): Promise<ExportHistory[]> {
    this.log('export-service', 'getExportHistory', { userId: authContext.userId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, 'Listar Export', 'visualizar histórico de exportações');

      const cacheKey = `export_history:${userId}`;
      const cached = await this.cache.get<ExportHistory[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const exports = await this.storage.getExportHistory(userId);
      await this.cache.set(cacheKey, exports, TTL.MEDIUM);
      
      return exports;
    } catch (error) {
      this.logError('export-service', 'getExportHistory', error);
      throw error;
    }
  }

  async createExportHistory(authContext: AuthContext, request: ExportCreateRequest): Promise<ExportHistory> {
    this.log('export-service', 'createExportHistory', { userId: authContext.userId, exportType: request.exportType });
    
    try {
      this.requirePermission(authContext, 'Criar Export', 'criar exportação');

      const validData = request as InsertExportHistory;
      const exportRecord = await this.storage.createExportHistory(validData);

      await this.invalidateCache([`export_history:${request.userId}`]);

      this.emitEvent('export.created', {
        exportId: exportRecord.id,
        exportType: request.exportType,
        userId: authContext.userId,
      });

      return exportRecord;
    } catch (error) {
      this.logError('export-service', 'createExportHistory', error);
      throw error;
    }
  }

  async updateExportHistory(authContext: AuthContext, exportId: string, request: Partial<ExportCreateRequest>): Promise<ExportHistory> {
    this.log('export-service', 'updateExportHistory', { userId: authContext.userId, exportId });
    
    try {
      this.requirePermission(authContext, 'Editar Export', 'atualizar exportação');

      const validData = request as Partial<InsertExportHistory>;
      const exportRecord = await this.storage.updateExportHistory(exportId, validData);

      await this.invalidateCache(['export_history:*']);

      this.emitEvent('export.updated', {
        exportId,
        userId: authContext.userId,
        changes: validData,
      });

      return exportRecord;
    } catch (error) {
      this.logError('export-service', 'updateExportHistory', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();