/**
 * 🔐 AUTH MICROSERVICE - Autenticação Ultra-Rápida
 * 
 * RESPONSABILIDADES:
 * - Autenticação e autorização de usuários
 * - Gerenciamento de sessões
 * - Verificação de permissões em tempo real
 * - Cache inteligente de dados de autenticação
 * 
 * PERFORMANCE TARGET: < 10ms para verificações de auth
 */

import { QueryHandlers } from '../cqrs/queries';
import { cache, TTL } from '../cache';
import { Request, Response, NextFunction } from 'express';

export interface AuthContext {
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
}

/**
 * 🚀 AUTH SERVICE - Microserviço de Autenticação
 */
export class AuthService {
  
  // 🔐 Verificar autenticação (ultra-rápido)
  static async verifyAuth(req: Request): Promise<AuthContext | null> {
    console.log('🔐 [AUTH-SERVICE] Verificando autenticação');
    const startTime = Date.now();

    try {
      // Buscar userId da sessão/token (COMPATIBILIDADE TOTAL - ANTIGO E NOVO)
      const userId = req.session?.user?.id || req.session?.userId || req.headers['x-user-id'] as string;
      
      if (!userId) {
        console.log('❌ [AUTH-SERVICE] Usuário não autenticado');
        return null;
      }

      // 🚀 CACHE ULTRA-RÁPIDO: Contexto de autenticação
      const cacheKey = `auth_context:${userId}`;
      const cached = await cache.get<AuthContext>(cacheKey);
      
      if (cached && cached.isAuthenticated) {
        // Atualizar última atividade
        cached.lastActivity = new Date();
        await cache.set(cacheKey, cached, TTL.SHORT); // Renovar cache
        
        const duration = Date.now() - startTime;
        console.log(`🚀 [AUTH-SERVICE] Auth verificado em ${duration}ms (Cache Hit)`);
        return cached;
      }

      // 🔍 CACHE MISS: Buscar dados completos do usuário
      console.log('🔍 [AUTH-SERVICE] Cache miss, buscando dados do usuário');
      const userData = await QueryHandlers.getUserWithPermissions(userId) as any;
      
      if (!userData) {
        console.log('❌ [AUTH-SERVICE] Usuário não encontrado');
        return null;
      }

      // Criar contexto de autenticação
      const authContext: AuthContext = {
        userId: userData.id,
        userName: userData.name,
        userEmail: userData.email,
        permissions: userData.permissions || [],
        permissionCategories: userData.permissionCategories || [],
        profileId: userData.profileId,
        profileName: userData.profileName || 'Usuário',
        teams: userData.teams || [],
        sessionId: (req as any).sessionID || 'no-session',
        isAuthenticated: true,
        lastActivity: new Date(),
      };

      // 🚀 CACHEAR contexto por 5 minutos
      await cache.set(cacheKey, authContext, TTL.MEDIUM);

      const duration = Date.now() - startTime;
      console.log(`✅ [AUTH-SERVICE] Auth verificado em ${duration}ms (Dados completos)`);
      return authContext;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH-SERVICE] Erro verificando auth em ${duration}ms:`, error);
      return null;
    }
  }

  // 🛡️ Verificar permissões específicas (nano-segundos)
  static async hasPermission(authContext: AuthContext, requiredPermissions: string | string[]): Promise<boolean> {
    if (!authContext.isAuthenticated) {
      return false;
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // Verificação ultra-rápida em memória
    const hasAllPermissions = permissions.every(permission => 
      authContext.permissions.includes(permission)
    );

    console.log(`🛡️ [AUTH-SERVICE] Permissão ${permissions.join(', ')}: ${hasAllPermissions ? '✅' : '❌'}`);
    return hasAllPermissions;
  }

  // 👥 Verificar acesso a team
  static async hasTeamAccess(authContext: AuthContext, teamId: string, requiredRole?: string): Promise<boolean> {
    if (!authContext.isAuthenticated) {
      return false;
    }

    const teamAccess = authContext.teams.find(team => team.id === teamId);
    
    if (!teamAccess) {
      console.log(`❌ [AUTH-SERVICE] Sem acesso ao team ${teamId}`);
      return false;
    }

    if (requiredRole && teamAccess.role !== requiredRole) {
      console.log(`❌ [AUTH-SERVICE] Role insuficiente para team ${teamId}. Requerido: ${requiredRole}, Atual: ${teamAccess.role}`);
      return false;
    }

    console.log(`✅ [AUTH-SERVICE] Acesso autorizado ao team ${teamId}`);
    return true;
  }

  // 🔄 Invalidar cache de autenticação
  static async invalidateUserAuth(userId: string): Promise<void> {
    const cacheKey = `auth_context:${userId}`;
    await cache.del(cacheKey);
    console.log(`🔄 [AUTH-SERVICE] Cache de auth invalidado para usuário ${userId}`);
  }

  // 📊 Estatísticas do serviço
  static async getServiceMetrics(): Promise<any> {
    const cacheStats = await cache.getStats();
    
    return {
      service: 'auth',
      version: '3.0.0',
      performance: {
        avgAuthTime: '< 10ms',
        cacheHitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0,
      },
      features: {
        sessionManagement: true,
        permissionCaching: true,
        teamAuthorization: true,
        multiTenancy: true,
      },
      timestamp: new Date(),
    };
  }
}

/**
 * 🚀 MIDDLEWARE ULTRA-RÁPIDO - Express Integration
 */
export class AuthMiddleware {
  
  // 🔐 Middleware: Require Authentication
  static requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authContext = await AuthService.verifyAuth(req);
      
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Adicionar contexto ao request
      (req as any).authContext = authContext;
      next();
    } catch (error) {
      console.error('❌ [AUTH-MIDDLEWARE] Erro no middleware de auth:', error);
      res.status(500).json({ 
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
  };

  // 🛡️ Middleware: Require Permissions
  static requirePermissions = (permissions: string | string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authContext = (req as any).authContext as AuthContext;
        
        if (!authContext) {
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'You must be logged in first'
          });
        }

        const hasPermission = await AuthService.hasPermission(authContext, permissions);
        
        if (!hasPermission) {
          const permissionList = Array.isArray(permissions) ? permissions : [permissions];
          return res.status(403).json({ 
            error: 'Permission denied',
            message: `You don't have the required permissions: ${permissionList.join(', ')}`,
            requiredPermissions: permissionList,
            userPermissions: authContext.permissions
          });
        }

        next();
      } catch (error) {
        console.error('❌ [AUTH-MIDDLEWARE] Erro no middleware de permissões:', error);
        res.status(500).json({ 
          error: 'Permission check error',
          message: 'Internal server error during permission verification'
        });
      }
    };
  };

  // 👥 Middleware: Require Team Access
  static requireTeamAccess = (teamIdParam: string, requiredRole?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authContext = (req as any).authContext as AuthContext;
        
        if (!authContext) {
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'You must be logged in first'
          });
        }

        const teamId = req.params[teamIdParam] || req.body[teamIdParam];
        
        if (!teamId) {
          return res.status(400).json({ 
            error: 'Team ID required',
            message: `Team ID parameter '${teamIdParam}' is required`
          });
        }

        const hasAccess = await AuthService.hasTeamAccess(authContext, teamId, requiredRole);
        
        if (!hasAccess) {
          return res.status(403).json({ 
            error: 'Team access denied',
            message: `You don't have access to team ${teamId}` + (requiredRole ? ` with role ${requiredRole}` : ''),
            teamId,
            requiredRole,
            userTeams: authContext.teams
          });
        }

        next();
      } catch (error) {
        console.error('❌ [AUTH-MIDDLEWARE] Erro no middleware de team:', error);
        res.status(500).json({ 
          error: 'Team access check error',
          message: 'Internal server error during team access verification'
        });
      }
    };
  };
}