import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { userService } from "../services";
import { UnifiedAuthService, LoginCredentials } from "../auth/unifiedAuth";

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const credentials: LoginCredentials = {
        email: req.body.email,
        password: req.body.password
      };

      if (!credentials.email || !credentials.password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // 🚀 USAR UNIFIED AUTH SERVICE
      const authResult = await UnifiedAuthService.authenticate(credentials);

      if (!authResult.success) {
        return res.status(401).json({ message: authResult.message });
      }

      console.log('✅ [UNIFIED-LOGIN] Login bem-sucedido:', {
        userId: authResult.user?.id,
        userName: authResult.user?.name
      });

      // Retornar resultado unificado
      res.json({
        user: {
          id: authResult.user?.id,
          name: authResult.user?.name,
          email: authResult.user?.email,
          avatar: authResult.user?.avatar,
          profileId: authResult.user?.profileId,
          permissions: authResult.user?.permissions,
          teams: authResult.user?.teams
        },
        tokens: {
          accessToken: authResult.tokens?.accessToken,
          refreshToken: authResult.tokens?.refreshToken,
          expiresIn: authResult.tokens?.expiresIn
        },
        isAuthenticated: true,
        requiresPasswordChange: false
      });
      
    } catch (error) {
      console.error('❌ [LOGIN-JWT] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  static async changeFirstPassword(req: Request, res: Response) {
    try {
      const { email, currentPassword, newPassword } = req.body;
      
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Email, senha atual e nova senha são obrigatórios" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      // Buscar usuário
      const authContextTemp = { userId: 'system', permissions: ['Listar Usuários'] } as any;
      const users = await userService.getUsers(authContextTemp);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar se é realmente o primeiro login
      if (!user.firstLogin) {
        return res.status(400).json({ message: "Este usuário já alterou sua senha inicial" });
      }

      // Verificar senha atual
      if (user.password) {
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Senha atual incorreta" });
        }
      }

      // Atualizar senha e marcar firstLogin como false
      const { storage } = await import('../storage');
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, {
        password: hashedNewPassword,
        firstLogin: false
      });

      console.log(`🔐 [FIRST-LOGIN] Senha alterada com sucesso para ${user.email}`);

      res.json({
        success: true,
        message: "Senha alterada com sucesso! Você pode fazer login normalmente agora."
      });
      
    } catch (error) {
      console.error('❌ [FIRST-LOGIN] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  static async devLogin(req: Request, res: Response) {
    try {
      console.log('🔧 [DEV-LOGIN] Endpoint de desenvolvimento acessado');
      
      // Buscar o primeiro usuário disponível
      const authContextTemp = { userId: 'system', permissions: ['Listar Usuários'] } as any;
      const users = await userService.getUsers(authContextTemp);
      
      if (!users || users.length === 0) {
        return res.status(404).json({ 
          message: "Nenhum usuário encontrado no sistema",
          debug: "Certifique-se de que há usuários cadastrados"
        });
      }

      const user = users[0]; // Primeiro usuário disponível
      console.log('🔧 [DEV-LOGIN] Fazendo login automático com:', user.email);

      // 🚀 GERAR TOKENS JWT
      const { JWTService } = await import('../services/jwtService');
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        name: user.name,
        profileId: user.profileId ?? undefined
      });

      console.log('✅ [DEV-LOGIN] Login automático bem-sucedido:', {
        userId: user.id,
        userName: user.name
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          profileId: user.profileId,
          firstLogin: user.firstLogin
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        },
        isAuthenticated: true,
        requiresPasswordChange: false
      });
      
    } catch (error) {
      console.error('❌ [DEV-LOGIN] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  static async currentUser(req: Request, res: Response) {
    try {
      const { UnifiedAuthService } = await import('../auth/unifiedAuth');
      
      // ✅ USAR APENAS JWT - REMOVER FALLBACK PARA SESSÃO
      const { JWTService } = await import('../services/jwtService');
      const token = JWTService.extractTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }

      const tokenPayload = await JWTService.verifyAccessToken(token);
      if (!tokenPayload) {
        return res.status(401).json({ 
          error: 'Invalid token',
          message: 'Token is invalid, expired, or blacklisted'
        });
      }
      
      const user = await UnifiedAuthService.getUserWithPermissions(tokenPayload.userId);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'User account no longer exists'
        });
      }

      console.log('✅ [CURRENT-USER-JWT] Usuário autenticado via JWT:', user.id);
      
      // ✅ RETORNAR PERMISSÕES ESTRUTURADAS
      res.json({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        profileId: user.profileId,
        profileName: user.profileName,
        avatar: user.avatar || user.email, // Avatar ou email como fallback
        permissions: user.permissions || [], // Array de strings das permissões
        permissionObjects: [], // Para compatibilidade, mas não necessário
        teams: user.teams || [],
        isAuthenticated: true
      });
      
    } catch (error) {
      console.error('❌ [CURRENT-USER-JWT] Erro:', error);
      res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Token validation failed'
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(400).json({ message: "Token não fornecido" });
      }

      const token = authHeader.substring(7);
      const { JWTService } = await import('../services/jwtService');
      
      // Invalidar o token
      await JWTService.blacklistToken(token);
      
      console.log('✅ [LOGOUT-JWT] Token invalidado com sucesso');
      
      res.json({
        success: true,
        message: "Logout realizado com sucesso"
      });
      
    } catch (error) {
      console.error('❌ [LOGOUT-JWT] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token é obrigatório" });
      }

      const { JWTService } = await import('../services/jwtService');
      // Precisa de uma função de getUserData para o refreshAccessToken
      // Por enquanto, usar UnifiedAuthService que tem método próprio
      const { UnifiedAuthService } = await import('../auth/unifiedAuth');
      const newTokens = await UnifiedAuthService.refreshToken(refreshToken);
      
      console.log('✅ [REFRESH-TOKEN-JWT] Tokens renovados com sucesso');
      
      res.json({
        tokens: newTokens,
        success: true
      });
      
    } catch (error) {
      console.error('❌ [REFRESH-TOKEN-JWT] Erro:', error);
      res.status(401).json({ message: "Refresh token inválido ou expirado" });
    }
  }
}