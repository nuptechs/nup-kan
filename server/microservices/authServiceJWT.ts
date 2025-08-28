/**
 * 🔐 AUTH SERVICE JWT - Autenticação com JSON Web Tokens
 * 
 * RESPONSABILIDADES:
 * - Autenticação via JWT tokens
 * - Autorização baseada em permissões
 * - Verificação de tokens de acesso
 * - Refresh de tokens expirados
 * 
 * PERFORMANCE TARGET: < 5ms para verificações JWT
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../services/jwtService';
import { QueryHandlers } from '../cqrs/queries';
import { cache, TTL } from '../cache';
import { storage } from '../storage';

export interface AuthContextJWT {
  userId: string;
  userName: string;
  userEmail: string;
  permissions: string[];
  permissionCategories: string[];
  profileId?: string;
  profileName: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  isAuthenticated: boolean;
  lastActivity: Date;
  tokenPayload: JWTPayload;
}

/**
 * 🚀 AUTH SERVICE JWT - Microserviço de Autenticação JWT
 */
export class AuthServiceJWT {
  
  /**
   * Verificar autenticação via JWT
   */
  static async verifyAuth(req: Request): Promise<AuthContextJWT | null> {
    try {
      // Extrair token do header Authorization
      const token = JWTService.extractTokenFromRequest(req);
      
      if (!token) {
        return null;
      }

      // Verificar e decodificar token
      const tokenPayload = await JWTService.verifyAccessToken(token);
      
      if (!tokenPayload) {
        return null;
      }

      // Cache baseado no token payload
      const cacheKey = `auth_context_jwt:${tokenPayload.userId}:${tokenPayload.iat}`;
      const cached = await cache.get<AuthContextJWT>(cacheKey);
      
      if (cached && cached.userId === tokenPayload.userId) {
        return cached;
      }

      // Buscar dados completos do usuário
      const userData = await QueryHandlers.getUserWithPermissions(tokenPayload.userId) as any;
      
      if (!userData) {
        return null;
      }

      const authContext: AuthContextJWT = {
        userId: userData.id,
        userName: userData.name,
        userEmail: userData.email,
        permissions: userData.permissions || [],
        permissionCategories: userData.permissionCategories || [],
        profileId: userData.profileId,
        profileName: userData.profileName || 'Usuário',
        teams: userData.teams || [],
        isAuthenticated: true,
        lastActivity: new Date(),
        tokenPayload
      };

      // Cache por 5 minutos
      await cache.set(cacheKey, authContext, TTL.SHORT);
      return authContext;

    } catch (error) {
      console.error('🔐 [AUTH-JWT] Erro verificando autenticação:', error);
      return null;
    }
  }

  /**
   * Verificar se usuário tem permissão específica
   */
  static async hasPermission(req: Request, permission: string): Promise<boolean> {
    const authContext = await this.verifyAuth(req);
    
    if (!authContext) {
      return false;
    }

    return authContext.permissions.includes(permission);
  }

  /**
   * Verificar se usuário tem qualquer uma das permissões
   */
  static async hasAnyPermission(req: Request, permissions: string[]): Promise<boolean> {
    const authContext = await this.verifyAuth(req);
    
    if (!authContext) {
      return false;
    }

    return permissions.some(permission => authContext.permissions.includes(permission));
  }
}

/**
 * 🛡️ MIDDLEWARE JWT - Middlewares de autenticação e autorização
 */
export class AuthMiddlewareJWT {
  
  /**
   * Middleware que requer autenticação JWT
   */
  static requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authContext = await AuthServiceJWT.verifyAuth(req);
      
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }

      // Adicionar contexto ao request
      (req as any).authContext = authContext;
      (req as any).user = {
        id: authContext.userId,
        name: authContext.userName,
        email: authContext.userEmail
      };
      
      next();
    } catch (error) {
      console.error('❌ [AUTH-JWT-MIDDLEWARE] Erro no middleware de auth:', error);
      res.status(500).json({ 
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
  };

  /**
   * Middleware que requer permissões específicas
   */
  static requirePermissions = (...permissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authContext = (req as any).authContext as AuthContextJWT;
        
        if (!authContext) {
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'You must be authenticated to access this resource'
          });
        }

        const hasPermission = permissions.some(permission => 
          authContext.permissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            message: `You need one of the following permissions: ${permissions.join(', ')}`,
            required: permissions,
            userPermissions: authContext.permissions
          });
        }

        next();
      } catch (error) {
        console.error('❌ [AUTH-JWT-MIDDLEWARE] Erro no middleware de permissões:', error);
        res.status(500).json({ 
          error: 'Permission check error',
          message: 'Internal server error during permission verification'
        });
      }
    };
  };

  /**
   * Middleware que adiciona contexto de auth se disponível (opcional)
   */
  static optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authContext = await AuthServiceJWT.verifyAuth(req);
      
      if (authContext) {
        (req as any).authContext = authContext;
        (req as any).user = {
          id: authContext.userId,
          name: authContext.userName,
          email: authContext.userEmail
        };
      }

      next();
    } catch (error) {
      // Em middleware opcional, não bloquear em caso de erro
      console.warn('⚠️ [AUTH-JWT-MIDDLEWARE] Erro no middleware opcional:', error);
      next();
    }
  };
}