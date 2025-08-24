import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertBoardSchema, updateBoardSchema, insertTaskSchema, updateTaskSchema, insertColumnSchema, updateColumnSchema, insertTeamMemberSchema, insertTagSchema, insertTeamSchema, updateTeamSchema, insertUserSchema, updateUserSchema, insertProfileSchema, updateProfileSchema, insertPermissionSchema, insertProfilePermissionSchema, insertTeamProfileSchema, insertBoardShareSchema, updateBoardShareSchema, insertTaskStatusSchema, updateTaskStatusSchema, insertTaskPrioritySchema, updateTaskPrioritySchema, insertTaskAssigneeSchema } from "@shared/schema";
import { sendWelcomeEmail, sendNotificationEmail } from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const startTime = Date.now();
    const userId = req.body.createdBy || "system";
    const userName = req.body.createdByName || "Sistema";
    
    try {
      console.log("🚀 API: Creating task with data:", req.body);
      const taskData = insertTaskSchema.parse(req.body);
      console.log("✅ API: Parsed task data:", taskData);
      
      const task = await storage.createTask(taskData);
      console.log("✅ API: Task created successfully, returning:", task);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Criar tarefa "${task.title}"`, 'success', null, duration);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("❌ API: Error creating task:", error);
      
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Criar tarefa "${req.body.title || 'sem título'}"`, 'error', { error: errorMessage, details: error }, duration);
      
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Invalid task data", 
          error: error.message 
        });
      } else {
        res.status(400).json({ message: "Invalid task data" });
      }
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.body.updatedBy || "system";
    const userName = req.body.updatedByName || "Sistema";
    
    try {
      const taskData = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, taskData);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Atualizar tarefa "${task.title}"`, 'success', null, duration);
      
      res.json(task);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Atualizar tarefa (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const startTime = Date.now();
    const userId = req.query.deletedBy as string || "system";
    const userName = req.query.deletedByName as string || "Sistema";
    
    try {
      await storage.deleteTask(req.params.id);
      
      const duration = Date.now() - startTime;
      addUserActionLog(userId, userName, `Deletar tarefa (ID: ${req.params.id})`, 'success', null, duration);
      
      res.status(204).send();
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      addUserActionLog(userId, userName, `Deletar tarefa (ID: ${req.params.id})`, 'error', { error: errorMessage, details: error }, duration);
      
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(500).json({ message: "Failed to delete task" });
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

  // Board routes
  app.get("/api/boards", async (req, res) => {
    try {
      const boards = await storage.getBoards();
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch boards" });
    }
  });

  app.get("/api/boards/:id", async (req, res) => {
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

  app.post("/api/boards", async (req, res) => {
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

  app.patch("/api/boards/:id", async (req, res) => {
    try {
      const boardData = updateBoardSchema.parse(req.body);
      const board = await storage.updateBoard(req.params.id, boardData);
      res.json(board);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(400).json({ message: "Invalid board data" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      await storage.deleteBoard(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(500).json({ message: "Failed to delete board" });
    }
  });

  // Board-specific tasks and columns routes
  app.get("/api/boards/:boardId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getBoardTasks(req.params.boardId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching board tasks:", error);
      res.status(500).json({ message: "Failed to fetch board tasks" });
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

  // Column routes
  app.get("/api/columns", async (req, res) => {
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

  app.post("/api/columns", async (req, res) => {
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

  app.patch("/api/columns/:id", async (req, res) => {
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

  app.delete("/api/columns/:id", async (req, res) => {
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

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const columns = await storage.getColumns();
      
      // Calculate basic metrics
      const doneTasks = tasks.filter(task => task.status === "done");
      const inProgressTasks = tasks.filter(task => task.status === "inprogress");
      const totalTasks = tasks.length;
      
      
      // Calculate efficiency
      const efficiency = totalTasks > 0 ? 
        Math.round((doneTasks.length / totalTasks) * 100) : 0;
      
      // Count blockers (tasks that haven't moved in a while or high priority in progress)
      const blockers = inProgressTasks.filter(task => 
        task.priority === "high" && task.progress < 50
      ).length;
      
      res.json({
        efficiency,
        blockers,
        totalTasks,
        doneTasks: doneTasks.length,
        inProgressTasks: inProgressTasks.length,
      });
    } catch (error) {
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
    const userId = req.session?.userId || 'system';
    const userName = req.session?.userName || 'Sistema';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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

  // Sistema de Logs
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
    
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
    const statusEmoji = status === 'success' ? '🟢' : status === 'error' ? '🔴' : '🟡';
    originalConsoleLog(`${emoji} [USER_ACTION] ${userName} → ${action} ${statusEmoji}${duration ? ` (${duration}ms)` : ''}`, errorDetails ? errorDetails : '');
  };

  // Endpoint para obter logs
  app.get("/api/system/logs", async (req, res) => {
    try {
      const { level, type, limit = "100" } = req.query;
      let filteredLogs = systemLogs;
      
      if (level && typeof level === 'string') {
        filteredLogs = filteredLogs.filter(log => log.level === level);
      }
      
      if (type && typeof type === 'string') {
        filteredLogs = filteredLogs.filter(log => log.actionType === type);
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
      addLog('info', 'Logs do sistema foram limpos', 'ADMIN');
      res.json({ message: "Logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear logs" });
    }
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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

  // Current user route (simulando usuário logado)
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user by email
      const users = await storage.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Check password if user has one (for backward compatibility)
      if (user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Email ou senha incorretos" });
        }
      }
      // If no password set, accept any password (backward compatibility)
      
      // Store user info in session (simple session management)
      req.session = req.session || {};
      req.session.userId = user.id;
      req.session.userName = user.name;
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        profileId: user.profileId
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

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

  app.get("/api/auth/current-user", async (req, res) => {
    try {
      // Check if user is logged in via session
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const users = await storage.getUsers();
      const currentUser = users.find(u => u.id === userId);
      
      if (!currentUser) {
        req.session = null;
        return res.status(401).json({ message: "User not found" });
      }
      res.json(currentUser);
    } catch (error) {
      console.error("Current user error:", error);
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  });

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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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
    const userId = req.session?.userId || 'unknown';
    const userName = req.session?.userName || 'Usuário desconhecido';
    
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

  const httpServer = createServer(app);
  return httpServer;
}
