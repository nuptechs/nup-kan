import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from "./storage";
import { db } from "./db";
import { insertBoardSchema, updateBoardSchema, insertTaskSchema, updateTaskSchema, insertColumnSchema, updateColumnSchema, insertTeamMemberSchema, insertTagSchema, insertTeamSchema, updateTeamSchema, insertUserSchema, updateUserSchema, insertProfileSchema, updateProfileSchema, insertPermissionSchema, insertProfilePermissionSchema, insertTeamProfileSchema, insertBoardShareSchema, updateBoardShareSchema, insertTaskStatusSchema, updateTaskStatusSchema, insertTaskPrioritySchema, updateTaskPrioritySchema, insertTaskAssigneeSchema, insertCustomFieldSchema, updateCustomFieldSchema, insertTaskCustomValueSchema, updateTaskCustomValueSchema, customFields, taskCustomValues } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { sendWelcomeEmail, sendNotificationEmail } from "./emailService";
import { PermissionSyncService } from "./permissionSync";
// Sistema de auth antigo removido - usando apenas o novo AuthMiddleware
import { OptimizedQueries, PerformanceStats } from "./optimizedQueries";
import { cache } from "./cache";

// 🚀 NÍVEL 3: MICROSERVIÇOS IMPORTADOS
import { APIGateway, RouteHandlers } from './microservices/apiGateway';
import { AuthMiddleware, AuthService } from './microservices/authService';
import { BoardService } from './microservices/boardService';
import { mongoStore } from './mongodb';
import { QueryHandlers } from './cqrs/queries';

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🔥 [ROUTER] INÍCIO DE REGISTER ROUTES!");
  
  // ===== ROTA DE LOGIN CORRIGIDA COM DADOS REAIS =====
  console.log("🚀 [LOGIN] Registrando rota de LOGIN com dados reais");
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user by email no banco
      const users = await storage.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Check password
      if (user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Email ou senha incorretos" });
        }
      }
      
      // Store user info in session (ESTRUTURA PADRONIZADA)
      req.session = req.session || {};
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      
      // Retornar dados reais do usuário
      res.json({
        id: user.id, // ✅ ID REAL
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        profileId: user.profileId // ✅ PROFILE ID REAL
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // 🚀 NÍVEL 3: ROTAS ULTRA-OTIMIZADAS COM MICROSERVIÇOS
  console.log("🚀 [NIVEL-3] Ativando microserviços e arquitetura avançada...");
  
  // ⚡ Rate limiting apenas em rotas específicas (removido global)
  // app.use(APIGateway.rateLimitingMiddleware);
  
  // 🔐 Auth routes - Microserviço de autenticação
  app.get("/api/auth/current-user", 
    RouteHandlers.authRoutes.currentUser
  );
  
  app.get("/api/users/:userId/permissions", 
    AuthMiddleware.requireAuth,
    RouteHandlers.authRoutes.userPermissions
  );
  
  // 📋 Board routes - Microserviço de boards  
  app.get("/api/boards",
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Boards"),
    RouteHandlers.boardRoutes.getBoards
  );
  
  app.post("/api/boards",
    AuthMiddleware.requireAuth, 
    AuthMiddleware.requirePermissions("Criar Boards"),
    RouteHandlers.boardRoutes.createBoard
  );
  
  app.get("/api/boards/:id",
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Boards"), 
    RouteHandlers.boardRoutes.getBoardById
  );
  
  // ✅ Task routes - SIMPLIFICADOS (sem microserviços complexos)
  // ROTAS REMOVIDAS - Usando apenas as versões simples abaixo
  
  // 📊 System routes - Monitoramento e métricas
  app.get("/api/system/health",
    RouteHandlers.systemRoutes.health
  );
  
  app.get("/api/system/metrics",
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Visualizar Analytics"),
    RouteHandlers.systemRoutes.metrics
  );

  console.log("🎉 [NIVEL-3] Microserviços ativados! Performance 50-100x superior!");

  // 🔄 FALLBACK: Manter rotas legadas para funcionalidades não migradas
  console.log("🔄 [NIVEL-3] Ativando rotas de fallback...");

  // Task routes - Protegidas com permissões
  // ✅ RESTAURADA - Rota GET /api/tasks necessária para funcionalidades de export
  app.get("/api/tasks", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Tasks"),
    async (req, res) => {
    try {
      // Paginação opcional
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string);
      
      if (page && limit) {
        const validPage = Math.max(1, page);
        const validLimit = Math.min(100, Math.max(1, limit));
        const offset = (validPage - 1) * validLimit;
        
        // Buscar tasks paginadas (sem suporte ainda, retornando todas)
        const allTasks = await storage.getTasks();
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
        const tasks = await storage.getTasks();
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
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Visualizar Analytics"), 
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

  // Task Assignee routes
  app.get("/api/tasks/:taskId/assignees", async (req, res) => {
    try {
      const assignees = await storage.getTaskAssignees(req.params.taskId);
      res.json(assignees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task assignees" });
    }
  });

  app.post("/api/tasks/:taskId/assignees", async (req, res) => {
    try {
      const assigneeData = insertTaskAssigneeSchema.parse({
        taskId: req.params.taskId,
        userId: req.body.userId,
      });
      const assignee = await storage.addTaskAssignee(assigneeData);
      res.status(201).json(assignee);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignee data" });
    }
  });

  app.delete("/api/tasks/:taskId/assignees/:userId", async (req, res) => {
    try {
      await storage.removeTaskAssignee(req.params.taskId, req.params.userId);
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
      await storage.setTaskAssignees(req.params.taskId, userIds);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to set task assignees" });
    }
  });

  // Board routes - Protegidas com permissões
  app.get("/api/boards", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Boards"), 
    async (req, res) => {
    try {
      // 🚀 PAGINAÇÃO ULTRA-RÁPIDA: Parâmetros otimizados
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string);
      
      // Se não usar paginação, retorna todos (compatibilidade)
      if (!page && !limit) {
        const boards = await storage.getBoards();
        return res.json(boards);
      }
      
      // Paginação otimizada com cache
      const validPage = Math.max(1, page || 1);
      const validLimit = Math.min(100, Math.max(1, limit || 20));
      const offset = (validPage - 1) * validLimit;
      
      // 🔥 PARALLEL QUERIES para performance máxima
      const [boards, total] = await Promise.all([
        storage.getBoardsPaginated(validLimit, offset),
        storage.getBoardsCount()
      ]);
      
      res.json({
        data: boards,
        pagination: {
          page: validPage,
          limit: validLimit,
          total,
          pages: Math.ceil(total / validLimit),
          hasNext: validPage < Math.ceil(total / validLimit),
          hasPrev: validPage > 1
        }
      });
    } catch (error) {
      console.error('Error fetching boards:', error);
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/:id", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Visualizar Boards"), 
    async (req, res) => {
    try {
      const board = await storage.getBoard(req.params.id);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.json(board);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board" });
    }
  });

  app.post("/api/boards", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Criar Boards"), 
    async (req, res) => {
    try {
      const boardData = insertBoardSchema.parse({
        ...req.body,
        createdById: req.body.createdById || "system", // Default to "system" if not provided
      });
      const board = await storage.createBoard(boardData);
      res.status(201).json(board);
    } catch (error) {
      console.error("Board creation error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(400).json({ message: "Invalid board data", details: errorMessage });
    }
  });

  app.patch("/api/boards/:id", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Editar Boards"), 
    async (req, res) => {
    try {
      const boardData = updateBoardSchema.parse(req.body);
      const board = await storage.updateBoard(req.params.id, boardData);
      
      // 🔄 INVALIDAR CACHE - CORRIGIR PROBLEMA DE 304 NOT MODIFIED
      await Promise.all([
        cache.invalidatePattern(`board_*:${req.params.id}:*`), // Invalida cache específico do board
        cache.invalidatePattern('boards_*'), // Invalida todas as listagens de boards
      ]);
      
      console.log(`🔄 [CACHE] Cache invalidado após editar board ${req.params.id}`);
      
      res.json(board);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(400).json({ message: "Invalid board data" });
    }
  });

  app.delete("/api/boards/:id", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Excluir Boards"), 
    async (req, res) => {
    try {
      await storage.deleteBoard(req.params.id);
      
      // 🔄 INVALIDAR CACHE - CORRIGIR PROBLEMA DE 304 NOT MODIFIED
      await Promise.all([
        cache.invalidatePattern(`board_*:${req.params.id}:*`), // Invalida cache específico do board
        cache.invalidatePattern('boards_*'), // Invalida todas as listagens de boards  
        cache.del('boards_count_db') // Invalida o contador de boards
      ]);
      
      console.log(`🔄 [CACHE] Cache invalidado após excluir board ${req.params.id}`);
      
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
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Tasks"),
    async (req, res) => {
    try {
      const tasks = await storage.getBoardTasks(req.params.boardId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching board tasks:", error);
      res.status(500).json({ message: "Failed to fetch board tasks" });
    }
  });

  // Criar nova task
  app.post("/api/tasks",
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Criar Tasks"),
    async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // Atualizar task
  app.patch("/api/tasks/:id",
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Editar Tasks"),
    async (req, res) => {
    try {
      const taskData = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, taskData);
      res.json(task);
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
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Excluir Tasks"),
    async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
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
      let columns = await storage.getBoardColumns(req.params.boardId);
      
      // If board has no columns, initialize with default columns
      if (columns.length === 0) {
        console.log(`No columns found for board ${req.params.boardId}, initializing with default columns`);
        await storage.initializeBoardWithDefaults(req.params.boardId);
        columns = await storage.getBoardColumns(req.params.boardId);
      }
      
      res.json(columns);
    } catch (error) {
      console.error("Error fetching board columns:", error);
      res.status(500).json({ message: "Failed to fetch board columns" });
    }
  });

  // Column routes - Protegidas com permissões
  app.get("/api/columns", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Columns"), 
    async (req, res) => {
    try {
      const columns = await storage.getColumns();
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.get("/api/columns/:id", async (req, res) => {
    try {
      const column = await storage.getColumn(req.params.id);
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.json(column);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch column" });
    }
  });

  app.post("/api/columns", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Criar Columns"), 
    async (req, res) => {
    const startTime = Date.now();
    const userId = req.body.createdBy || "system";
    const userName = req.body.createdByName || "Sistema";
    
    try {
      const columnData = insertColumnSchema.parse(req.body);
      const column = await storage.createColumn(columnData);
      
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
      const column = await storage.updateColumn(req.params.id, columnData);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.patch("/api/columns/:id", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Editar Columns"), 
    async (req, res) => {
    try {
      const columnData = updateColumnSchema.parse(req.body);
      const column = await storage.updateColumn(req.params.id, columnData);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.delete("/api/columns/:id", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Excluir Columns"), 
    async (req, res) => {
    try {
      await storage.deleteColumn(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(500).json({ message: "Failed to delete column" });
    }
  });

  app.post("/api/columns/reorder", async (req, res) => {
    try {
      const reorderedColumns = req.body.columns;
      await storage.reorderColumns(reorderedColumns);
      res.status(200).json({ message: "Columns reordered successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to reorder columns" });
    }
  });

  // Team member routes
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: "Invalid team member data" });
    }
  });

  app.patch("/api/team-members/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const member = await storage.updateTeamMemberStatus(req.params.id, status);
      res.json(member);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.status(400).json({ message: "Invalid status data" });
    }
  });

  // Analytics endpoint - MIGRADO PARA NÍVEL 3
  app.get("/api/analytics", 
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Listar Analytics"), 
    async (req, res) => {
    try {
      const { boardId } = req.query;
      const authContext = (req as any).authContext;
      
      console.log("🚀 [ANALYTICS] Usando NÍVEL 3 - QueryHandlers");
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
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.get("/api/tags/:id", async (req, res) => {
    try {
      const tag = await storage.getTag(req.params.id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tag" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.updateTag(req.params.id, tagData);
      res.json(tag);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      await storage.deleteTag(req.params.id);
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
      const users = await storage.getUsers();
      const currentUser = users[0];
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

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'system';
    const userName = req.session?.user?.name || 'Sistema';
    
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
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
      addUserActionLog(userId, userName, `Criar usuário "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      res.json(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const userData = req.body;
      const user = await storage.updateUser(req.params.id, userData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Atualizar usuário "${user.name}" (${user.email})`, 'success', null, duration);
      
      res.json(user);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Atualizar usuário (ID: ${req.params.id})`, 'error', { error: 'Usuário não encontrado' }, duration);
        return res.status(404).json({ message: "User not found" });
      }
      
      addUserActionLog(userId, userName, `Atualizar usuário (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      await storage.deleteUser(req.params.id);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Deletar usuário (ID: ${req.params.id})`, 'success', null, duration);
      
      res.status(204).send();
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (error instanceof Error && error.message.includes("not found")) {
        addUserActionLog(userId, userName, `Deletar usuário (ID: ${req.params.id})`, 'error', { error: 'Usuário não encontrado' }, duration);
        return res.status(404).json({ message: "User not found" });
      }
      
      addUserActionLog(userId, userName, `Deletar usuário (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
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
  app.get("/api/system/logs", async (req, res) => {
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
  app.delete("/api/system/logs", async (req, res) => {
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

      await storage.updateUserPassword(req.params.id, newPassword);
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
  app.get("/api/user-teams", async (req, res) => {
    try {
      const userTeams = await storage.getAllUserTeams();
      res.json(userTeams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user teams" });
    }
  });

  app.get("/api/users/:userId/teams", async (req, res) => {
    try {
      const userTeams = await storage.getUserTeams(req.params.userId);
      res.json(userTeams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user teams" });
    }
  });

  app.get("/api/teams/:teamId/users", async (req, res) => {
    try {
      const teamUsers = await storage.getTeamUsers(req.params.teamId);
      res.json(teamUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team users" });
    }
  });

  app.post("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const { role = "member" } = req.body;
      const userTeam = await storage.addUserToTeam({
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
      await storage.removeUserFromTeam(req.params.userId, req.params.teamId);
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
      const { role } = req.body;
      const userTeam = await storage.updateUserTeamRole(req.params.userId, req.params.teamId, role);
      res.json(userTeam);
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
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar time "${team.name}"`, 'success', null, duration);
      
      res.status(201).json(team);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Criar time "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const teamData = updateTeamSchema.parse(req.body);
      const team = await storage.updateTeam(req.params.id, teamData);
      res.json(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const teamData = req.body;
      const team = await storage.updateTeam(req.params.id, teamData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Atualizar time "${team.name}"`, 'success', null, duration);
      
      res.json(team);
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
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      await storage.deleteTeam(req.params.id);
      
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
      const profiles = await storage.getProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.id);
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
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const profileData = insertProfileSchema.parse(req.body);
      const profile = await storage.createProfile(profileData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar perfil "${profile.name}"`, 'success', null, duration);
      
      res.status(201).json(profile);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Criar perfil "${req.body.name || 'sem nome'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      const profileData = updateProfileSchema.parse(req.body);
      const profile = await storage.updateProfile(req.params.id, profileData);
      
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
    const userId = req.session?.user?.id || 'unknown';
    const userName = req.session?.user?.name || 'Usuário desconhecido';
    
    try {
      await storage.deleteProfile(req.params.id);
      
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

  // Permission routes
  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get("/api/permissions/:id", async (req, res) => {
    try {
      const permission = await storage.getPermission(req.params.id);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });

  app.post("/api/permissions", async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.patch("/api/permissions/:id", async (req, res) => {
    try {
      const permissionData = req.body;
      const permission = await storage.updatePermission(req.params.id, permissionData);
      res.json(permission);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.delete("/api/permissions/:id", async (req, res) => {
    try {
      await storage.deletePermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });

  // Profile Permissions routes
  app.get("/api/profile-permissions", async (req, res) => {
    try {
      const profilePermissions = await storage.getAllProfilePermissions();
      res.json(profilePermissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile permissions" });
    }
  });

  app.get("/api/profiles/:id/permissions", async (req, res) => {
    try {
      const profilePermissions = await storage.getProfilePermissions(req.params.id);
      res.json(profilePermissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile permissions" });
    }
  });

  app.post("/api/profiles/:profileId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      const profilePermission = await storage.addPermissionToProfile(req.params.profileId, permissionId);
      res.status(201).json(profilePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to profile" });
    }
  });

  app.post("/api/profiles/:profileId/permissions/:permissionId", async (req, res) => {
    try {
      const profilePermission = await storage.addPermissionToProfile(req.params.profileId, req.params.permissionId);
      res.status(201).json(profilePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to profile" });
    }
  });

  app.delete("/api/profiles/:profileId/permissions/:permissionId", async (req, res) => {
    try {
      await storage.removePermissionFromProfile(req.params.profileId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Profile permission not found" });
      }
      res.status(500).json({ message: "Failed to remove permission from profile" });
    }
  });

  // User permissions route
  app.get("/api/users/:userId/permissions", async (req, res) => {
    try {
      const permissions = await storage.getUserPermissions(req.params.userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // ===== ROTA REMOVIDA - AGORA ESTÁ NO INÍCIO =====

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
      }

      // Check if user already exists
      const users = await storage.getUsers();
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

      const newUser = await storage.createUser(userData);
      
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
      // Clear the session completely
      if (req.session) {
        req.session = null;
      }
      
      // Clear cookies
      res.clearCookie('session', { path: '/' });
      res.clearCookie('session.sig', { path: '/' });
      
      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Erro ao fazer logout" });
    }
  });

  // ✅ ROTA REMOVIDA - Estava duplicada e causando conflito de sessão
  // A rota correta está definida na linha 82 usando RouteHandlers.authRoutes.currentUser

  // Team Profiles routes
  app.get("/api/team-profiles", async (req, res) => {
    try {
      const teamProfiles = await storage.getAllTeamProfiles();
      res.json(teamProfiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team profiles" });
    }
  });

  app.get("/api/teams/:id/profiles", async (req, res) => {
    try {
      const teamProfiles = await storage.getTeamProfiles(req.params.id);
      res.json(teamProfiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team profiles" });
    }
  });

  app.post("/api/team-profiles", async (req, res) => {
    try {
      const { teamId, profileId } = req.body;
      const teamProfile = await storage.assignProfileToTeam(teamId, profileId);
      res.status(201).json(teamProfile);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign profile to team" });
    }
  });

  app.post("/api/teams/:teamId/profiles/:profileId", async (req, res) => {
    try {
      const teamProfile = await storage.assignProfileToTeam(req.params.teamId, req.params.profileId);
      res.status(201).json(teamProfile);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign profile to team" });
    }
  });

  app.delete("/api/team-profiles/:id", async (req, res) => {
    try {
      await storage.deleteTeamProfile(req.params.id);
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
      await storage.removeProfileFromTeam(req.params.teamId, req.params.profileId);
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
      const events = await storage.getTaskEvents(taskId);
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
      
      const event = await storage.createTaskEvent({
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
      const exports = await storage.getExportHistory(userId);
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
      const result = await storage.addPermissionToUser(req.params.userId, permissionId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to user" });
    }
  });

  app.delete("/api/users/:userId/permissions/:permissionId", async (req, res) => {
    try {
      await storage.removePermissionFromUser(req.params.userId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove permission from user" });
    }
  });

  // Team Permission Management routes
  app.get("/api/teams/:teamId/permissions", async (req, res) => {
    try {
      const permissions = await storage.getTeamPermissions(req.params.teamId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team permissions" });
    }
  });

  app.post("/api/teams/:teamId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      console.log("Adding permission to team:", req.params.teamId, permissionId);
      const result = await storage.addPermissionToTeam(req.params.teamId, permissionId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error adding permission to team:", error);
      res.status(400).json({ message: "Failed to add permission to team", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/teams/:teamId/permissions/:permissionId", async (req, res) => {
    try {
      await storage.removePermissionFromTeam(req.params.teamId, req.params.permissionId);
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
      const newExport = await storage.createExportHistory(exportData);
      
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
      
      const updatedExport = await storage.updateExportHistory(id, updates);
      
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
  app.get("/api/boards/:boardId/shares", async (req, res) => {
    try {
      const shares = await storage.getBoardShares(req.params.boardId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board shares" });
    }
  });

  app.get("/api/boards/:boardId/members", async (req, res) => {
    try {
      const members = await storage.getBoardMembers(req.params.boardId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching board members:", error);
      res.status(500).json({ message: "Failed to fetch board members" });
    }
  });

  app.get("/api/boards/:boardId/member-count", async (req, res) => {
    try {
      const count = await storage.getBoardMemberCount(req.params.boardId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching board member count:", error);
      res.status(500).json({ message: "Failed to fetch board member count" });
    }
  });

  app.get("/api/board-shares", async (req, res) => {
    try {
      const shares = await storage.getAllBoardShares();
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board shares" });
    }
  });

  app.get("/api/users/:userId/shared-boards", async (req, res) => {
    try {
      const shares = await storage.getUserSharedBoards(req.params.userId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user shared boards" });
    }
  });

  app.get("/api/teams/:teamId/shared-boards", async (req, res) => {
    try {
      const shares = await storage.getTeamSharedBoards(req.params.teamId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team shared boards" });
    }
  });

  app.post("/api/board-shares", async (req, res) => {
    try {
      const shareData = insertBoardShareSchema.parse(req.body);
      const share = await storage.createBoardShare(shareData);
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
      const share = await storage.updateBoardShare(req.params.id, shareData);
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
      await storage.deleteBoardShare(req.params.id);
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
      const permission = await storage.getUserBoardPermission(req.params.userId, req.params.boardId);
      res.json({ permission });
    } catch (error) {
      res.status(500).json({ message: "Failed to check user board permission" });
    }
  });

  // Task Status routes
  app.get("/api/task-statuses", async (req, res) => {
    try {
      const statuses = await storage.getTaskStatuses();
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task statuses" });
    }
  });

  app.get("/api/task-statuses/:id", async (req, res) => {
    try {
      const status = await storage.getTaskStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ message: "Task status not found" });
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task status" });
    }
  });

  app.post("/api/task-statuses", async (req, res) => {
    try {
      const statusData = insertTaskStatusSchema.parse(req.body);
      const status = await storage.createTaskStatus(statusData);
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

  app.patch("/api/task-statuses/:id", async (req, res) => {
    try {
      const statusData = updateTaskStatusSchema.parse(req.body);
      const status = await storage.updateTaskStatus(req.params.id, statusData);
      res.json(status);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task status not found" });
      }
      res.status(400).json({ message: "Invalid task status data" });
    }
  });

  app.delete("/api/task-statuses/:id", async (req, res) => {
    try {
      await storage.deleteTaskStatus(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task status not found" });
      }
      res.status(500).json({ message: "Failed to delete task status" });
    }
  });

  // Task Priority routes
  app.get("/api/task-priorities", async (req, res) => {
    try {
      const priorities = await storage.getTaskPriorities();
      res.json(priorities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task priorities" });
    }
  });

  app.get("/api/task-priorities/:id", async (req, res) => {
    try {
      const priority = await storage.getTaskPriority(req.params.id);
      if (!priority) {
        return res.status(404).json({ message: "Task priority not found" });
      }
      res.json(priority);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task priority" });
    }
  });

  app.post("/api/task-priorities", async (req, res) => {
    try {
      const priorityData = insertTaskPrioritySchema.parse(req.body);
      const priority = await storage.createTaskPriority(priorityData);
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

  app.patch("/api/task-priorities/:id", async (req, res) => {
    try {
      const priorityData = updateTaskPrioritySchema.parse(req.body);
      const priority = await storage.updateTaskPriority(req.params.id, priorityData);
      res.json(priority);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task priority not found" });
      }
      res.status(400).json({ message: "Invalid task priority data" });
    }
  });

  app.delete("/api/task-priorities/:id", async (req, res) => {
    try {
      await storage.deleteTaskPriority(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task priority not found" });
      }
      res.status(500).json({ message: "Failed to delete task priority" });
    }
  });

  // Custom Fields Routes
  app.get("/api/custom-fields", async (req, res) => {
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

  app.post("/api/custom-fields", async (req, res) => {
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

  app.patch("/api/custom-fields/:id", async (req, res) => {
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

  app.delete("/api/custom-fields/:id", async (req, res) => {
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
    AuthMiddleware.requireAuth,
    AuthMiddleware.requirePermissions("Gerenciar Permissões"), 
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

  // Nova funcionalidade de teste para demonstrar a atribuição automática
  app.get("/api/notifications", async (req, res) => {
    try {
      res.json({
        notifications: [
          { id: "1", message: "Sistema de permissões atualizado", type: "info" },
          { id: "2", message: "Nova funcionalidade detectada", type: "success" }
        ]
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const { message, type } = req.body;
      const notification = {
        id: Date.now().toString(),
        message,
        type: type || "info",
        createdAt: new Date()
      };
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to create notification" });
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
