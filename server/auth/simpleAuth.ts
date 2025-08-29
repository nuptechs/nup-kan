/**
 * 🚀 SISTEMA DE AUTENTICAÇÃO SIMPLIFICADO - NuP-Kan
 * 
 * RESPONSABILIDADES:
 * - Interface User simplificada e otimizada
 * - Função única para buscar usuário com permissões
 * - Middleware unificado que substitui múltiplos middlewares
 * - Cache otimizado para performance
 * 
 * PERFORMANCE TARGET: < 10ms para verificações de auth
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, profiles, permissions, profilePermissions, userTeams, teams } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { cache } from '../cache';
import { JWTService } from '../services/jwtService';

/**
 * Interface User Simplificada - Contém apenas o essencial
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  permissions: string[];
  profileId?: string;
}

/**
 * Request estendida com User
 */
export interface AuthRequest extends Request {
  user?: User;
  authContext?: {
    userId: string;
    userName: string;
    userEmail: string;
    permissions: string[];
    profileId?: string;
    isAuthenticated: boolean;
  };
}

/**
 * 🎯 FUNÇÃO ÚNICA PARA BUSCAR USUÁRIO COM PERMISSÕES
 * 
 * UMA ÚNICA QUERY otimizada que busca:
 * - Dados básicos do usuário
 * - Permissões através do profile
 * - Teams associados
 * 
 * PERFORMANCE: Cache de 1 hora + query otimizada
 */
export async function getUserWithPermissions(userId: string): Promise<User | null> {
  try {
    // 1. Verificar cache primeiro
    const cacheKey = `user_with_permissions:${userId}`;
    const cached = await cache.get<User>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // 2. UMA ÚNICA QUERY para buscar tudo
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        profileId: users.profileId,
        permissions: sql<string[]>`
          COALESCE(
            ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
            ARRAY[]::text[]
          )
        `
      })
      .from(users)
      .leftJoin(profiles, eq(users.profileId, profiles.id))
      .leftJoin(profilePermissions, eq(profiles.id, profilePermissions.profileId))
      .leftJoin(permissions, eq(profilePermissions.permissionId, permissions.id))
      .where(eq(users.id, userId))
      .groupBy(users.id, users.name, users.email, users.avatar, users.profileId);

    if (!result || result.length === 0) {
      return null;
    }

    const userData: User = {
      id: result[0].id,
      name: result[0].name,
      email: result[0].email,
      avatar: result[0].avatar || undefined,
      permissions: result[0].permissions || [],
      profileId: result[0].profileId || undefined
    };

    // 3. Cache por 1 hora
    await cache.set(cacheKey, userData, 3600);
    
    return userData;
    
  } catch (error) {
    console.error('❌ [AUTH] Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * 🛡️ MIDDLEWARE UNIFICADO DE AUTENTICAÇÃO
 * 
 * Substitui AuthMiddleware.requireAuth + AuthMiddleware.requirePermissions
 * Aceita tanto JWT quanto session auth para compatibilidade
 * 
 * @param requiredPermissions - String ou array de permissões necessárias
 */
export const auth = (requiredPermissions?: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let userId: string | null = null;
      
      // 1. Tentar JWT Auth primeiro (mais rápido)
      const token = JWTService.extractTokenFromRequest(req) || null;
      if (token) {
        const tokenPayload = await JWTService.verifyAccessToken(token);
        if (tokenPayload) {
          userId = tokenPayload.userId;
        }
      }
      
      // 2. Fallback para session auth (compatibilidade)  
      if (!userId) {
        userId = req.session?.user?.id || req.session?.userId || null;
      }
      
      // 3. Se não tem userId, bloquear acesso
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      // 4. Buscar dados completos do usuário
      const user = await getUserWithPermissions(userId);
      
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }
      
      // 5. Verificar permissões se necessário
      if (requiredPermissions) {
        const permissions = Array.isArray(requiredPermissions) 
          ? requiredPermissions 
          : [requiredPermissions];
        
        const hasPermission = permissions.some(permission => 
          user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            error: 'Forbidden',
            message: `Required permissions: ${permissions.join(', ')}`
          });
        }
      }
      
      // 6. Anexar usuário à request
      req.user = user;
      req.authContext = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        permissions: user.permissions,
        profileId: user.profileId,
        isAuthenticated: true
      };
      
      next();
      
    } catch (error) {
      console.error('❌ [AUTH] Erro no middleware:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication error'
      });
    }
  };
};

/**
 * 🚀 MIDDLEWARE SÓ PARA AUTENTICAÇÃO (sem verificação de permissão)
 */
export const requireAuth = auth();

/**
 * 🎯 MIDDLEWARE COM PERMISSÕES ESPECÍFICAS
 * 
 * Exemplos de uso:
 * - requirePermission('manage_boards')
 * - requirePermission(['manage_boards', 'view_analytics'])
 */
export const requirePermission = (permissions: string | string[]) => auth(permissions);

/**
 * 📊 ESTATÍSTICAS DE PERFORMANCE
 */
export class AuthStats {
  private static cacheHits = 0;
  private static cacheMisses = 0;
  private static authAttempts = 0;
  
  static recordCacheHit() {
    this.cacheHits++;
  }
  
  static recordCacheMiss() {
    this.cacheMisses++;
  }
  
  static recordAuthAttempt() {
    this.authAttempts++;
  }
  
  static getStats() {
    const cacheHitRate = this.authAttempts > 0 
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 
      : 0;
      
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      authAttempts: this.authAttempts,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }
}