/**
 * 🌐 ROUTES REFATORADAS - Nova Arquitetura de Camadas
 * 
 * ARQUITETURA LIMPA:
 * Routes -> Services (única interface pública) -> DatabaseStorage (DAO) -> Database
 * 
 * RESPONSABILIDADES:
 * - Routes: apenas roteamento e transformação HTTP
 * - Services: lógica de negócio e única camada de persistência pública  
 * - DatabaseStorage: DAO puro (acesso a dados)
 * 
 * ELIMINAÇÃO DE DUPLICIDADES:
 * ✅ Routes NÃO chamam storage direto
 * ✅ Routes NÃO chamam CommandHandlers/QueryHandlers direto
 * ✅ Routes chamam APENAS Services
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { AuthMiddleware } from './microservices/authService';

// 🎯 ÚNICA IMPORTAÇÃO NECESSÁRIA: Services
import { 
  boardService, 
  taskService,
  type BoardCreateRequest,
  type BoardUpdateRequest,
  type TaskCreateRequest,
  type TaskUpdateRequest
} from './services';

export async function registerRoutesRefactored(app: Express): Promise<Server> {

  // ===== BOARD ROUTES - Via BoardService =====
  
  /**
   * GET /api/boards - Listar boards
   */
  app.get("/api/boards", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const boards = await boardService.getBoards(authContext, { page, limit });
      
      res.json({
        success: true,
        data: boards,
        pagination: {
          page,
          limit,
          total: boards.length,
        }
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro listando boards:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * GET /api/boards/:id - Obter board específico
   */
  app.get("/api/boards/:id", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const board = await boardService.getBoard(authContext, id);
      
      if (!board) {
        return res.status(404).json({
          success: false,
          error: 'Board não encontrado'
        });
      }
      
      res.json({
        success: true,
        data: board
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro obtendo board:', error);
      res.status(error.message.includes('Acesso negado') ? 403 : 500).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * POST /api/boards - Criar novo board
   */
  app.post("/api/boards", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const requestData: BoardCreateRequest = req.body;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const board = await boardService.createBoard(authContext, requestData);
      
      res.status(201).json({
        success: true,
        data: board,
        message: 'Board criado com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro criando board:', error);
      res.status(error.message.includes('Permissão') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * PUT /api/boards/:id - Atualizar board
   */
  app.put("/api/boards/:id", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      const updateData: BoardUpdateRequest = req.body;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const board = await boardService.updateBoard(authContext, id, updateData);
      
      res.json({
        success: true,
        data: board,
        message: 'Board atualizado com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro atualizando board:', error);
      res.status(error.message.includes('não encontrado') ? 404 : 
                error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * DELETE /api/boards/:id - Excluir board
   */
  app.delete("/api/boards/:id", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      await boardService.deleteBoard(authContext, id);
      
      res.json({
        success: true,
        message: 'Board excluído com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro excluindo board:', error);
      res.status(error.message.includes('não encontrado') ? 404 : 
                error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  // ===== TASK ROUTES - Via TaskService =====

  /**
   * GET /api/boards/:boardId/tasks - Listar tasks do board
   */
  app.get("/api/boards/:boardId/tasks", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { boardId } = req.params;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const tasks = await taskService.getBoardTasks(authContext, boardId);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro listando tasks:', error);
      res.status(error.message.includes('Acesso negado') ? 403 : 500).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * GET /api/tasks/:id - Obter task específica
   */
  app.get("/api/tasks/:id", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const task = await taskService.getTask(authContext, id);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task não encontrada'
        });
      }
      
      res.json({
        success: true,
        data: task
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro obtendo task:', error);
      res.status(error.message.includes('Acesso negado') ? 403 : 500).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * POST /api/tasks - Criar nova task
   */
  app.post("/api/tasks", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const requestData: TaskCreateRequest = req.body;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const task = await taskService.createTask(authContext, requestData);
      
      res.status(201).json({
        success: true,
        data: task,
        message: 'Task criada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro criando task:', error);
      res.status(error.message.includes('Permissão') || error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * PUT /api/tasks/:id - Atualizar task
   */
  app.put("/api/tasks/:id", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      const updateData: TaskUpdateRequest = req.body;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const task = await taskService.updateTask(authContext, id, updateData);
      
      res.json({
        success: true,
        data: task,
        message: 'Task atualizada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro atualizando task:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 
                error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * DELETE /api/tasks/:id - Excluir task
   */
  app.delete("/api/tasks/:id", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      await taskService.deleteTask(authContext, id);
      
      res.json({
        success: true,
        message: 'Task excluída com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro excluindo task:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 
                error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * PATCH /api/tasks/:id/status - Alterar status da task
   */
  app.patch("/api/tasks/:id/status", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      const { status } = req.body;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const task = await taskService.updateTaskStatus(authContext, id, status);
      
      res.json({
        success: true,
        data: task,
        message: 'Status da task atualizado com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro alterando status da task:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 
                error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  /**
   * PATCH /api/tasks/:id/assign - Atribuir task
   */
  app.patch("/api/tasks/:id/assign", AuthMiddleware.requireAuth, async (req, res) => {
    try {
      const authContext = (req as any).authContext;
      const { id } = req.params;
      const { assigneeId } = req.body;
      
      // 🎯 CHAMADA ÚNICA AO SERVICE
      const task = await taskService.assignTask(authContext, id, assigneeId);
      
      res.json({
        success: true,
        data: task,
        message: 'Task atribuída com sucesso'
      });
    } catch (error: any) {
      console.error('❌ [ROUTES] Erro atribuindo task:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 
                error.message.includes('Acesso negado') ? 403 : 400).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  });

  // HTTP Server setup
  const httpServer = createServer(app);
  return httpServer;
}

/**
 * 📋 COMPARAÇÃO: ANTES vs DEPOIS
 * 
 * ❌ ANTES (arquitetura problemática):
 * - Routes chamavam storage direto
 * - Routes chamavam CommandHandlers direto  
 * - Routes chamavam QueryHandlers direto
 * - Duplicação entre Services e DatabaseStorage
 * - Múltiplas camadas fazendo persistência
 * 
 * ✅ DEPOIS (arquitetura limpa):
 * - Routes chamam APENAS Services
 * - Services são a única interface pública
 * - DatabaseStorage é DAO puro (usado apenas pelos Services)
 * - Eliminação completa de duplicidades
 * - Responsabilidades bem definidas
 */