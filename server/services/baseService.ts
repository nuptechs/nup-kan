/**
 * 🏗️ BASE SERVICE - Camada de Serviços Unificada
 * 
 * RESPONSABILIDADES:
 * - Única interface pública para persistência de dados
 * - Lógica de negócio e validação
 * - Gerenciamento de cache inteligente  
 * - Emissão de eventos de domínio
 * - Permissões e autorização
 * 
 * ARQUITETURA:
 * Services (público) -> DatabaseStorage (DAO privado) -> Database
 */

import { storage } from "../storage";
import { eventBus } from "../cqrs/events";
import { cache } from "../cache";
import type { AuthContext } from "../microservices/authService";

export abstract class BaseService {
  protected readonly storage = storage;
  protected readonly eventBus = eventBus;
  protected readonly cache = cache;

  /**
   * Verificar se usuário tem permissão específica
   */
  protected hasPermission(authContext: AuthContext, permission: string): boolean {
    return authContext.permissions?.includes(permission) || false;
  }

  /**
   * Validar permissão obrigatória (throw se não tiver)
   */
  protected requirePermission(authContext: AuthContext, permission: string, action?: string): void {
    if (!this.hasPermission(authContext, permission)) {
      const actionText = action ? ` para ${action}` : '';
      throw new Error(`Permissão insuficiente: '${permission}' necessária${actionText}`);
    }
  }

  /**
   * Limpar cache relacionado a uma entidade
   */
  protected async invalidateCache(patterns: string[]): Promise<void> {
    try {
      await Promise.all(
        patterns.map(pattern => {
          if (pattern.includes('*')) {
            return this.cache.invalidatePattern(pattern);
          } else {
            return this.cache.del(pattern);
          }
        })
      );
    } catch (error) {
      console.error('⚠️ [CACHE] Erro na invalidação:', error);
    }
  }

  /**
   * Emitir evento de domínio
   */
  protected emitEvent(eventName: string, data: any): void {
    try {
      this.eventBus.emit(eventName, data);
    } catch (error) {
      console.error('⚠️ [EVENT] Erro na emissão:', error);
    }
  }

  /**
   * Log padrão para operações de serviço
   */
  protected log(service: string, operation: string, details?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`🔷 [${service.toUpperCase()}] ${operation}`, details || '');
  }

  /**
   * Log de erro padrão para serviços
   */
  protected logError(service: string, operation: string, error: any): void {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${service.toUpperCase()}] Erro em ${operation}:`, error);
  }
}

/**
 * Interface padrão para resposta de serviços
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Interface padrão para listas paginadas
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Options padrão para paginação
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Helper para criar resposta de sucesso
 */
export function createSuccessResponse<T>(data: T, message?: string): ServiceResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Helper para criar resposta de erro
 */
export function createErrorResponse(error: string): ServiceResponse<never> {
  return {
    success: false,
    error,
  };
}