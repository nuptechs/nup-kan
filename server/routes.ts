import type { Express } from "express";
import { createServer, type Server } from "http";
// import { getPermissionsData, invalidatePermissionsCache } from './permissions-data'; // REMOVIDO: API consolidada
import bcrypt from "bcryptjs";
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from "./storage"; // TODO: Será removido - apenas DAO
import { db } from "./db";
import { insertBoardSchema, updateBoardSchema, insertTaskSchema, updateTaskSchema, insertColumnSchema, updateColumnSchema, insertTagSchema, insertTeamSchema, updateTeamSchema, insertUserSchema, updateUserSchema, insertProfileSchema, updateProfileSchema, insertPermissionSchema, insertProfilePermissionSchema, insertTeamProfileSchema, insertBoardShareSchema, updateBoardShareSchema, insertTaskStatusSchema, updateTaskStatusSchema, insertTaskPrioritySchema, updateTaskPrioritySchema, insertTaskAssigneeSchema, insertCustomFieldSchema, updateCustomFieldSchema, insertTaskCustomValueSchema, updateTaskCustomValueSchema, customFields, taskCustomValues, insertNotificationSchema, updateNotificationSchema } from "@shared/schema";

// 🏗️ SERVICES - Camada única oficial de persistência
import { boardService, taskService, userService, teamService, notificationService, columnService, tagService, profileService, permissionService, boardShareService, taskStatusService, userTeamService, taskEventService, exportService, teamProfileService, assigneeService, hierarchyService } from "./services";
import { eq, sql, and } from "drizzle-orm";
import { sendWelcomeEmail, sendNotificationEmail } from "./emailService";
import { PermissionSyncService } from "./permissionSync";
// Sistema de auth antigo removido - usando apenas o novo AuthMiddleware
import { OptimizedQueries, PerformanceStats } from "./optimizedQueries";
import { cache } from "./cache";

// 🚀 MICROSERVIÇOS IMPORTADOS
import { APIGateway } from './microservices/apiGateway';
import { AuthMiddleware, AuthService } from './microservices/authService';
import { AuthServiceJWT, AuthMiddlewareJWT } from './microservices/authServiceJWT';
import { BoardService } from './microservices/boardService'; // Legacy - será removido
import { mongoStore } from './mongodb';
import { QueryHandlers } from './cqrs/queries';

// Helper para criar AuthContext a partir da request
function createAuthContextFromRequest(req: any): any {
  // JWT Auth: usar dados do authContext configurado pelo middleware JWT
  const authContextJWT = req.authContext;
  if (authContextJWT) {
    // Converter AuthContextJWT para AuthContext adicionando sessionId
    return {
      userId: authContextJWT.userId,
      userName: authContextJWT.userName,
      userEmail: authContextJWT.userEmail,
      permissions: authContextJWT.permissions,
      permissionCategories: authContextJWT.permissionCategories,
      profileId: authContextJWT.profileId || '',
      profileName: authContextJWT.profileName,
      teams: authContextJWT.teams,
      sessionId: `jwt-${authContextJWT.userId}-${Date.now()}`, // Fake sessionId for JWT
      isAuthenticated: authContextJWT.isAuthenticated,
      lastActivity: authContextJWT.lastActivity
    };
  }
  
  // Fallback para session auth (compatibilidade)
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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user by email através do UserService
      const authContextTemp = { userId: 'system', permissions: ['Listar Users'] } as any;
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
      const { JWTService } = await import('./services/jwtService');
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
          firstLogin: user.firstLogin // Incluir flag de primeiro login
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        },
        isAuthenticated: true,
        requiresPasswordChange: user.firstLogin || false // Indicar se precisa trocar senha
      });
      
    } catch (error) {
      console.error('❌ [LOGIN-JWT] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para troca de senha no primeiro login
  app.post("/api/auth/change-first-password", async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Email, senha atual e nova senha são obrigatórios" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      // Buscar usuário
      const authContextTemp = { userId: 'system', permissions: ['Listar Users'] } as any;
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
      console.error('❌ [CHANGE-FIRST-PASSWORD] Erro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Auth routes
  
  // 🆘 ENDPOINT EMERGENCIAL: Auto-login para desenvolvimento (TEMPORÁRIO)
  app.post("/api/auth/dev-login", async (req, res) => {
    try {
      const authContextTemp = { userId: 'system', permissions: ['Listar Users'] } as any;
      const users = await userService.getUsers(authContextTemp);
      const firstUser = users[0];
      
      if (!firstUser) {
        return res.status(404).json({ error: "Nenhum usuário encontrado" });
      }
      
      // Criar sessão de emergência
      req.session.user = {
        id: firstUser.id,
        name: firstUser.name,
        email: firstUser.email
      };
      
      res.json({
        id: firstUser.id,
        name: firstUser.name,
        email: firstUser.email,
        role: firstUser.role,
        avatar: firstUser.avatar,
        profileId: firstUser.profileId,
        message: "Login emergencial realizado com sucesso"
      });
    } catch (error) {
      console.error("❌ [DEV] Erro no auto-login:", error);
      res.status(500).json({ error: "Erro no auto-login" });
    }
  });
  
  // 🚀 Auth routes - JWT IMPLEMENTATION
  app.get("/api/auth/current-user", async (req, res) => {
    try {
      // 🔧 TENTAR AUTENTICAÇÃO JWT PRIMEIRO
      const { AuthServiceJWT } = await import('./microservices/authServiceJWT');
      const authJWT = await AuthServiceJWT.verifyAuth(req);
      
      if (authJWT && authJWT.isAuthenticated) {
        console.log('✅ [CURRENT-USER-JWT] Usuário autenticado via JWT:', authJWT.userId);
        return res.json({
          userId: authJWT.userId,
          userName: authJWT.userName,
          userEmail: authJWT.userEmail,
          profileId: authJWT.profileId,
          profileName: authJWT.profileName,
          avatar: authJWT.tokenPayload.email, // Placeholder
          permissions: authJWT.permissions,
          isAuthenticated: true,
          lastActivity: authJWT.lastActivity,
          authMethod: 'jwt'
        });
      }

      // 🔧 FALLBACK: Tentar autenticação por sessão (compatibilidade)
      const authSession = await AuthService.verifyAuth(req);
      if (authSession && authSession.isAuthenticated) {
        console.log('✅ [CURRENT-USER-SESSION] Usuário autenticado via sessão:', authSession.userId);
        return res.json({
          ...authSession,
          authMethod: 'session'
        });
      }
      
      console.log('🔍 [CURRENT-USER] Usuário não autenticado');
      return res.status(401).json({ error: "Not authenticated" });
      
    } catch (error) {
      console.error("❌ [CURRENT-USER] Erro:", error);
      res.status(401).json({ error: "Not authenticated" });
    }
  });
  
  app.get("/api/users/:userId/permissions", AuthMiddlewareJWT.requireAuth, async (req, res) => {
      try {
        // 🔐 VERIFICAR SE O USUÁRIO PODE ACESSAR SUAS PRÓPRIAS PERMISSÕES
        const requestingUserId = req.session?.user?.id;
        const targetUserId = req.params.userId;
        
        if (requestingUserId !== targetUserId) {
          return res.status(403).json({ error: "Access denied to other user's permissions" });
        }
        
        const authContextTemp = { userId: targetUserId, permissions: ['Visualizar Users'] } as any;
        const userWithDetails = await userService.getUser(authContextTemp, targetUserId);
        const permissionsArray = userWithDetails?.permissions || [];
        console.log(`🔍 [DEBUG] Permissões raw do userService:`, permissionsArray);
        
        // 🔧 Permissões já estão como string[] do userService
        const permissionsResponse = {
          permissions: Array.isArray(permissionsArray) ? permissionsArray : []
        };
        
        console.log(`🔍 [DEBUG] Permissões formatadas:`, permissionsResponse);
        res.json(permissionsResponse);
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ error: "Failed to fetch user permissions" });
      }
    }
  );
  
  // 📋 Board routes - SIMPLIFICADO (sem microserviços)
  app.get("/api/boards", AuthMiddlewareJWT.requireAuth, async (req, res) => {
      try {
        // Verificar JWT
        const authContext = await AuthServiceJWT.verifyAuth(req);
        if (!authContext) {
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Valid JWT token required to access this resource'
          });
        }
        
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        const boards = await boardService.getBoards(authContext, { page, limit });
        
        // Paginação simples
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedBoards = boards.slice(startIndex, endIndex);
        
        res.json({
          data: paginatedBoards,
          pagination: {
            page,
            limit,
            total: boards.length,
            pages: Math.ceil(boards.length / limit),
            hasNext: endIndex < boards.length,
            hasPrev: page > 1,
          }
        });
      } catch (error) {
        console.error("Error fetching boards:", error);
        res.status(500).json({ error: "Failed to fetch boards" });
      }
    }
  );
  
  app.post("/api/boards", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
      try {
        const authContext = createAuthContextFromRequest(req);
        const board = await boardService.createBoard(authContext, req.body);
        res.status(201).json(board);
      } catch (error) {
        console.error("Board creation error:", error);
        res.status(400).json({ error: "Failed to create board" });
      }
    }
  );
  
  app.get("/api/boards/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
      try {
        // Verificar JWT
        const authContext = await AuthServiceJWT.verifyAuth(req);
        if (!authContext) {
          return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Valid JWT token required to access this resource'
          });
        }
        
        const board = await boardService.getBoard(authContext, req.params.id);
        if (!board) {
          return res.status(404).json({ error: "Board not found" });
        }
        res.json(board);
      } catch (error) {
        console.error("Error fetching board:", error);
        res.status(500).json({ error: "Failed to fetch board" });
      }
    }
  );

  // Update and delete routes handled by other services

  // Toggle board active status
  app.patch("/api/boards/:id/toggle-status",
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Editar Boards"),
    async (req, res) => {
      try {
        const boardId = req.params.id;
        
        const authContext = createAuthContextFromRequest(req);
        const updatedBoard = await boardService.toggleBoardStatus(authContext, boardId);
        
        res.json(updatedBoard);
      } catch (error) {
        console.error("Error toggling board status:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  );
  
  // ✅ Task routes - SIMPLIFICADOS (sem microserviços complexos)
  // ROTAS REMOVIDAS - Usando apenas as versões simples abaixo
  
  // 📊 System routes - Monitoramento e métricas
  app.get("/api/system/health", async (req, res) => {
    try {
      const health = await APIGateway.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });
  
  app.get("/api/system/metrics",
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Visualizar Analytics"),
    async (req, res) => {
      try {
        const metrics = await APIGateway.getGatewayMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch metrics" });
      }
    }
  );

  // Legacy routes fallback

  // Task routes - Protegidas com permissões
  // ✅ RESTAURADA - Rota GET /api/tasks necessária para funcionalidades de export
  app.get("/api/tasks", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Listar Tarefas"),
    async (req, res) => {
    try {
      // Paginação opcional
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string);
      
      if (page && limit) {
        const validPage = Math.max(1, page);
        const validLimit = Math.min(100, Math.max(1, limit));
        const offset = (validPage - 1) * validLimit;
        
        // Buscar tasks paginadas através do TaskService
        const authContext = createAuthContextFromRequest(req);
        const allTasksDetails = await taskService.getAllTasks(authContext);
        const allTasks = allTasksDetails; // O TaskService já retorna tasks enriquecidas
        const tasks = allTasks.slice(offset, offset + validLimit);
        const total = allTasks.length;
        
        res.json({
          data: tasks,
          pagination: {
            page: validPage,
            limit: validLimit,
            total,
            pages: Math.ceil(total / validLimit),
            hasNext: validPage < Math.ceil(total / validLimit),
            hasPrev: validPage > 1
          }
        });
      } else {
        // Retornar todas as tasks (sem paginação)
        const authContext = createAuthContextFromRequest(req);
        const tasks = await taskService.getAllTasks(authContext);
        res.json(tasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // ❌ REMOVIDA - Rota duplicada GET /api/tasks/:id (agora usando TaskService Level 3)

  // ❌ REMOVIDA - Rota duplicada POST /api/tasks (agora usando TaskService Level 3)

  // ❌ REMOVIDA - Rota duplicada PATCH /api/tasks/:id (agora usando TaskService Level 3)

  // ❌ REMOVIDA - Rota duplicada DELETE /api/tasks/:id (agora usando TaskService Level 3)

  // 🚀 ENDPOINT DE PERFORMANCE STATISTICS
  app.get("/api/performance-stats", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Visualizar Analytics"), 
    async (req, res) => {
    try {
      const stats = PerformanceStats.getQueryStats();
      const cacheStats = await cache.getStats();
      
      res.json({
        queryPerformance: stats,
        cachePerformance: cacheStats,
        systemInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      res.status(500).json({ error: 'Failed to fetch performance stats' });
    }
  });

  // Task Assignee routes (deprecated - migrated to assigneeService)
  app.get("/api/tasks/:taskId/assignees", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Visualizar Tarefas"), 
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const assignees = await assigneeService.getTaskAssignees(authContext, req.params.taskId);
      res.json(assignees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task assignees" });
    }
  });

  app.post("/api/tasks/:taskId/assignees", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const assigneeData = insertTaskAssigneeSchema.parse({
        taskId: req.params.taskId,
        userId: req.body.userId,
      });
      const authContext = createAuthContextFromRequest(req);
      const assignee = await taskService.addTaskAssignee(authContext, req.params.taskId, req.body.userId);
      res.status(201).json(assignee);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignee data" });
    }
  });

  app.delete("/api/tasks/:taskId/assignees/:userId", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await taskService.removeTaskAssignee(authContext, req.params.taskId, req.params.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Assignee not found" });
      }
      res.status(500).json({ message: "Failed to remove assignee" });
    }
  });

  app.put("/api/tasks/:taskId/assignees", async (req, res) => {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: "userIds must be an array" });
      }
      const authContext = createAuthContextFromRequest(req);
      await taskService.setTaskAssignees(authContext, req.params.taskId, userIds);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to set task assignees" });
    }
  });

  // ❌ ROTAS DUPLICADAS REMOVIDAS - Usando apenas as versões originais acima

  app.patch("/api/boards/:id", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Editar Boards"), 
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedBoard = await boardService.updateBoard(authContext, req.params.id, req.body);
      
      res.json(updatedBoard);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(400).json({ message: "Invalid board data" });
    }
  });

  app.delete("/api/boards/:id", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Excluir Boards"), 
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await boardService.deleteBoard(authContext, req.params.id);
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // ✅ ROTAS DE TASKS SIMPLIFICADAS (PostgreSQL direto, sem CQRS)
  
  // Buscar tasks de um board
  app.get("/api/boards/:boardId/tasks", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Listar Tarefas"),
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const tasks = await taskService.getBoardTasks(authContext, req.params.boardId);
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching board tasks:", error);
      res.status(500).json({ message: "Failed to fetch board tasks" });
    }
  });

  // Criar nova task
  app.post("/api/tasks",
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Criar Tarefas"),
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const task = await taskService.createTask(authContext, req.body);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // ✅ Reorder tasks - DEVE VIR ANTES da rota /:id 
  app.patch("/api/tasks/reorder", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Editar Tarefas"), 
    async (req, res) => {
    console.log("🔍 [REORDER] Request received at /api/tasks/reorder");
    console.log("🔍 [REORDER] Method:", req.method);
    console.log("🔍 [REORDER] URL:", req.url);
    console.log("🔍 [REORDER] Body:", JSON.stringify(req.body, null, 2));
    
    try {
      const reorderedTasks = req.body.tasks;
      console.log("🔍 [REORDER] Extracted tasks:", reorderedTasks);
      
      // Validate that tasks array exists and is not empty
      if (!reorderedTasks || !Array.isArray(reorderedTasks) || reorderedTasks.length === 0) {
        console.log("❌ [REORDER] Invalid tasks array validation failed");
        return res.status(400).json({ message: "Invalid tasks array" });
      }
      
      // Validate each task has required fields
      for (const task of reorderedTasks) {
        if (!task.id || typeof task.position !== 'number') {
          console.log("❌ [REORDER] Invalid task data:", task);
          return res.status(400).json({ message: "Invalid task data" });
        }
      }
      
      console.log("✅ [REORDER] All validations passed, calling taskService.reorderTasks");
      
      const authContext = createAuthContextFromRequest(req);
      await taskService.reorderTasks(authContext, reorderedTasks);
      
      console.log("✅ [REORDER] Storage reorder completed successfully");
      
      res.status(200).json({ message: "Tasks reordered successfully" });
    } catch (error) {
      console.error("❌ [REORDER] Erro ao reordenar tasks:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(500).json({ message: "Failed to reorder tasks" });
    }
  });

  // Atualizar task
  app.patch("/api/tasks/:id",
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Editar Tarefas"),
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedTask = await taskService.updateTask(authContext, req.params.id, req.body);
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // Deletar task
  app.delete("/api/tasks/:id",
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Excluir Tarefas"),
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await taskService.deleteTask(authContext, req.params.id);
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get("/api/boards/:boardId/columns", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const columns = await columnService.getBoardColumns(authContext, req.params.boardId);
      res.json(columns);
    } catch (error) {
      console.error("Error fetching board columns:", error);
      res.status(500).json({ message: "Failed to fetch board columns" });
    }
  });

  // Column routes - Protegidas com permissões
  app.get("/api/columns", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Listar Colunas"), 
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const columns = await columnService.getColumns(authContext);
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.get("/api/columns/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const column = await columnService.getColumn(authContext, req.params.id);
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.json(column);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch column" });
    }
  });

  app.post("/api/columns", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Criar Colunas"), 
    async (req, res) => {
    const startTime = Date.now();
    const authContext = createAuthContextFromRequest(req);
    const userId = authContext.userId || "system";
    const userName = authContext.userName || "Sistema";
    
    try {
      const columnData = insertColumnSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const column = await columnService.createColumn(authContext, columnData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar coluna "${column.title}"`, 'success', null, duration);
      
      res.status(201).json(column);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Criar coluna "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.put("/api/columns/:id", async (req, res) => {
    try {
      const columnData = updateColumnSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const column = await columnService.updateColumn(authContext, req.params.id, columnData);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.patch("/api/columns/:id", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Editar Colunas"), 
    async (req, res) => {
    try {
      const columnData = updateColumnSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const column = await columnService.updateColumn(authContext, req.params.id, columnData);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.delete("/api/columns/:id", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Excluir Colunas"), 
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await columnService.deleteColumn(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(500).json({ message: "Failed to delete column" });
    }
  });

  app.post("/api/columns/reorder", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Editar Colunas"), 
    async (req, res) => {
    try {
      const reorderedColumns = req.body.columns;
      const authContext = createAuthContextFromRequest(req);
      await columnService.reorderColumns(authContext, reorderedColumns);
      res.status(200).json({ message: "Columns reordered successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to reorder columns" });
    }
  });

  // 🗑️ DEPRECATED: Team member routes - migrated to userTeamService
  app.get("/api/team-members", async (req, res) => {
    res.status(410).json({ 
      message: "Endpoint deprecated. Use /api/teams/{teamId}/users or userTeamService methods",
      migration: "Use userTeamService.getTeamUsers() instead"
    });
  });

  app.post("/api/team-members", async (req, res) => {
    res.status(410).json({ 
      message: "Endpoint deprecated. Use POST /api/users/{userId}/teams/{teamId}",
      migration: "Use userTeamService.addUserToTeam() instead"
    });
  });

  app.patch("/api/team-members/:id/status", async (req, res) => {
    res.status(410).json({ 
      message: "Endpoint deprecated. Use PATCH /api/users/{userId}/teams/{teamId}",
      migration: "Use userTeamService.updateUserTeamRole() instead"
    });
  });

  // Analytics endpoint - MIGRADO PARA NÍVEL 3
  app.get("/api/analytics", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Listar Analytics"), 
    async (req, res) => {
    try {
      const { boardId } = req.query;
      const authContext = (req as any).authContext;
      
      const startTime = Date.now();
      
      // 🔥 ANALYTICS SIMPLIFICADOS E ULTRA-RÁPIDOS
      const analyticsData = await QueryHandlers.getAnalytics(
        boardId ? 'board' : 'global',
        boardId as string || 'global'
      );
      
      const duration = Date.now() - startTime;
      console.log(`🚀 [ANALYTICS] Processado em ${duration}ms (NÍVEL 3)`);
      
      res.json(analyticsData);
    } catch (error) {
      console.error("🔴 [ERROR] Error in NÍVEL 3 analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Tag routes
  app.get("/api/tags", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const tags = await tagService.getTags(authContext);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.get("/api/tags/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const tag = await tagService.getTag(authContext, req.params.id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tag" });
    }
  });

  app.post("/api/tags", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const tag = await tagService.createTag(authContext, tagData);
      res.status(201).json(tag);
    } catch (error) {
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.put("/api/tags/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const tag = await tagService.updateTag(authContext, req.params.id, tagData);
      res.json(tag);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.delete("/api/tags/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await tagService.deleteTag(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // User routes
  app.get("/api/users/me", async (req, res) => {
    try {
      // For development, return the first user as current user
      const authContext = createAuthContextFromRequest(req);
      const result = await userService.getUsers(authContext);
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
  });

  app.get("/api/users", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const users = await userService.getUsers(authContext);
      res.json(users);
    } catch (error) {
      console.error('Error in GET /api/users:', error);
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      res.status(500).json({ message });
    }
  });

  app.get("/api/users/:id", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
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
  });

  app.post("/api/users", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const userId = authContext.userId;
      const userName = authContext.userName || 'Usuário desconhecido';
      
      // Não adicionar senha padrão aqui - deixar o UserService gerar dinamicamente
      const userData = {
        ...req.body
        // password será gerado dinamicamente no UserService se não fornecida
      };
      
      console.log('🔍 [DEBUG-CREATE-USER] Data received:', JSON.stringify({
        name: userData.name,
        email: userData.email,
        hasPassword: !!userData.password,
        role: userData.role,
        profileId: userData.profileId
      }));
      
      const user = await userService.createUser(authContext, userData);
      
      // Enviar email de boas-vindas
      if (user.email) {
        try {
          await sendWelcomeEmail({
            to: user.email,
            userName: user.name,
            userRole: user.role || undefined
          });
          console.log(`Welcome email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Failed to send welcome email to ${user.email}:`, emailError);
          // Não falha a criação do usuário se o email falhar
        }
      }
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar usuário "${user.name}" (${user.email})`, 'success', null, duration);
      
      res.status(201).json(user);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Tentar obter informações do usuário para o log, mesmo com erro
      let userId = 'unknown';
      let userName = 'Usuário desconhecido';
      try {
        const authContext = await AuthServiceJWT.verifyAuth(req);
        if (authContext) {
          userId = authContext.userId;
          userName = authContext.userName || 'Usuário desconhecido';
        }
      } catch (authError) {
        // Ignore auth error for logging
      }
      
      addUserActionLog(userId, userName, `Criar usuário "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      console.error('Error in POST /api/users:', error);
      const message = error instanceof Error ? error.message : "Invalid user data";
      res.status(400).json({ message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const userData = updateUserSchema.parse(req.body);
      const user = await userService.updateUser(authContext, req.params.id, userData);
      res.json(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      console.error('Error in PUT /api/users/:id:', error);
      const message = error instanceof Error ? error.message : "Invalid user data";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const userId = authContext.userId;
      const userName = authContext.userName || 'Usuário desconhecido';
      const userData = req.body;
      const user = await userService.updateUser(authContext, req.params.id, userData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Atualizar usuário "${user.name}" (${user.email})`, 'success', null, duration);
      
      res.json(user);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Tentar obter informações do usuário para o log, mesmo com erro
      let userId = 'unknown';
      let userName = 'Usuário desconhecido';
      try {
        const authContext = await AuthServiceJWT.verifyAuth(req);
        if (authContext) {
          userId = authContext.userId;
          userName = authContext.userName || 'Usuário desconhecido';
        }
      } catch (authError) {
        // Ignore auth error for logging
      }
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Atualizar usuário (ID: ${req.params.id})`, 'error', { error: 'Usuário não encontrado' }, duration);
        return res.status(404).json({ message: "User not found" });
      }
      
      addUserActionLog(userId, userName, `Atualizar usuário (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      console.error('Error in PATCH /api/users/:id:', error);
      const message = error instanceof Error ? error.message : "Invalid user data";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const userId = authContext.userId;
      const userName = authContext.userName || 'Usuário desconhecido';
      
      await userService.deleteUser(authContext, req.params.id);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Deletar usuário (ID: ${req.params.id})`, 'success', null, duration);
      
      res.status(204).send();
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Tentar obter informações do usuário para o log, mesmo com erro
      let userId = 'unknown';
      let userName = 'Usuário desconhecido';
      try {
        const authContext = await AuthServiceJWT.verifyAuth(req);
        if (authContext) {
          userId = authContext.userId;
          userName = authContext.userName || 'Usuário desconhecido';
        }
      } catch (authError) {
        // Ignore auth error for logging
      }
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Deletar usuário (ID: ${req.params.id})`, 'error', { error: 'Usuário não encontrado' }, duration);
        return res.status(404).json({ message: "User not found" });
      }
      
      addUserActionLog(userId, userName, `Deletar usuário (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      console.error('Error in DELETE /api/users/:id:', error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Sistema de Logs com persistência em arquivo
  const LOGS_FILE = join(process.cwd(), 'system-logs.json');
  let systemLogs: Array<{
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: string;
    details?: any;
    // Novos campos para ações do usuário
    actionType?: 'user_action' | 'system' | 'api';
    userId?: string;
    userName?: string;
    action?: string;
    status?: 'success' | 'error' | 'pending';
    errorDetails?: any;
    duration?: number;
  }> = [];

  // Carregar logs existentes na inicialização
  async function loadLogs() {
    try {
      const data = await fs.readFile(LOGS_FILE, 'utf8');
      systemLogs = JSON.parse(data);
      console.log(`🔵 [SYSTEM] ${systemLogs.length} logs carregados do arquivo`);
    } catch (error) {
      // Arquivo não existe ou erro de leitura - inicializar array vazio
      systemLogs = [];
      console.log('🔵 [SYSTEM] Iniciando com logs vazios');
    }
  }

  // Salvar logs no arquivo
  async function saveLogs() {
    try {
      await fs.writeFile(LOGS_FILE, JSON.stringify(systemLogs, null, 2));
    } catch (error) {
      console.error('🔴 [ERROR] Falha ao salvar logs:', error);
    }
  }

  // Inicializar logs
  loadLogs();

  // Interceptar logs existentes e adicionar ao sistema
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Função para adicionar log do sistema
  const addLog = (level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: string, details?: any) => {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      details,
      actionType: 'system' as const
    };
    
    systemLogs.unshift(log);
    
    if (systemLogs.length > 200) {
      systemLogs = systemLogs.slice(0, 200);
    }
    
    // Salvar logs no arquivo de forma assíncrona
    saveLogs().catch(err => console.error('Erro ao salvar logs:', err));
    
    const emoji = level === 'info' ? '🔵' : level === 'warn' ? '🟡' : level === 'error' ? '🔴' : '⚪';
    originalConsoleLog(`${emoji} [${context || 'SYSTEM'}] ${message}`, details ? details : '');
  };

  // Função para adicionar log de ação do usuário
  const addUserActionLog = (
    userId: string, 
    userName: string, 
    action: string, 
    status: 'success' | 'error' | 'pending',
    errorDetails?: any,
    duration?: number
  ) => {
    const log = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: status === 'error' ? 'error' as const : 'info' as const,
      message: `${userName} executou: ${action}`,
      context: 'USER_ACTION',
      actionType: 'user_action' as const,
      userId,
      userName,
      action,
      status,
      errorDetails,
      duration
    };
    
    systemLogs.unshift(log);
    
    if (systemLogs.length > 200) {
      systemLogs = systemLogs.slice(0, 200);
    }
    
    // Salvar logs no arquivo de forma assíncrona
    saveLogs().catch(err => console.error('Erro ao salvar logs:', err));
    
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
    const statusEmoji = status === 'success' ? '🟢' : status === 'error' ? '🔴' : '🟡';
    originalConsoleLog(`${emoji} [USER_ACTION] ${userName} → ${action} ${statusEmoji}${duration ? ` (${duration}ms)` : ''}`, errorDetails ? errorDetails : '');
  };

  // Endpoint para obter logs
  app.get("/api/system/logs", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const { level, type, search, limit = "100" } = req.query;
      let filteredLogs = systemLogs;
      
      if (level && typeof level === 'string') {
        filteredLogs = filteredLogs.filter(log => log.level === level);
      }
      
      if (type && typeof type === 'string') {
        filteredLogs = filteredLogs.filter(log => log.actionType === type);
      }
      
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchTerm) ||
          log.action?.toLowerCase().includes(searchTerm) ||
          log.userName?.toLowerCase().includes(searchTerm) ||
          log.context?.toLowerCase().includes(searchTerm)
        );
      }
      
      const limitNum = parseInt(limit as string, 10);
      const result = filteredLogs.slice(0, Math.min(limitNum, 200));
      
      res.json({
        logs: result,
        total: filteredLogs.length,
        levels: ['info', 'warn', 'error', 'debug'],
        types: ['user_action', 'system', 'api']
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Endpoint para limpar logs
  app.delete("/api/system/logs", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      systemLogs = [];
      await saveLogs(); // Salvar imediatamente após limpar
      addLog('info', 'Logs do sistema foram limpos', 'ADMIN');
      res.json({ message: "Logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear logs" });
    }
  });

  // Rota para interface independente de logs
  app.get("/logs-viewer", (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NuP-Kan - Visualizador de Logs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #374151;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.75rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 0.95rem;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .controls {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .control-group label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
        }
        
        .control-group input,
        .control-group select {
            padding: 0.5rem 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 0.875rem;
            min-width: 150px;
        }
        
        .control-group input:focus,
        .control-group select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a67d8;
        }
        
        .stats {
            display: flex;
            gap: 1rem;
            margin-left: auto;
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .stats span {
            background: #f3f4f6;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
        }
        
        .logs-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .logs-header {
            background: #f9fafb;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .logs-header h3 {
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .logs-list {
            max-height: 600px;
            overflow-y: auto;
        }
        
        .log-item {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #f3f4f6;
            border-left: 4px solid transparent;
            display: flex;
            gap: 1rem;
            align-items: flex-start;
        }
        
        .log-item:last-child {
            border-bottom: none;
        }
        
        .log-item.user-action {
            border-left-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.02);
        }
        
        .log-item.system {
            border-left-color: #3b82f6;
            background: rgba(59, 130, 246, 0.02);
        }
        
        .log-item.error {
            border-left-color: #ef4444;
            background: rgba(239, 68, 68, 0.02);
        }
        
        .log-timestamp {
            font-size: 0.75rem;
            color: #6b7280;
            min-width: 140px;
            font-family: 'Courier New', monospace;
        }
        
        .log-content {
            flex: 1;
        }
        
        .log-message {
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
        }
        
        .log-meta {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .badge {
            font-size: 0.75rem;
            padding: 0.125rem 0.5rem;
            border-radius: 12px;
            font-weight: 500;
        }
        
        .badge-level {
            background: #f3f4f6;
            color: #374151;
        }
        
        .badge-level.error {
            background: #fef2f2;
            color: #dc2626;
        }
        
        .badge-level.warn {
            background: #fffbeb;
            color: #d97706;
        }
        
        .badge-level.info {
            background: #eff6ff;
            color: #2563eb;
        }
        
        .badge-type {
            background: #f0f9ff;
            color: #0369a1;
        }
        
        .badge-status {
            background: #f0fdf4;
            color: #166534;
        }
        
        .badge-status.error {
            background: #fef2f2;
            color: #dc2626;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
        }
        
        .error-message {
            background: #fef2f2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #6b7280;
        }
        
        .auto-refresh {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .auto-refresh input[type="checkbox"] {
            width: auto;
            min-width: auto;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 NuP-Kan - Visualizador de Logs</h1>
        <p>Interface independente para monitoramento e análise de logs</p>
    </div>
    
    <div class="container">
        <div class="controls">
            <div class="control-group">
                <label>🔍 Buscar</label>
                <input type="text" id="searchInput" placeholder="Buscar por usuário, ação ou mensagem...">
            </div>
            
            <div class="control-group">
                <label>📊 Nível</label>
                <select id="levelFilter">
                    <option value="all">Todos</option>
                    <option value="info">Info</option>
                    <option value="warn">Avisos</option>
                    <option value="error">Erros</option>
                    <option value="debug">Debug</option>
                </select>
            </div>
            
            <div class="control-group">
                <label>🏷️ Tipo</label>
                <select id="typeFilter">
                    <option value="all">🔍 Todos os Tipos</option>
                    <option value="user_action">👤 Ações do Usuário</option>
                    <option value="system">⚙️ Sistema</option>
                    <option value="api">🔗 API</option>
                </select>
            </div>
            
            <div class="control-group">
                <label>&nbsp;</label>
                <button class="btn btn-primary" onclick="loadLogs()">🔄 Atualizar</button>
            </div>
            
            <div class="control-group">
                <label>&nbsp;</label>
                <div class="auto-refresh">
                    <input type="checkbox" id="autoRefresh">
                    <label for="autoRefresh">Auto-refresh (3s)</label>
                </div>
            </div>
            
            <div class="stats">
                <span id="logCount">0 logs</span>
                <span id="lastUpdate">-</span>
            </div>
        </div>
        
        <div class="logs-container">
            <div class="logs-header">
                <h3>📋 Histórico de Logs</h3>
            </div>
            
            <div class="logs-list" id="logsList">
                <div class="loading">Carregando logs...</div>
            </div>
        </div>
    </div>

    <script>
        let autoRefreshInterval;
        
        function formatTimestamp(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        function getLogClass(log) {
            if (log.actionType === 'user_action') return 'user-action';
            if (log.actionType === 'system') return 'system';
            if (log.level === 'error') return 'error';
            return '';
        }
        
        function renderLogs(logs) {
            const logsList = document.getElementById('logsList');
            
            if (logs.length === 0) {
                logsList.innerHTML = '<div class="empty-state">📝 Nenhum log encontrado</div>';
                return;
            }
            
            const html = logs.map(log => \`
                <div class="log-item \${getLogClass(log)}">
                    <div class="log-timestamp">\${formatTimestamp(log.timestamp)}</div>
                    <div class="log-content">
                        <div class="log-message">\${log.message}</div>
                        <div class="log-meta">
                            <span class="badge badge-level \${log.level}">\${log.level}</span>
                            \${log.actionType ? \`<span class="badge badge-type">\${log.actionType}</span>\` : ''}
                            \${log.status ? \`<span class="badge badge-status \${log.status}">\${log.status}</span>\` : ''}
                            \${log.duration ? \`<span class="badge badge-level">\${log.duration}ms</span>\` : ''}
                        </div>
                    </div>
                </div>
            \`).join('');
            
            logsList.innerHTML = html;
        }
        
        function updateStats(total) {
            document.getElementById('logCount').textContent = \`\${total} logs\`;
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('pt-BR');
        }
        
        function showError(message) {
            const logsList = document.getElementById('logsList');
            logsList.innerHTML = \`<div class="error-message">❌ \${message}</div>\`;
        }
        
        async function loadLogs() {
            try {
                const search = document.getElementById('searchInput').value;
                const level = document.getElementById('levelFilter').value;
                const type = document.getElementById('typeFilter').value;
                
                const params = new URLSearchParams();
                if (level !== 'all') params.append('level', level);
                if (type !== 'all') params.append('type', type);
                if (search.trim()) params.append('search', search.trim());
                params.append('limit', '200');
                
                const response = await fetch(\`/api/system/logs?\${params}\`);
                if (!response.ok) {
                    throw new Error(\`Erro HTTP: \${response.status}\`);
                }
                
                const data = await response.json();
                renderLogs(data.logs);
                updateStats(data.total);
                
            } catch (error) {
                console.error('Erro ao carregar logs:', error);
                showError(\`Falha ao carregar logs: \${error.message}\`);
            }
        }
        
        function setupAutoRefresh() {
            const checkbox = document.getElementById('autoRefresh');
            
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    loadLogs(); // Carregar imediatamente
                    autoRefreshInterval = setInterval(loadLogs, 3000);
                } else {
                    clearInterval(autoRefreshInterval);
                }
            });
        }
        
        function setupFilters() {
            const searchInput = document.getElementById('searchInput');
            const levelFilter = document.getElementById('levelFilter');
            const typeFilter = document.getElementById('typeFilter');
            
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(loadLogs, 500);
            });
            
            levelFilter.addEventListener('change', loadLogs);
            typeFilter.addEventListener('change', loadLogs);
        }
        
        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            // Definir filtro padrão para ações do usuário
            document.getElementById('typeFilter').value = 'user_action';
            
            setupAutoRefresh();
            setupFilters();
            loadLogs();
        });
    </script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('🚀 API:') || message.includes('✅ API:') || message.includes('❌ API:')) {
      const context = message.includes('Creating task') ? 'TASK_CREATION' : 'API';
      const level = message.includes('❌') ? 'error' : message.includes('🚀') ? 'debug' : 'info';
      addLog(level, message, context);
    }
    originalConsoleLog(...args);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    addLog('error', message, 'ERROR');
    originalConsoleError(...args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    addLog('warn', message, 'WARNING');
    originalConsoleWarn(...args);
  };

  // Log inicial
  addLog('info', 'Sistema de logs iniciado', 'SYSTEM');

  // Endpoint para alterar senha
  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      const authContext = createAuthContextFromRequest(req);
      await userService.updateUserPassword(authContext, req.params.id, newPassword);
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // User Teams routes
  app.get("/api/user-teams", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const userTeams = await userTeamService.getAllUserTeams(authContext);
      res.json(userTeams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user teams" });
    }
  });

  app.get("/api/users/:userId/teams", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const userTeams = await userTeamService.getUserTeams(authContext, req.params.userId);
      res.json(userTeams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user teams" });
    }
  });

  app.get("/api/teams/:teamId/users", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const teamUsers = await userTeamService.getTeamUsers(authContext, req.params.teamId);
      res.json(teamUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team users" });
    }
  });

  app.post("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const { role = "member" } = req.body;
      const authContext = createAuthContextFromRequest(req);
      const userTeam = await userTeamService.addUserToTeam(authContext, {
        userId: req.params.userId,
        teamId: req.params.teamId,
        role,
      });
      res.status(201).json(userTeam);
    } catch (error) {
      res.status(400).json({ message: "Failed to add user to team" });
    }
  });

  app.delete("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await teamService.removeUserFromTeam(authContext, req.params.userId, req.params.teamId);
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found in team" });
      }
      res.status(500).json({ message: "Failed to remove user from team" });
    }
  });

  app.patch("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const { role } = req.body;
      const result = await teamService.updateUserTeamRole(authContext, req.params.userId, req.params.teamId, role);
      
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found in team" });
      }
      res.status(400).json({ message: "Failed to update user role in team" });
    }
  });

  // Team routes
  app.get("/api/teams", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const result = await teamService.getTeams(authContext);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const result = await teamService.getTeam(authContext, req.params.id);
      
      if (!result) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    const startTime = Date.now();
    let userId = 'unknown';
    let userName = 'Usuário desconhecido';
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      userId = authContext.userId;
      userName = authContext.userName || 'Usuário desconhecido';
      const result = await teamService.createTeam(authContext, req.body);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar time "${result.name}"`, 'success', null, duration);
      
      res.status(201).json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Criar time "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const result = await teamService.updateTeam(authContext, req.params.id, req.body);
      
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    const startTime = Date.now();
    let userId = 'unknown';
    let userName = 'Usuário desconhecido';
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      userId = authContext.userId;
      userName = authContext.userName || 'Usuário desconhecido';
      const result = await teamService.updateTeam(authContext, req.params.id, req.body);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Atualizar time "${result.name}"`, 'success', null, duration);
      
      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Atualizar time (ID: ${req.params.id})`, 'error', { error: 'Time não encontrado' }, duration);
        return res.status(404).json({ message: "Team not found" });
      }
      
      addUserActionLog(userId, userName, `Atualizar time (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    const startTime = Date.now();
    let userId = 'unknown';
    let userName = 'Usuário desconhecido';
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      userId = authContext.userId;
      userName = authContext.userName || 'Usuário desconhecido';
      await teamService.deleteTeam(authContext, req.params.id);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Deletar time (ID: ${req.params.id})`, 'success', null, duration);
      
      res.status(204).send();
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Deletar time (ID: ${req.params.id})`, 'error', { error: 'Time não encontrado' }, duration);
        return res.status(404).json({ message: "Team not found" });
      }
      
      addUserActionLog(userId, userName, `Deletar time (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Profile routes
  app.get("/api/profiles", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const profiles = await profileService.getProfiles(authContext);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const profile = await profileService.getProfile(authContext, req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profiles", async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const userId = authContext.userId;
      const userName = authContext.userName || 'Usuário desconhecido';
      
      const profileData = insertProfileSchema.parse(req.body);
      const profile = await profileService.createProfile(authContext, profileData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar perfil "${profile.name}"`, 'success', null, duration);
      
      res.status(201).json(profile);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Tentar obter informações do usuário para o log, mesmo com erro
      let logUserId = 'unknown';
      let logUserName = 'Usuário desconhecido';
      try {
        const authContextLog = await AuthServiceJWT.verifyAuth(req);
        if (authContextLog) {
          logUserId = authContextLog.userId;
          logUserName = authContextLog.userName || 'Usuário desconhecido';
        }
      } catch (authError) {
        // Ignore auth error for logging
      }
      
      addUserActionLog(logUserId, logUserName, `Criar perfil "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      console.error('Error in POST /api/profiles:', error);
      const message = error instanceof Error ? error.message : "Invalid profile data";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    const startTime = Date.now();
    let userId = 'unknown';
    let userName = 'Usuário desconhecido';
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      userId = authContext.userId;
      userName = authContext.userName || 'Usuário desconhecido';
      
      const profileData = updateProfileSchema.parse(req.body);
      const profile = await profileService.updateProfile(authContext, req.params.id, profileData);
      
      // Cache individual será invalidado automaticamente pelo TanStack Query
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Atualizar perfil "${profile.name}"`, 'success', null, duration);
      
      res.json(profile);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Atualizar perfil (ID: ${req.params.id})`, 'error', { error: 'Perfil não encontrado' }, duration);
        return res.status(404).json({ message: "Profile not found" });
      }
      
      addUserActionLog(userId, userName, `Atualizar perfil (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  app.delete("/api/profiles/:id", async (req, res) => {
    const startTime = Date.now();
    let userId = 'unknown';
    let userName = 'Usuário desconhecido';
    
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      userId = authContext.userId;
      userName = authContext.userName || 'Usuário desconhecido';
      
      await profileService.deleteProfile(authContext, req.params.id);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Deletar perfil (ID: ${req.params.id})`, 'success', null, duration);
      
      res.status(204).send();
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Deletar perfil (ID: ${req.params.id})`, 'error', { error: 'Perfil não encontrado' }, duration);
        return res.status(404).json({ message: "Profile not found" });
      }
      
      addUserActionLog(userId, userName, `Deletar perfil (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // 🚀 CONSOLIDATED PERMISSIONS DATA - Single optimized endpoint
  // REMOVIDO: API consolidada permissions-data - usando APIs individuais

  // Permission routes
  app.get("/api/permissions", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const permissions = await permissionService.getPermissions(authContext);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get("/api/permissions/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const permission = await permissionService.getPermission(authContext, req.params.id);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });

  app.post("/api/permissions", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const permission = await permissionService.createPermission(authContext, permissionData);
      // Cache invalidation handled automatically
      res.status(201).json(permission);
    } catch (error) {
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.patch("/api/permissions/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const permissionData = req.body;
      const authContext = createAuthContextFromRequest(req);
      const permission = await permissionService.updatePermission(authContext, req.params.id, permissionData);
      res.json(permission);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.delete("/api/permissions/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await permissionService.deletePermission(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });

  // Profile Permissions routes
  app.get("/api/profile-permissions", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const profilePermissions = await permissionService.getAllProfilePermissions(authContext);
      res.json(profilePermissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile permissions" });
    }
  });

  app.get("/api/profiles/:id/permissions", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const profilePermissions = await profileService.getProfilePermissions(authContext, req.params.id);
      res.json(profilePermissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile permissions" });
    }
  });

  app.post("/api/profiles/:profileId/permissions", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const { permissionId } = req.body;
      const authContext = createAuthContextFromRequest(req);
      const profilePermission = await profileService.addPermissionToProfile(authContext, req.params.profileId, permissionId);
      res.status(201).json(profilePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to profile" });
    }
  });

  app.post("/api/profiles/:profileId/permissions/:permissionId", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const profilePermission = await profileService.addPermissionToProfile(authContext, req.params.profileId, req.params.permissionId);
      res.status(201).json(profilePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to profile" });
    }
  });

  app.delete("/api/profiles/:profileId/permissions/:permissionId", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await profileService.removePermissionFromProfile(authContext, req.params.profileId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Profile permission not found" });
      }
      res.status(500).json({ message: "Failed to remove permission from profile" });
    }
  });

  // ❌ ROTA DUPLICADA REMOVIDA - Usando apenas a versão protegida acima

  // ===== ROTA REMOVIDA - AGORA ESTÁ NO INÍCIO =====

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
      }

      // Check if user already exists - TODO: usar userService.findByEmail quando implementar
      const authContext = createAuthContextFromRequest(req);
      const users = await userService.getUsers(authContext);
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (existingUser) {
        return res.status(409).json({ message: "Usuário já existe com este email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user
      const userData = {
        name,
        email,
        password: hashedPassword,
        role: "Usuário",
        avatar: name.substring(0, 2).toUpperCase(),
        status: "offline"
      };

      // Criar contexto de sistema para registro
      const systemContext = { userId: 'system', userName: 'System', userEmail: '', permissions: [], permissionCategories: [], profileId: null, profileName: 'System', teams: [], isAuthenticated: true, lastActivity: new Date(), sessionId: 'system-register' };
      const newUser = await userService.createUser(systemContext, userData);
      
      // Send welcome email if configured
      try {
        await sendWelcomeEmail({ to: email, userName: name });
      } catch (emailError) {
        console.warn("Failed to send welcome email:", emailError);
      }

      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        profileId: newUser.profileId
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // 🚀 JWT LOGOUT - Invalidação server-side com blacklist
      const { JWTService } = await import('./services/jwtService');
      const token = JWTService.extractTokenFromRequest(req);
      
      if (token) {
        // Adicionar token à blacklist para invalidação server-side
        await JWTService.blacklistToken(token);
        
        const payload = JWTService.decodeToken(token);
        console.log('✅ [LOGOUT-JWT] Logout bem-sucedido com blacklist:', {
          userId: payload?.userId,
          userName: payload?.name,
          tokenBlacklisted: true
        });
      }
      
      // Destroy session (compatibilidade)
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.warn('⚠️ [LOGOUT] Erro ao destruir sessão (não crítico):', err);
          }
        });
      }
      
      res.json({ 
        message: "Logout realizado com sucesso",
        timestamp: new Date().toISOString(),
        tokenInvalidated: !!token
      });
      
    } catch (error) {
      console.error('❌ [LOGOUT-JWT] Erro:', error);
      res.status(500).json({ message: "Erro ao fazer logout" });
    }
  });

  // 🚀 Rota para refresh de tokens JWT
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { JWTService } = await import('./services/jwtService');
      const refreshToken = JWTService.extractTokenFromRequest(req);
      
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token requerido" });
      }

      // Função auxiliar para buscar dados do usuário para refresh (sem validação de permissões)
      const getUserData = async (userId: string) => {
        const systemContext = { userId: 'system', permissions: ['*'], profileId: 'system' };
        return await userService.getUser(systemContext, userId);
      };

      const newTokens = await JWTService.refreshAccessToken(refreshToken, getUserData);
      
      if (!newTokens) {
        return res.status(401).json({ message: "Refresh token inválido ou expirado" });
      }

      console.log('✅ [REFRESH-JWT] Tokens renovados com sucesso');
      res.json(newTokens);
      
    } catch (error) {
      console.error('❌ [REFRESH-JWT] Erro:', error);
      res.status(500).json({ message: "Erro ao renovar tokens" });
    }
  });

  // ✅ ROTA REMOVIDA - Estava duplicada e causando conflito de sessão
  // A rota correta está definida na linha 82 usando RouteHandlers.authRoutes.currentUser

  // Team Profiles routes
  app.get("/api/team-profiles", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const teamProfiles = await teamProfileService.getAllTeamProfiles(authContext);
      res.json(teamProfiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team profiles" });
    }
  });

  app.get("/api/teams/:id/profiles", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const teamProfiles = await teamProfileService.getTeamProfiles(authContext, req.params.id);
      res.json(teamProfiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team profiles" });
    }
  });

  app.post("/api/team-profiles", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const { teamId, profileId } = req.body;
      const authContext = createAuthContextFromRequest(req);
      const teamProfile = await teamProfileService.assignProfileToTeam(authContext, teamId, profileId);
      res.status(201).json(teamProfile);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign profile to team" });
    }
  });

  app.post("/api/teams/:teamId/profiles/:profileId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const teamProfile = await teamProfileService.assignProfileToTeam(authContext, req.params.teamId, req.params.profileId);
      res.status(201).json(teamProfile);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign profile to team" });
    }
  });

  app.delete("/api/team-profiles/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await teamProfileService.deleteTeamProfile(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team profile not found" });
      }
      res.status(500).json({ message: "Failed to remove profile from team" });
    }
  });

  app.delete("/api/teams/:teamId/profiles/:profileId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await teamProfileService.removeProfileFromTeam(authContext, req.params.teamId, req.params.profileId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team profile not found" });
      }
      res.status(500).json({ message: "Failed to remove profile from team" });
    }
  });

  // Task Events endpoints
  app.get("/api/tasks/:taskId/events", async (req, res) => {
    try {
      const { taskId } = req.params;
      const authContext = createAuthContextFromRequest(req);
      const events = await taskEventService.getTaskEvents(authContext, taskId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching task events:", error);
      res.status(500).json({ message: "Failed to fetch task events" });
    }
  });

  app.post("/api/tasks/:taskId/events", async (req, res) => {
    try {
      const { taskId } = req.params;
      const eventData = req.body;
      
      const authContext = createAuthContextFromRequest(req);
      const event = await taskEventService.createTaskEvent(authContext, {
        ...eventData,
        taskId
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating task event:", error);
      res.status(500).json({ message: "Failed to create task event" });
    }
  });

  // Email settings routes
  app.post("/api/settings/sendgrid-key", async (req, res) => {
    try {
      const { apiKey, senderDomain } = req.body;
      
      if (!apiKey || !apiKey.startsWith('SG.')) {
        return res.status(400).json({ 
          message: "Invalid API key format. SendGrid API keys must start with 'SG.'" 
        });
      }

      // Update environment variables (this is runtime only, not persistent)
      process.env.SENDGRID_API_KEY = apiKey;
      if (senderDomain) {
        process.env.SENDER_DOMAIN = senderDomain;
      }
      
      // Reinitialize SendGrid with new key
      const mailModule = await import('@sendgrid/mail');
      const mailService = mailModule.default;
      mailService.setApiKey(apiKey);
      
      // Also update the main emailService module
      const { reinitializeMailService } = await import('./emailService');
      reinitializeMailService(apiKey);
      
      console.log("SendGrid API key updated successfully");
      res.json({ message: "SendGrid API key updated successfully" });
    } catch (error) {
      console.error("Error updating SendGrid API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.post("/api/settings/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const success = await sendNotificationEmail({
        to: email,
        subject: "🧪 Teste de Configuração - uP - Kan",
        message: `
          Parabéns! O envio de emails está funcionando corretamente.
          
          Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}.
          
          Configurações:
          ✅ SendGrid API configurada
          ✅ Sistema de emails ativo
          ✅ Templates funcionando
          
          Agora o sistema pode enviar emails de boas-vindas para novos usuários automaticamente!
        `,
        type: 'success'
      });

      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Export History Routes
  app.get("/api/exports/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const authContext = createAuthContextFromRequest(req);
      const exports = await exportService.getExportHistory(authContext, userId);
      res.json(exports);
    } catch (error) {
      console.error("Error fetching export history:", error);
      res.status(500).json({ message: "Failed to fetch export history" });
    }
  });

  // User Permission Management routes
  app.post("/api/users/:userId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      const authContext = createAuthContextFromRequest(req);
      const result = await permissionService.addPermissionToUser(authContext, req.params.userId, permissionId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to user" });
    }
  });

  app.delete("/api/users/:userId/permissions/:permissionId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await permissionService.removePermissionFromUser(authContext, req.params.userId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove permission from user" });
    }
  });

  // Team Permission Management routes
  app.get("/api/teams/:teamId/permissions", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const permissions = await permissionService.getTeamPermissions(authContext, req.params.teamId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team permissions" });
    }
  });

  app.post("/api/teams/:teamId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      console.log("Adding permission to team:", req.params.teamId, permissionId);
      const authContext = createAuthContextFromRequest(req);
      const result = await permissionService.addPermissionToTeam(authContext, req.params.teamId, permissionId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error adding permission to team:", error);
      res.status(400).json({ message: "Failed to add permission to team", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/teams/:teamId/permissions/:permissionId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await permissionService.removePermissionFromTeam(authContext, req.params.teamId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove permission from team" });
    }
  });

  app.post("/api/exports", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const exportData = req.body;
      const newExport = await exportService.createExportHistory(req.authContext, exportData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Iniciar exportação (${exportData.exportType || 'tipo não especificado'})`, 'success', null, duration);
      
      res.status(201).json(newExport);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, 'Iniciar exportação', 'error', { error: errorMessage, details: error }, duration);
      
      console.error("Error creating export history:", error);
      res.status(500).json({ message: "Failed to create export history" });
    }
  });

  app.patch("/api/exports/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Convert completedAt string back to Date object if present
      if (updates.completedAt && typeof updates.completedAt === 'string') {
        updates.completedAt = new Date(updates.completedAt);
      }
      
      const updatedExport = await exportService.updateExportHistory(req.authContext, id, updates);
      
      const duration = Date.now() - startTime;
      const action = updates.status === 'completed' ? 'Concluir exportação' : 
                     updates.status === 'failed' ? 'Falha na exportação' : 
                     'Atualizar exportação';
      const status = updates.status === 'failed' ? 'error' : 'success';
      addUserActionLog(userId, userName, `${action}${updates.fileName ? ` (${updates.fileName})` : ''}`, status, updates.status === 'failed' ? { error: updates.errorMessage } : null, duration);
      
      res.json(updatedExport);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, 'Atualizar exportação', 'error', { error: errorMessage, details: error }, duration);
      
      console.error("Error updating export history:", error);
      res.status(500).json({ message: "Failed to update export history" });
    }
  });

  // Board Sharing routes
  app.get("/api/boards/:boardId/shares", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getBoardShares(authContext, req.params.boardId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board shares" });
    }
  });

  app.get("/api/boards/:boardId/members", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const members = await boardShareService.getBoardMembers(authContext, req.params.boardId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching board members:", error);
      res.status(500).json({ message: "Failed to fetch board members" });
    }
  });

  app.get("/api/boards/:boardId/member-count", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const count = await boardShareService.getBoardMemberCount(authContext, req.params.boardId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching board member count:", error);
      res.status(500).json({ message: "Failed to fetch board member count" });
    }
  });

  app.get("/api/board-shares", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getAllBoardShares(authContext);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board shares" });
    }
  });

  app.get("/api/users/:userId/shared-boards", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getUserSharedBoards(authContext, req.params.userId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user shared boards" });
    }
  });

  app.get("/api/teams/:teamId/shared-boards", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getTeamSharedBoards(authContext, req.params.teamId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team shared boards" });
    }
  });

  app.post("/api/board-shares", async (req, res) => {
    try {
      const shareData = insertBoardShareSchema.parse(req.body);
      const share = await boardShareService.createBoardShare(req.authContext, shareData);
      res.status(201).json(share);
    } catch (error) {
      console.error("Error creating board share:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: "Invalid share data", error: error.message });
      } else {
        res.status(400).json({ message: "Invalid share data" });
      }
    }
  });

  app.patch("/api/board-shares/:id", async (req, res) => {
    try {
      const shareData = updateBoardShareSchema.parse(req.body);
      const share = await boardShareService.updateBoardShare(req.authContext, req.params.id, shareData);
      res.json(share);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board share not found" });
      }
      res.status(400).json({ message: "Invalid share data" });
    }
  });

  app.delete("/api/board-shares/:id", async (req, res) => {
    try {
      await boardShareService.deleteBoardShare(req.authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board share not found" });
      }
      res.status(500).json({ message: "Failed to delete board share" });
    }
  });

  app.get("/api/users/:userId/boards/:boardId/permission", async (req, res) => {
    try {
      const permission = await boardShareService.getUserBoardPermission(req.authContext, req.params.userId, req.params.boardId);
      res.json({ permission });
    } catch (error) {
      res.status(500).json({ message: "Failed to check user board permission" });
    }
  });

  // Task Status routes
  app.get("/api/task-statuses", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const statuses = await taskStatusService.getTaskStatuses(authContext);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task statuses" });
    }
  });

  app.get("/api/task-statuses/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const status = await taskStatusService.getTaskStatus(authContext, req.params.id);
      if (!status) {
        return res.status(404).json({ message: "Task status not found" });
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task status" });
    }
  });

  app.post("/api/task-statuses", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const statusData = insertTaskStatusSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const status = await taskStatusService.createTaskStatus(authContext, statusData);
      res.status(201).json(status);
    } catch (error) {
      console.error("Error creating task status:", error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Invalid task status data", 
          error: error.message 
        });
      } else {
        res.status(400).json({ message: "Invalid task status data" });
      }
    }
  });

  app.patch("/api/task-statuses/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const statusData = updateTaskStatusSchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const status = await taskStatusService.updateTaskStatus(authContext, req.params.id, statusData);
      res.json(status);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task status not found" });
      }
      res.status(400).json({ message: "Invalid task status data" });
    }
  });

  app.delete("/api/task-statuses/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await taskStatusService.deleteTaskStatus(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task status not found" });
      }
      res.status(500).json({ message: "Failed to delete task status" });
    }
  });

  // Task Priority routes
  app.get("/api/task-priorities", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const priorities = await taskStatusService.getTaskPriorities(authContext);
      res.json(priorities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task priorities" });
    }
  });

  app.get("/api/task-priorities/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const priority = await taskStatusService.getTaskPriority(authContext, req.params.id);
      if (!priority) {
        return res.status(404).json({ message: "Task priority not found" });
      }
      res.json(priority);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task priority" });
    }
  });

  app.post("/api/task-priorities", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const priorityData = insertTaskPrioritySchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const priority = await taskStatusService.createTaskPriority(authContext, priorityData);
      res.status(201).json(priority);
    } catch (error) {
      console.error("Error creating task priority:", error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Invalid task priority data", 
          error: error.message 
        });
      } else {
        res.status(400).json({ message: "Invalid task priority data" });
      }
    }
  });

  app.patch("/api/task-priorities/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const priorityData = updateTaskPrioritySchema.parse(req.body);
      const authContext = createAuthContextFromRequest(req);
      const priority = await taskStatusService.updateTaskPriority(authContext, req.params.id, priorityData);
      res.json(priority);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task priority not found" });
      }
      res.status(400).json({ message: "Invalid task priority data" });
    }
  });

  app.delete("/api/task-priorities/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await taskStatusService.deleteTaskPriority(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task priority not found" });
      }
      res.status(500).json({ message: "Failed to delete task priority" });
    }
  });

  // Custom Fields Routes
  app.get("/api/custom-fields", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    try {
      const boardId = req.query.boardId as string;
      
      // Get all active fields first
      const allFields = await db.select().from(customFields)
        .where(eq(customFields.isActive, "true"))
        .orderBy(customFields.position);
      
      if (boardId) {
        // Filter fields for specific board in JavaScript
        const fields = allFields.filter(field => 
          field.boardIds && field.boardIds.includes(boardId)
        );
        res.json(fields);
      } else {
        // Return all active fields (for management)
        res.json(allFields);
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      res.status(500).json({ error: "Failed to fetch custom fields" });
    }
  });

  app.post("/api/custom-fields", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log("🔵 [DEBUG] Raw request body:", JSON.stringify(req.body, null, 2));
      console.log("🔵 [DEBUG] Field name value:", JSON.stringify(req.body.name));
      console.log("🔵 [DEBUG] Field name length:", req.body.name ? req.body.name.length : 'undefined');
      console.log("🔵 [DEBUG] Field name type:", typeof req.body.name);
      
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name;
      
      const validatedData = insertCustomFieldSchema.parse(req.body);
      
      // Get the next position
      const maxPosition = await db.select({ maxPos: sql<number>`MAX(position)` })
        .from(customFields);
      const position = (maxPosition[0]?.maxPos || 0) + 1;
      
      const [field] = await db.insert(customFields)
        .values({ ...validatedData, position })
        .returning();
        
      const duration = Date.now() - startTime;
      if (userId && userName) {
        addUserActionLog(userId, userName, `Criar campo personalizado "${field.label}"`, 'success', null, duration);
      }
      
      res.json(field);
    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (userId && userName) {
        addUserActionLog(userId, userName, `Criar campo personalizado "${req.body.label || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      }
      
      console.error("Error creating custom field:", error);
      res.status(400).json({ error: errorMessage });
    }
  });

  app.patch("/api/custom-fields/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name;
      
      const validatedData = updateCustomFieldSchema.parse(req.body);
      
      const [field] = await db.update(customFields)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(customFields.id, req.params.id))
        .returning();
        
      if (!field) {
        const duration = Date.now() - startTime;
        if (userId && userName) {
          addUserActionLog(userId, userName, `Atualizar campo personalizado (ID: ${req.params.id})`, 'error', { error: 'Campo não encontrado' }, duration);
        }
        return res.status(404).json({ error: "Campo não encontrado" });
      }
      
      const duration = Date.now() - startTime;
      if (userId && userName) {
        addUserActionLog(userId, userName, `Atualizar campo personalizado "${field.label}"`, 'success', null, duration);
      }
      
      res.json(field);
    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (userId && userName) {
        addUserActionLog(userId, userName, `Atualizar campo personalizado (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      }
      
      console.error("Error updating custom field:", error);
      res.status(400).json({ error: errorMessage });
    }
  });

  app.delete("/api/custom-fields/:id", AuthMiddlewareJWT.requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name;
      
      // Soft delete - mark as inactive
      const [field] = await db.update(customFields)
        .set({ isActive: "false", updatedAt: new Date() })
        .where(eq(customFields.id, req.params.id))
        .returning();
        
      if (!field) {
        const duration = Date.now() - startTime;
        if (userId && userName) {
          addUserActionLog(userId, userName, `Deletar campo personalizado (ID: ${req.params.id})`, 'error', { error: 'Campo não encontrado' }, duration);
        }
        return res.status(404).json({ error: "Campo não encontrado" });
      }
      
      const duration = Date.now() - startTime;
      if (userId && userName) {
        addUserActionLog(userId, userName, `Deletar campo personalizado "${field.label}"`, 'success', null, duration);
      }
      
      res.json({ success: true });
    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (userId && userName) {
        addUserActionLog(userId, userName, `Deletar campo personalizado (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      }
      
      console.error("Error deleting custom field:", error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Task Custom Values Routes
  app.get("/api/tasks/:taskId/custom-values", async (req, res) => {
    try {
      const values = await db.select({
        id: taskCustomValues.id,
        taskId: taskCustomValues.taskId,
        customFieldId: taskCustomValues.customFieldId,
        value: taskCustomValues.value,
        fieldName: customFields.name,
        fieldLabel: customFields.label,
        fieldType: customFields.type,
        fieldOptions: customFields.options,
        fieldRequired: customFields.required,
      })
        .from(taskCustomValues)
        .innerJoin(customFields, eq(taskCustomValues.customFieldId, customFields.id))
        .where(and(
          eq(taskCustomValues.taskId, req.params.taskId),
          eq(customFields.isActive, "true")
        ));
        
      res.json(values);
    } catch (error) {
      console.error("Error fetching task custom values:", error);
      res.status(500).json({ error: "Failed to fetch task custom values" });
    }
  });

  app.post("/api/tasks/:taskId/custom-values", async (req, res) => {
    try {
      const validatedData = insertTaskCustomValueSchema.parse({
        ...req.body,
        taskId: req.params.taskId
      });
      
      const [value] = await db.insert(taskCustomValues)
        .values(validatedData)
        .returning();
        
      res.json(value);
    } catch (error) {
      console.error("Error creating task custom value:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create custom value" });
    }
  });

  app.patch("/api/tasks/:taskId/custom-values/:valueId", async (req, res) => {
    try {
      const validatedData = updateTaskCustomValueSchema.parse(req.body);
      
      const [value] = await db.update(taskCustomValues)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(and(
          eq(taskCustomValues.id, req.params.valueId),
          eq(taskCustomValues.taskId, req.params.taskId)
        ))
        .returning();
        
      if (!value) {
        return res.status(404).json({ error: "Custom value not found" });
      }
      
      res.json(value);
    } catch (error) {
      console.error("Error updating task custom value:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update custom value" });
    }
  });

  // Rota para sincronização manual de permissões (admin) - Protegida
  app.post("/api/permissions/sync", 
    AuthMiddlewareJWT.requireAuth,
    AuthMiddlewareJWT.requirePermissions("Gerenciar Permissões"), 
    async (req, res) => {
    try {
      const permissionSyncService = PermissionSyncService.getInstance();
      await permissionSyncService.syncPermissions(app);
      
      const report = await permissionSyncService.getFunctionalityReport(app);
      
      res.json({
        success: true,
        message: "Permissões sincronizadas com sucesso",
        report
      });
    } catch (error) {
      console.error("Error syncing permissions:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync permissions" 
      });
    }
  });

  // Rota para relatório de funcionalidades
  app.get("/api/permissions/functionality-report", async (req, res) => {
    try {
      const permissionSyncService = PermissionSyncService.getInstance();
      const report = await permissionSyncService.getFunctionalityReport(app);
      
      res.json(report);
    } catch (error) {
      console.error("Error generating functionality report:", error);
      res.status(500).json({ error: "Failed to generate functionality report" });
    }
  });

  // ==============================================
  // NOTIFICATIONS ENDPOINTS - Sistema Completo
  // ==============================================

  // GET /api/notifications - Buscar notificações do usuário logado
  app.get("/api/notifications", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      if (!authContext || !authContext.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const result = await notificationService.getNotifications(authContext);
      res.json({
        notifications: result.data || [],
        count: result.data?.length || 0
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  // GET /api/notifications/unread-count - Contar notificações não lidas
  app.get("/api/notifications/unread-count", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      if (!authContext || !authContext.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const result = await notificationService.getUnreadCount(authContext);
      res.json({ count: result.data || 0 });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // GET /api/notifications/:id - Buscar notificação específica
  app.get("/api/notifications/:id", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const { id } = req.params;
      const authContext = createAuthContextFromRequest(req);
      const result = await notificationService.getNotification(authContext, id);
      
      if (!result.success) {
        const status = result.error === 'Notification not found' ? 404 : 500;
        return res.status(status).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Error fetching notification:", error);
      res.status(500).json({ error: "Failed to get notification" });
    }
  });

  // POST /api/notifications - Criar nova notificação
  app.post("/api/notifications", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const result = await notificationService.createNotification(authContext, req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.status(201).json({
        success: true,
        notification: result.data
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Validation error", 
          details: (error as any).errors 
        });
      }
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // PUT /api/notifications/:id - Atualizar notificação
  app.put("/api/notifications/:id", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se a notificação existe e pertence ao usuário
      const authContext = createAuthContextFromRequest(req);
      const existingNotification = await notificationService.getNotification(authContext, id);
      if (!existingNotification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      if (existingNotification.userId !== authContext.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validar dados
      const validatedData = updateNotificationSchema.parse(req.body);
      
      const notification = await notificationService.updateNotification(authContext, id, validatedData);
      
      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error("Error updating notification:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Validation error", 
          details: (error as any).errors 
        });
      }
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // DELETE /api/notifications/:id - Excluir notificação
  app.delete("/api/notifications/:id", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se a notificação existe e pertence ao usuário
      const authContext = createAuthContextFromRequest(req);
      const existingNotification = await notificationService.getNotification(authContext, id);
      if (!existingNotification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      if (existingNotification.userId !== authContext.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await notificationService.deleteNotification(authContext, id);
      
      res.json({
        success: true,
        message: "Notification deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // PATCH /api/notifications/:id/read - Marcar notificação como lida
  app.patch("/api/notifications/:id/read", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se a notificação existe e pertence ao usuário
      const authContext = createAuthContextFromRequest(req);
      const existingNotification = await notificationService.getNotification(authContext, id);
      if (!existingNotification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      if (existingNotification.userId !== authContext.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const notification = await notificationService.markNotificationAsRead(authContext, id);
      
      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // PATCH /api/notifications/mark-all-read - Marcar todas as notificações como lidas
  app.patch("/api/notifications/mark-all-read", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      if (!authContext || !authContext.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const updatedCount = await notificationService.markAllNotificationsAsRead(authContext, authContext.userId);
      
      res.json({
        success: true,
        message: `${updatedCount} notifications marked as read`,
        updatedCount
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Limpeza automática de notificações expiradas (executar periodicamente)
  app.post("/api/notifications/cleanup-expired", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const deletedCount = await notificationService.deleteExpiredNotifications(authContext);
      
      res.json({
        success: true,
        message: `${deletedCount} expired notifications deleted`,
        deletedCount
      });
    } catch (error) {
      console.error("Error cleaning expired notifications:", error);
      res.status(500).json({ error: "Failed to cleanup expired notifications" });
    }
  });

  // ✅ ROTA FALTANTE: Permissions Data - Dados consolidados de permissões
  app.get("/api/permissions-data", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Buscar permissões do usuário atual
      const authContext = createAuthContextFromRequest(req);
      const userPermissions = await userService.getUserPermissions(authContext, userId);
      
      res.json({
        permissions: userPermissions,
        timestamp: new Date().toISOString(),
        userId
      });
    } catch (error) {
      console.error("Error fetching permissions data:", error);
      res.status(500).json({ error: "Failed to fetch permissions data" });
    }
  });

  // ✅ ROTA FALTANTE: Bulk Assignees - Buscar assignees de múltiplas tasks
  app.post("/api/tasks/assignees/bulk", 
    AuthMiddlewareJWT.requireAuth,
    async (req, res) => {
    try {
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "taskIds must be a non-empty array" });
      }

      // Buscar assignees para todas as tasks em paralelo
      const assigneesPromises = taskIds.map(async (taskId: string) => {
        try {
          const assignees = await taskService.getTaskAssignees(req.authContext, taskId);
          return { taskId, assignees };
        } catch (error) {
          console.error(`Error fetching assignees for task ${taskId}:`, error);
          return { taskId, assignees: [] };
        }
      });

      const results = await Promise.all(assigneesPromises);
      
      // Converter para formato esperado: Record<string, assignees[]>
      const assigneesData: Record<string, any[]> = {};
      results.forEach(({ taskId, assignees }) => {
        assigneesData[taskId] = assignees;
      });

      res.json(assigneesData);
    } catch (error) {
      console.error("Error fetching bulk assignees:", error);
      res.status(500).json({ error: "Failed to fetch bulk assignees" });
    }
  });

  // 🏗️ HIERARCHY SERVICE - Resolução formal de hierarquia
  app.get("/api/users/:userId/hierarchy", async (req, res) => {
    try {
      // Verificar autenticação JWT manualmente
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const hierarchy = await hierarchyService.resolveUserHierarchy(authContext, req.params.userId);
      res.json(hierarchy);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve user hierarchy" });
    }
  });

  // 🎯 ASSIGNEE SERVICE - Gestão centralizada de assignees
  app.get("/api/tasks/:taskId/assignees", async (req, res) => {
    try {
      // Verificar autenticação JWT manualmente
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const assignees = await assigneeService.getTaskAssignees(authContext, req.params.taskId);
      res.json(assignees);
    } catch (error) {
      res.status(500).json({ message: "Failed to get task assignees" });
    }
  });

  app.post("/api/tasks/:taskId/assignees", async (req, res) => {
    try {
      // Verificar autenticação JWT manualmente
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const assignee = await assigneeService.addTaskAssignee(authContext, {
        taskId: req.params.taskId,
        userId: req.body.userId
      });
      res.status(201).json(assignee);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to add assignee" });
    }
  });

  const httpServer = createServer(app);
  
  // Sincronizar permissões automaticamente na inicialização
  setTimeout(async () => {
    try {
      const permissionSyncService = PermissionSyncService.getInstance();
      await permissionSyncService.syncPermissions(app);
    } catch (error) {
      console.error("❌ [STARTUP] Erro na sincronização automática de permissões:", error);
    }
  }, 5000); // Aguardar 5 segundos após inicialização
  
  return httpServer;
}
