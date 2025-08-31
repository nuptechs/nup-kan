/**
 * 🛡️ AUTHORIZATION SERVICE - Serviço Unificado de Autorização
 * 
 * Responsabilidades:
 * - Validação centralizada de permissões
 * - Cache inteligente de verificações
 * - Logs de auditoria de acesso
 * - Interface única para todos os services
 */

import { PERMISSIONS, isValidPermission } from '../config/permissions';
import type { AuthContext } from '../auth/unifiedAuth';
import { cache } from '../cache';

export interface AuthorizationError extends Error {
  code: 'INSUFFICIENT_PERMISSIONS' | 'INVALID_PERMISSION' | 'UNAUTHORIZED';
  permission?: string;
  resource?: string;
  action?: string;
}

export class AuthorizationService {
  private cache = cache;

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  hasPermission(authContext: AuthContext, permission: string): boolean {
    // Validar se a permissão existe
    if (!isValidPermission(permission)) {
      console.warn(`⚠️ [AUTHORIZATION] Permissão inválida: ${permission}`);
      return false;
    }

    // Verificar se o usuário tem a permissão
    const userPermissions = authContext.permissions || [];
    const hasAccess = userPermissions.includes(permission);

    // Log de auditoria
    this.logPermissionCheck(authContext.userId, permission, hasAccess);

    return hasAccess;
  }

  /**
   * Exige que o usuário tenha uma permissão (lança erro se não tiver)
   */
  requirePermission(
    authContext: AuthContext, 
    permission: string, 
    action: string = 'executar esta ação'
  ): void {
    if (!this.hasPermission(authContext, permission)) {
      const error = new Error(
        `Permissão insuficiente: '${permission}' necessária para ${action}`
      ) as AuthorizationError;
      
      error.code = 'INSUFFICIENT_PERMISSIONS';
      error.permission = permission;
      error.action = action;
      
      // Log de tentativa negada
      this.logAccessDenied(authContext.userId, permission, action);
      
      throw error;
    }
  }

  /**
   * Verifica múltiplas permissões (OR - usuário precisa ter pelo menos uma)
   */
  hasAnyPermission(authContext: AuthContext, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(authContext, permission));
  }

  /**
   * Verifica múltiplas permissões (AND - usuário precisa ter todas)
   */
  hasAllPermissions(authContext: AuthContext, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(authContext, permission));
  }

  /**
   * Exige pelo menos uma das permissões fornecidas
   */
  requireAnyPermission(
    authContext: AuthContext, 
    permissions: string[], 
    action: string = 'executar esta ação'
  ): void {
    if (!this.hasAnyPermission(authContext, permissions)) {
      const permissionList = permissions.join(' ou ');
      const error = new Error(
        `Permissão insuficiente: Uma das seguintes permissões é necessária para ${action}: ${permissionList}`
      ) as AuthorizationError;
      
      error.code = 'INSUFFICIENT_PERMISSIONS';
      error.action = action;
      
      this.logAccessDenied(authContext.userId, permissionList, action);
      
      throw error;
    }
  }

  /**
   * Verifica se o usuário pode acessar um recurso específico
   */
  canAccessResource(
    authContext: AuthContext, 
    resource: string, 
    action: 'list' | 'create' | 'edit' | 'delete' | 'view' = 'view'
  ): boolean {
    const actionMap = {
      'list': 'List',
      'create': 'Create', 
      'edit': 'Edit',
      'delete': 'Delete',
      'view': 'View'
    };

    const permission = `${actionMap[action]} ${resource}`;
    return this.hasPermission(authContext, permission);
  }

  /**
   * Gera objeto de capacidades do usuário para um recurso
   */
  getUserCapabilities(authContext: AuthContext, resource: string) {
    return {
      canList: this.canAccessResource(authContext, resource, 'list'),
      canCreate: this.canAccessResource(authContext, resource, 'create'),
      canEdit: this.canAccessResource(authContext, resource, 'edit'),
      canDelete: this.canAccessResource(authContext, resource, 'delete'),
      canView: this.canAccessResource(authContext, resource, 'view')
    };
  }

  /**
   * Log de verificação de permissão
   */
  private logPermissionCheck(userId: string, permission: string, granted: boolean): void {
    const status = granted ? '✅' : '❌';
    const cacheKey = `perm_log:${userId}:${permission}:${Date.now()}`;
    
    // Log apenas para debug, evita spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`${status} [AUTHORIZATION] User ${userId} -> ${permission}: ${granted ? 'GRANTED' : 'DENIED'}`);
    }
  }

  /**
   * Log de acesso negado
   */
  private logAccessDenied(userId: string, permission: string, action: string): void {
    console.warn(`🚫 [ACCESS-DENIED] User ${userId} tentou ${action} sem permissão: ${permission}`);
    
    // Aqui poderia salvar em audit log, enviar para monitoring, etc.
  }

  /**
   * Valida contexto de autenticação
   */
  validateAuthContext(authContext: AuthContext): void {
    if (!authContext || !authContext.userId) {
      const error = new Error('Contexto de autenticação inválido') as AuthorizationError;
      error.code = 'UNAUTHORIZED';
      throw error;
    }
  }

  /**
   * Middleware helper para rotas
   */
  static requirePermission(permission: string) {
    return (authContext: AuthContext, action?: string) => {
      const authService = new AuthorizationService();
      authService.validateAuthContext(authContext);
      authService.requirePermission(authContext, permission, action);
    };
  }

  /**
   * Obtém estatísticas de uso de permissões (para admin)
   */
  async getPermissionStats(): Promise<{
    totalPermissions: number;
    mostUsedPermissions: Array<{ permission: string; usage: number }>;
    leastUsedPermissions: Array<{ permission: string; usage: number }>;
  }> {
    // Implementação futura - análise de logs de permissões
    return {
      totalPermissions: Object.keys(PERMISSIONS).length,
      mostUsedPermissions: [],
      leastUsedPermissions: []
    };
  }
}

// Instância singleton para reutilização
export const authorizationService = new AuthorizationService();