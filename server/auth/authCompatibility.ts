/**
 * 🔧 AUTH COMPATIBILITY - Funções para compatibilidade durante transição
 * 
 * Este arquivo existe temporariamente para resolver incompatibilidades de tipos
 * entre o sistema antigo e o UnifiedAuthService durante a migração
 */

import { AuthContext as UnifiedAuthContext } from './unifiedAuth';

// Tipo legado para compatibilidade
export interface LegacyAuthContext {
  userId: string;
  userName: string;
  userEmail: string;
  permissions: string[];
  permissionCategories: string[];
  profileId: string;
  profileName: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  sessionId: string;
  isAuthenticated: boolean;
  lastActivity: Date;
  tokenPayload?: any;
}

/**
 * 🔄 Converter UnifiedAuthContext para LegacyAuthContext
 */
export function convertToLegacyAuthContext(unified: UnifiedAuthContext | null): LegacyAuthContext | null {
  if (!unified) return null;
  
  return {
    userId: unified.userId,
    userName: unified.userName,
    userEmail: unified.userEmail,
    permissions: unified.permissions,
    permissionCategories: unified.permissionCategories || [],
    profileId: unified.profileId || '',
    profileName: unified.profileName || '',
    teams: unified.teams,
    sessionId: unified.sessionId || `unified-${unified.userId}`,
    isAuthenticated: unified.isAuthenticated,
    lastActivity: unified.lastActivity,
  };
}

/**
 * 🛡️ Verificar se authContext é válido e autenticado
 */
export function isAuthContextValid(authContext: any): boolean {
  return authContext && authContext.isAuthenticated === true && authContext.userId;
}

/**
 * 🔐 Extrair userId de authContext com segurança
 */
export function getUserIdFromAuthContext(authContext: any): string | null {
  return authContext?.userId || null;
}

/**
 * 🎭 Verificar permissão com compatibilidade
 */
export function hasPermissionCompat(authContext: any, permission: string): boolean {
  if (!authContext || !authContext.permissions) return false;
  return authContext.permissions.includes(permission);
}