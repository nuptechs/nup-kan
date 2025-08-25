import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { User, Permission } from "@shared/schema";

interface AuthenticatedRequest extends Request {
  user?: User;
  userPermissions?: Permission[];
}

/**
 * Middleware de autenticação - verifica se o usuário está logado
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Verificar se existe session ou token de autenticação
    // Por enquanto, vamos usar uma implementação simples baseada em session
    const userId = req.session?.user?.id;
    
    if (!userId) {
      console.warn(`🔐 [AUTH] Tentativa de acesso não autenticado na rota ${req.method} ${req.path} de IP: ${req.ip}`);
      return res.status(401).json({ 
        message: "Not authenticated",
        code: "AUTH_REQUIRED"
      });
    }

    // Buscar usuário no banco
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid user session",
        code: "INVALID_SESSION"
      });
    }

    // Buscar permissões do usuário
    const userPermissions = await storage.getUserPermissions(userId);
    
    // Adicionar user e permissões ao request
    req.user = user;
    req.userPermissions = userPermissions;
    
    next();
  } catch (error) {
    console.error("❌ [AUTH] Erro na autenticação:", error);
    return res.status(500).json({ 
      message: "Authentication error",
      code: "AUTH_ERROR"
    });
  }
}

/**
 * Middleware de autorização - verifica se o usuário tem permissões específicas
 */
export function requirePermissions(requiredPermissions: string | string[], options: {
  requireAll?: boolean;
  category?: string;
  fallbackMessage?: string;
} = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const userPermissions = req.userPermissions || [];

      if (!user) {
        return res.status(401).json({ 
          message: "User not authenticated",
          code: "AUTH_REQUIRED"
        });
      }

      // Converter permissões para map para busca mais eficiente
      const permissionMap = new Map<string, Permission>();
      userPermissions.forEach(permission => {
        permissionMap.set(permission.name, permission);
        permissionMap.set(`${permission.category}:${permission.name}`, permission);
      });

      let hasAccess = false;

      // Verificar por categoria
      if (options.category) {
        hasAccess = userPermissions.some(p => p.category === options.category);
      }
      // Verificar permissões específicas
      else if (typeof requiredPermissions === 'string') {
        hasAccess = permissionMap.has(requiredPermissions);
      }
      // Verificar múltiplas permissões
      else if (Array.isArray(requiredPermissions)) {
        if (options.requireAll) {
          hasAccess = requiredPermissions.every(perm => permissionMap.has(perm));
        } else {
          hasAccess = requiredPermissions.some(perm => permissionMap.has(perm));
        }
      }

      if (!hasAccess) {
        // Log da tentativa de acesso negado para auditoria
        console.warn(`🚫 [SECURITY] Acesso negado para usuário ${user.name} (${user.id}) na rota ${req.method} ${req.path}. Permissões requeridas: ${JSON.stringify(requiredPermissions)}`);
        
        return res.status(403).json({ 
          message: options.fallbackMessage || "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
          required: requiredPermissions,
          userPermissions: userPermissions.map(p => p.name)
        });
      }

      next();
    } catch (error) {
      console.error("❌ [AUTH] Erro na autorização:", error);
      return res.status(500).json({ 
        message: "Authorization error",
        code: "AUTH_ERROR"
      });
    }
  };
}

/**
 * Middleware para verificar se o usuário é administrador
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        message: "User not authenticated",
        code: "AUTH_REQUIRED"
      });
    }

    // Verificar se o usuário tem perfil de administrador
    const profile = await storage.getProfile(user.profileId);
    const isAdmin = profile?.name.toLowerCase().includes('admin') || 
                   profile?.name.toLowerCase().includes('administrador') ||
                   user.role?.toLowerCase().includes('admin') ||
                   user.role?.toLowerCase().includes('dono');

    if (!isAdmin) {
      console.warn(`🚫 [SECURITY] Tentativa de acesso admin negado para usuário ${user.name} (${user.id}) na rota ${req.method} ${req.path}`);
      
      return res.status(403).json({ 
        message: "Administrator access required",
        code: "ADMIN_REQUIRED"
      });
    }

    next();
  } catch (error) {
    console.error("❌ [AUTH] Erro na verificação de admin:", error);
    return res.status(500).json({ 
      message: "Authorization error",
      code: "AUTH_ERROR"
    });
  }
}

/**
 * Middleware opcional de autenticação - não falha se não autenticado
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.user?.id;
    
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        const userPermissions = await storage.getUserPermissions(userId);
        req.user = user;
        req.userPermissions = userPermissions;
      }
    }
    
    next();
  } catch (error) {
    // Não falha, apenas continua sem autenticação
    console.warn("⚠️ [AUTH] Erro na autenticação opcional:", error);
    next();
  }
}

export type { AuthenticatedRequest };