import type { Request, Response } from "express";
import { userService, hierarchyService } from "../services";
import { UnifiedAuthService, AuthRequest } from "../auth/unifiedAuth";

// Helper para criar AuthContext a partir da request
function createAuthContextFromRequest(req: any): any {
  const authContextJWT = req.authContext;
  if (authContextJWT) {
    return {
      userId: authContextJWT.userId,
      userName: authContextJWT.userName,
      userEmail: authContextJWT.userEmail,
      permissions: authContextJWT.permissions,
      permissionCategories: authContextJWT.permissionCategories,
      profileId: authContextJWT.profileId || '',
      profileName: authContextJWT.profileName,
      teams: authContextJWT.teams,
      sessionId: `jwt-${authContextJWT.userId}-${Date.now()}`,
      isAuthenticated: authContextJWT.isAuthenticated,
      lastActivity: authContextJWT.lastActivity
    };
  }
  
  // Fallback para session auth
  const userId = req.session?.user?.id || req.session?.userId;
  const user = req.user;
  const permissions = req.userPermissions || [];
  
  return {
    userId: userId,
    userName: user?.name || 'Unknown',
    userEmail: user?.email || '',
    permissions: permissions.map((p: any) => p.name),
    permissionCategories: Array.from(new Set(permissions.map((p: any) => p.category))),
    profileId: user?.profileId || '',
    profileName: 'User',
    teams: [],
    sessionId: req.session?.id || 'no-session',
    isAuthenticated: !!userId,
    lastActivity: new Date()
  };
}

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      const users = await userService.getUsers(authContext);
      res.json(users);
    } catch (error) {
      console.error('Error in GET /api/users:', error);
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      res.status(500).json({ message });
    }
  }

  static async getUser(req: Request, res: Response) {
    try {
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      const user = await userService.getUser(authContext, req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error('Error in GET /api/users/:id:', error);
      const message = error instanceof Error ? error.message : "Failed to fetch user";
      res.status(500).json({ message });
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      // Create a system auth context to fetch users
      const systemAuthContext = { 
        userId: 'system', 
        permissions: ['Listar Usuários'],
        userName: 'System',
        userEmail: 'system@system.com',
        permissionCategories: ['Users'],
        profileId: '',
        profileName: 'System',
        teams: [],
        sessionId: 'system-session',
        isAuthenticated: true,
        lastActivity: new Date()
      } as any;
      
      const result = await userService.getUsers(systemAuthContext);
      const currentUser = result[0];
      if (currentUser) {
        res.json(currentUser);
      } else {
        res.status(404).json({ message: "Current user not found" });
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  }

  static async createUser(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      // Verificar JWT
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const userId = authContext.userId;
      const userName = authContext.userName || 'Usuário desconhecido';
      
      console.log(`🔍 [CREATE-USER] Tentativa de criação de usuário por: ${userName} (ID: ${userId})`);
      console.log(`🔍 [CREATE-USER] Dados recebidos:`, {
        name: req.body.name,
        email: req.body.email,
        hasRole: !!req.body.role,
        hasTeams: !!req.body.teams
      });
      
      // Converter null para undefined para compatibilidade com schema
      const bodyData = { ...req.body };
      if (bodyData.role === null) bodyData.role = undefined;
      if (bodyData.profileId === null) bodyData.profileId = undefined;
      
      const newUser = await userService.createUser(authContext, bodyData);
      
      const endTime = Date.now();
      console.log(`✅ [CREATE-USER] Usuário criado com sucesso em ${endTime - startTime}ms:`, {
        newUserId: newUser.id,
        name: newUser.name,
        email: newUser.email
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ [CREATE-USER] Erro após ${endTime - startTime}ms:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('já existe')) {
          return res.status(409).json({ message: error.message });
        }
        if (error.message.includes('Permissão insuficiente')) {
          return res.status(403).json({ message: error.message });
        }
      }
      
      res.status(400).json({ message: "Dados de usuário inválidos" });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      // Verificar JWT
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      // Converter null para undefined para compatibilidade com schema
      const bodyData = { ...req.body };
      if (bodyData.role === null) bodyData.role = undefined;
      if (bodyData.profileId === null) bodyData.profileId = undefined;
      
      const updatedUser = await userService.updateUser(authContext, req.params.id, bodyData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  }

  static async patchUser(req: Request, res: Response) {
    try {
      // Verificar JWT
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      console.log(`🔍 [PATCH-USER] Usuário ${authContext.userName} (${authContext.userId}) atualizando usuário ${req.params.id}`);
      console.log(`🔍 [PATCH-USER] Dados para atualização:`, req.body);
      
      // Verificar se está tentando atualizar outro usuário
      if (req.params.id !== authContext.userId && !authContext.permissions.includes('Editar Usuários')) {
        console.log(`❌ [PATCH-USER] Tentativa de editar outro usuário sem permissão`);
        return res.status(403).json({ 
          message: "Você não tem permissão para editar outros usuários" 
        });
      }
      
      // Converter null para undefined para compatibilidade com schema
      const bodyData = { ...req.body };
      if (bodyData.role === null) bodyData.role = undefined;
      if (bodyData.profileId === null) bodyData.profileId = undefined;
      
      console.log(`🔍 [PATCH-USER] Dados processados:`, bodyData);
      
      const updatedUser = await userService.updateUser(authContext, req.params.id, bodyData);
      
      console.log(`✅ [PATCH-USER] Usuário atualizado com sucesso:`, {
        updatedUserId: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("❌ [PATCH-USER] Erro:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        if (error.message.includes("Permissão insuficiente")) {
          return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("já existe")) {
          return res.status(409).json({ message: error.message });
        }
      }
      
      res.status(400).json({ message: "Dados de usuário inválidos" });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      // Verificar JWT
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      console.log(`🔍 [DELETE-USER] Usuário ${authContext.userName} (${authContext.userId}) deletando usuário ${req.params.id}`);
      
      await userService.deleteUser(authContext, req.params.id);
      
      console.log(`✅ [DELETE-USER] Usuário ${req.params.id} deletado com sucesso`);
      res.status(204).send();
    } catch (error) {
      console.error("❌ [DELETE-USER] Erro:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        if (error.message.includes("Permissão insuficiente")) {
          return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("não pode deletar a si mesmo")) {
          return res.status(400).json({ message: error.message });
        }
      }
      
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  static async getUserPermissions(req: Request, res: Response) {
    try {
      // 🔐 VERIFICAR SE O USUÁRIO PODE ACESSAR SUAS PRÓPRIAS PERMISSÕES
      const requestingUserId = req.session?.user?.id;
      const targetUserId = req.params.userId;
      
      if (requestingUserId !== targetUserId) {
        return res.status(403).json({ error: "Access denied to other user's permissions" });
      }
      
      const authContextTemp = { userId: targetUserId, permissions: ['Visualizar Usuários'] } as any;
      const userWithDetails = await userService.getUser(authContextTemp, targetUserId);
      const permissionsArray = userWithDetails?.permissions || [];
      console.log(`🔍 [DEBUG] Permissões raw do userService:`, permissionsArray);
      
      // 🔧 Permissões já estão como string[] do userService
      const responseData = {
        userId: targetUserId,
        permissions: permissionsArray,
        permissionCount: permissionsArray.length
      };
      
      console.log(`🔍 [DEBUG] Response final:`, responseData);
      res.json(responseData);
    } catch (error) {
      console.error('❌ [USER-PERMISSIONS] Erro:', error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      // Verificar JWT
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }

      const result = await userService.changePassword(authContext, req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error changing password:", error);
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return res.status(404).json({ message: "User not found" });
        }
        if (error.message.includes("incorrect")) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        if (error.message.includes("permission")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  }

  static async getUserHierarchy(req: Request, res: Response) {
    try {
      // Verificar autenticação JWT manualmente
      const authContext = await UnifiedAuthService.validateToken(req.headers.authorization?.replace('Bearer ', '') || '');
      if (!authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const hierarchy = await hierarchyService.resolveUserHierarchy(authContext, req.params.userId);
      res.json(hierarchy);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve user hierarchy" });
    }
  }
}