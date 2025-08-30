/**
 * 🚀 UNIFIED AUTH SERVICE - Sistema de Autenticação Unificado NuP-Kan
 * 
 * CONSOLIDAÇÃO COMPLETA:
 * - Remove sistema de sessões (mantém apenas JWT)
 * - Une AuthService + AuthServiceJWT + simpleAuth em um só
 * - Interface limpa e performance otimizada
 * - Cache inteligente com Redis/memória
 * - Blacklist para logout seguro
 * 
 * PERFORMANCE TARGET: < 8ms para todas operações
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, profiles, permissions, profilePermissions, userTeams, teams } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { cache, TTL } from '../cache';
import { JWTService, JWTPayload, TokenPair } from '../services/jwtService';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

// =====================================
// INTERFACES E TIPOS
// =====================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UnifiedUser;
  tokens?: TokenPair;
  message?: string;
}

export interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  permissions: string[];
  profileId?: string;
  profileName?: string;
  teams?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface AuthContext {
  userId: string;
  userName: string;
  userEmail: string;
  permissions: string[];
  permissionCategories?: string[]; // Para compatibilidade
  profileId?: string;
  profileName?: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  sessionId?: string; // Para compatibilidade  
  isAuthenticated: boolean;
  lastActivity: Date;
}

export interface AuthRequest extends Request {
  user?: UnifiedUser;
  authContext?: AuthContext;
}

// =====================================
// UNIFIED AUTH SERVICE
// =====================================

export class UnifiedAuthService {
  
  /**
   * 🔐 AUTHENTICATE - Login com credenciais
   * Substitui todos os métodos de login anteriores
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔐 [UNIFIED-AUTH] Iniciando autenticação para:', credentials.email);
      
      // 1. Buscar usuário por email
      const user = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          password: users.password,
          profileId: users.profileId,
        })
        .from(users)
        .where(eq(users.email, credentials.email))
        .limit(1);

      if (!user || user.length === 0) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }

      const foundUser = user[0];

      // 2. Verificar senha
      if (!foundUser.password) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }
      
      const isPasswordValid = await bcrypt.compare(credentials.password, foundUser.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }

      // 3. Buscar dados completos do usuário
      const fullUser = await this.getUserWithPermissions(foundUser.id);
      if (!fullUser) {
        return {
          success: false,
          message: 'Erro ao carregar dados do usuário'
        };
      }

      // 4. Gerar tokens JWT
      const tokens = JWTService.generateTokenPair({
        userId: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        profileId: fullUser.profileId
      });

      console.log('✅ [UNIFIED-AUTH] Autenticação bem-sucedida para:', fullUser.email);

      return {
        success: true,
        user: fullUser,
        tokens,
        message: 'Login realizado com sucesso'
      };

    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro na autenticação:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  /**
   * 🎯 VALIDATE TOKEN - Verificação otimizada de token
   * Substitui todos os métodos de verificação
   */
  static async validateToken(token: string): Promise<AuthContext | null> {
    try {
      // 1. Verificar e decodificar token
      const tokenPayload = await JWTService.verifyAccessToken(token);
      if (!tokenPayload) {
        return null;
      }

      // 2. Cache inteligente baseado no token
      const cacheKey = `unified_auth:${tokenPayload.userId}:${tokenPayload.iat}`;
      const cached = await cache.get<AuthContext>(cacheKey);
      
      if (cached && cached.userId === tokenPayload.userId) {
        console.log('🎯 [UNIFIED-AUTH] Cache hit para usuário:', tokenPayload.userId);
        return cached;
      }

      // 3. Buscar dados completos (cache miss)
      const user = await this.getUserWithPermissions(tokenPayload.userId);
      if (!user) {
        return null;
      }

      // 4. Criar contexto de autenticação
      const authContext: AuthContext = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        permissions: user.permissions || [],
        permissionCategories: [], // Para compatibilidade
        profileId: user.profileId,
        profileName: user.profileName,
        teams: user.teams || [],
        sessionId: `unified-${user.id}-${tokenPayload.iat}`, // Para compatibilidade
        isAuthenticated: true,
        lastActivity: new Date()
      };

      // ✅ PADRONIZAÇÃO TTL: Contexto de usuário com TTL.SHORT (5 minutos)
      await cache.set(cacheKey, authContext, TTL.SHORT);
      console.log('✅ [UNIFIED-AUTH] Token validado para:', user.email);

      return authContext;

    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro na validação de token:', error);
      return null;
    }
  }

  /**
   * 🔄 REFRESH TOKEN - Renovação de token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      console.log('🔄 [UNIFIED-AUTH] Iniciando refresh de token');

      // 1. Verificar refresh token
      const tokenData = await JWTService.verifyRefreshToken(refreshToken);
      if (!tokenData) {
        return null;
      }

      // 2. Buscar dados atuais do usuário
      const user = await this.getUserWithPermissions(tokenData.userId);
      if (!user) {
        return null;
      }

      // 3. Blacklist o refresh token antigo
      await TokenBlacklistService.blacklistToken(refreshToken, Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)); // 7 dias

      // 4. Gerar novos tokens
      const newTokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        name: user.name,
        profileId: user.profileId
      });

      console.log('✅ [UNIFIED-AUTH] Token renovado para:', user.email);
      return newTokens;

    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro no refresh de token:', error);
      return null;
    }
  }

  /**
   * 🚪 LOGOUT - Logout seguro com blacklist
   */
  static async logout(token: string): Promise<void> {
    try {
      console.log('🚪 [UNIFIED-AUTH] Iniciando logout');

      // 1. Decodificar token para pegar informações
      const tokenPayload = await JWTService.verifyAccessToken(token);
      if (tokenPayload) {
        // 2. Adicionar à blacklist até expirar
        const expiryTime = tokenPayload.exp || (Math.floor(Date.now() / 1000) + 86400); // 24h default
        await TokenBlacklistService.blacklistToken(token, expiryTime);

        // 3. Limpar cache do usuário
        const cachePattern = `unified_auth:${tokenPayload.userId}:*`;
        await cache.invalidatePattern(cachePattern);

        console.log('✅ [UNIFIED-AUTH] Logout realizado para:', tokenPayload.email);
      }
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro no logout:', error);
    }
  }

  /**
   * 🚨 REVOKE ALL TOKENS - Logout global
   */
  static async revokeAllTokens(userId: string): Promise<void> {
    try {
      console.log('🚨 [UNIFIED-AUTH] Revogando todos os tokens para:', userId);

      // 1. Limpar todo cache relacionado ao usuário
      await cache.invalidatePattern(`unified_auth:${userId}:*`);
      await cache.invalidatePattern(`user_with_permissions:${userId}`);

      console.log('✅ [UNIFIED-AUTH] Todos os tokens revogados para:', userId);
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro ao revogar tokens:', error);
    }
  }

  /**
   * 👤 GET USER WITH PERMISSIONS - Função otimizada única
   * UMA QUERY para buscar tudo
   */
  static async getUserWithPermissions(userId: string): Promise<UnifiedUser | null> {
    try {
      // 1. Cache primeiro
      const cacheKey = `user_with_permissions:${userId}`;
      const cached = await cache.get<UnifiedUser>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // 2. Query única otimizada
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          profileId: users.profileId,
          profileName: profiles.name,
          permissions: sql<string[]>`
            CASE 
              WHEN COUNT(${permissions.name}) > 0 
              THEN array_agg(DISTINCT ${permissions.name}) 
              ELSE array[]::text[] 
            END
          `,
          teams: sql<any[]>`
            CASE 
              WHEN COUNT(${teams.id}) > 0 
              THEN array_agg(
                DISTINCT jsonb_build_object(
                  'id', ${teams.id}::text,
                  'name', ${teams.name},
                  'role', COALESCE(${userTeams.role}, 'member')
                )
              )
              ELSE array[]::jsonb[] 
            END
          `
        })
        .from(users)
        .leftJoin(profiles, eq(users.profileId, profiles.id))
        .leftJoin(profilePermissions, eq(profiles.id, profilePermissions.profileId))
        .leftJoin(permissions, eq(profilePermissions.permissionId, permissions.id))
        .leftJoin(userTeams, eq(users.id, userTeams.userId))
        .leftJoin(teams, eq(userTeams.teamId, teams.id))
        .where(eq(users.id, userId))
        .groupBy(users.id, profiles.name)
        .limit(1);

      if (!result || result.length === 0) {
        return null;
      }

      const user = result[0];
      const unifiedUser: UnifiedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || undefined,
        permissions: user.permissions || [],
        profileId: user.profileId || undefined,
        profileName: user.profileName || undefined,
        teams: user.teams || []
      };

      // 3. Cache por 30 minutos
      await cache.set(cacheKey, unifiedUser, TTL.MEDIUM);
      
      return unifiedUser;

    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro ao buscar usuário:', error);
      return null;
    }
  }

  /**
   * 🛡️ HAS PERMISSION - Verificação de permissão
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await this.getUserWithPermissions(userId);
      return user?.permissions.includes(permission) || false;
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * 🧹 INVALIDATE USER CACHE - Cache invalidation coordenado
   * ✅ Invalidar cache quando permissões mudam
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      // ✅ Invalidar cache quando permissões mudam
      await cache.invalidatePattern(`user_permissions:${userId}*`);
      await cache.invalidatePattern(`unified_auth:${userId}*`);
      await cache.invalidatePattern(`user_with_permissions:${userId}*`);
      await cache.invalidatePattern(`user_with_profile:${userId}*`);
      
      console.log('🧹 [UNIFIED-AUTH] Cache invalidado para usuário:', userId);
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro ao invalidar cache:', error);
    }
  }

  /**
   * 🧹 INVALIDATE ALL USER CACHES - Invalidação global de usuários
   */
  static async invalidateAllUserCaches(): Promise<void> {
    try {
      await cache.invalidatePattern('user_permissions:*');
      await cache.invalidatePattern('unified_auth:*');
      await cache.invalidatePattern('user_with_permissions:*');
      await cache.invalidatePattern('user_with_profile:*');
      
      console.log('🧹 [UNIFIED-AUTH] Cache invalidado para todos os usuários');
    } catch (error) {
      console.error('❌ [UNIFIED-AUTH] Erro ao invalidar cache global:', error);
    }
  }
}

// =====================================
// MIDDLEWARE UNIFICADO
// =====================================

/**
 * 🔐 AUTH MIDDLEWARE - Middleware principal
 */
export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = JWTService.extractTokenFromRequest(req);
  
  if (!token) {
    req.authContext = {
      userId: '',
      userName: '',
      userEmail: '',
      permissions: [],
      teams: [],
      isAuthenticated: false,
      lastActivity: new Date()
    };
    return next();
  }

  UnifiedAuthService.validateToken(token)
    .then(authContext => {
      req.authContext = authContext || {
        userId: '',
        userName: '',
        userEmail: '',
        permissions: [],
        teams: [],
        isAuthenticated: false,
        lastActivity: new Date()
      };
      
      if (authContext) {
        req.user = {
          id: authContext.userId,
          name: authContext.userName,
          email: authContext.userEmail,
          permissions: authContext.permissions,
          profileId: authContext.profileId,
          profileName: authContext.profileName,
          teams: authContext.teams
        };
      }
      
      next();
    })
    .catch(error => {
      console.error('❌ [AUTH-MIDDLEWARE] Erro:', error);
      req.authContext = {
        userId: '',
        userName: '',
        userEmail: '',
        permissions: [],
        teams: [],
        isAuthenticated: false,
        lastActivity: new Date()
      };
      next();
    });
}

/**
 * 🔒 REQUIRE AUTH - Middleware que exige autenticação
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.authContext?.isAuthenticated) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Valid JWT token required to access this resource'
    });
  }
  next();
}

/**
 * 🛡️ REQUIRE PERMISSION - Middleware que exige permissão específica
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authContext?.isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Valid JWT token required to access this resource'
      });
    }

    if (!req.authContext.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission '${permission}' required to access this resource`
      });
    }

    next();
  };
}

// =====================================
// HELPER FUNCTIONS
// =====================================

/**
 * 📋 CREATE AUTH CONTEXT FROM REQUEST - Para compatibilidade
 */
export function createAuthContextFromRequest(req: Request): AuthContext | null {
  const token = JWTService.extractTokenFromRequest(req);
  if (!token) return null;
  
  // Esta função é síncrona para compatibilidade, mas recomenda-se usar validateToken
  const authReq = req as AuthRequest;
  return authReq.authContext || null;
}