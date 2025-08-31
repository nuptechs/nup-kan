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
import { eventBus, emit } from "../events";
import type { EventType, EventData } from "../events/types";
import { cache } from "../../cache";
import type { AuthContext } from "../auth/unifiedAuth";
import { authorizationService } from "./authorizationService";
import { Logger } from '../utils/logMessages';

export abstract class BaseService {
  protected readonly storage = storage;
  protected readonly eventBus = eventBus;
  protected readonly cache = cache;

  /**
   * Verificar se usuário tem permissão específica (via AuthorizationService centralizado)
   */
  protected hasPermission(authContext: AuthContext, permission: string): boolean {
    return authorizationService.hasPermission(authContext, permission);
  }

  /**
   * Validar permissão obrigatória (throw se não tiver) (via AuthorizationService centralizado)
   */
  protected requirePermission(authContext: AuthContext, permission: string, action?: string): void {
    authorizationService.requirePermission(authContext, permission, action);
  }

  /**
   * Verificar múltiplas permissões (OR - pelo menos uma)
   */
  protected hasAnyPermission(authContext: AuthContext, permissions: string[]): boolean {
    return authorizationService.hasAnyPermission(authContext, permissions);
  }

  /**
   * Verificar múltiplas permissões (AND - todas)
   */
  protected hasAllPermissions(authContext: AuthContext, permissions: string[]): boolean {
    return authorizationService.hasAllPermissions(authContext, permissions);
  }

  /**
   * Exigir pelo menos uma das permissões
   */
  protected requireAnyPermission(authContext: AuthContext, permissions: string[], action?: string): void {
    authorizationService.requireAnyPermission(authContext, permissions, action);
  }

  /**
   * Obter capacidades do usuário para um recurso
   */
  protected getUserCapabilities(authContext: AuthContext, resource: string) {
    return authorizationService.getUserCapabilities(authContext, resource);
  }

  /**
   * Limpar cache relacionado a uma entidade - Interface simplificada
   */
  protected async invalidateCache(keys: string[]): Promise<void> {
    await this.cache.invalidate(keys);
  }

  /**
   * 🎪 Emitir evento de domínio tipado
   */
  protected async emitEvent<T extends EventType>(
    eventType: T, 
    data: EventData<T>,
    metadata?: { source?: string; version?: number }
  ): Promise<void> {
    try {
      await emit(eventType, data, {
        userId: (data as any).userId || 'system',
        source: 'service-layer',
        ...metadata
      });
    } catch (error) {
      Logger.error.generic(`EVENT-EMIT-${eventType.toUpperCase()}`, error);
    }
  }

  /**
   * Log padrão para operações de serviço
   */
  protected log(service: string, operation: string, details?: any): void {
    const timestamp = new Date().toISOString();
    Logger.service.operation(service, operation, details || '');
  }

  /**
   * Log de erro padrão para serviços
   */
  protected logError(service: string, operation: string, error: any): void {
    const timestamp = new Date().toISOString();
    Logger.error.generic(`${service.toUpperCase()}-${operation}`, error);
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