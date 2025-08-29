import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { userService } from "../services";

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user by email através do UserService
      const authContextTemp = { userId: 'system', permissions: ['Listar Usuários'] } as any;
      const users = await userService.getUsers(authContextTemp);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      console.log(`🔍 [LOGIN-DEBUG] Tentativa de login para: ${email}`);
      console.log(`🔍 [LOGIN-DEBUG] Usuário encontrado:`, user ? 'SIM' : 'NÃO');
      
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      console.log(`🔍 [LOGIN-DEBUG] Dados do usuário:`, {
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: !!user.password,
        firstLogin: user.firstLogin
      });

      // Check password
      if (user.password) {
        console.log(`🔍 [LOGIN-DEBUG] Comparando senhas...`);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`🔍 [LOGIN-DEBUG] Senha válida:`, isPasswordValid);
        
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Email ou senha incorretos" });
        }
      } else {
        console.log(`🔍 [LOGIN-DEBUG] Usuário sem senha cadastrada`);
      }
      
      // 🚀 GERAR TOKENS JWT
      const { JWTService } = await import('../services/jwtService');
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        name: user.name,
        profileId: user.profileId ?? undefined
      });

      console.log('✅ [LOGIN-JWT] Login bem-sucedido:', {
        userId: user.id,
        userName: user.name,
        tokenGenerated: true
      });

      // Retornar tokens e dados do usuário
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
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
        requiresPasswordChange: user.firstLogin || false
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
          role: user.role,
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
        requiresPasswordChange: user.firstLogin || false
      });
      
    } catch (error) {
      console.error('❌ [DEV-LOGIN] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  static async currentUser(req: Request, res: Response) {
    try {
      const { AuthServiceJWT } = await import('../microservices/authServiceJWT');
      const authContext = await AuthServiceJWT.getCurrentUserContext(req);
      
      if (!authContext?.isAuthenticated || !authContext.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log('✅ [CURRENT-USER-JWT] Usuário autenticado via JWT:', authContext.userId);
      
      res.json({
        userId: authContext.userId,
        userName: authContext.userName,
        userEmail: authContext.userEmail,
        profileId: authContext.profileId,
        profileName: authContext.profileName,
        avatar: authContext.userEmail, // Usando email como avatar temporário
        permissions: authContext.permissions,
        teams: authContext.teams || []
      });
      
    } catch (error) {
      console.error('❌ [CURRENT-USER-JWT] Erro:', error);
      res.status(401).json({ message: "Token inválido ou expirado" });
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
      await JWTService.invalidateToken(token);
      
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
      const newTokens = await JWTService.refreshTokens(refreshToken);
      
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