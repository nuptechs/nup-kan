/**
 * 📋 TASK SERVICE - Gerenciamento de Tarefas
 * 
 * Responsabilidades:
 * - CRUD completo de tasks com validação
 * - Lógica de negócio (status, prioridades, assignees)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de tasks
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { Task, InsertTask, UpdateTask } from "@shared/schema";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { TTL } from "../../cache";
import { PERMISSIONS } from "../config/permissions";
import { Logger } from '../utils/logMessages';

export interface TaskCreateRequest {
  boardId: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  progress?: number;
  tags?: string[];
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  progress?: number;
  tags?: string[];
}

export interface TaskWithDetails extends Task {
  assigneeName: string | null;
  assigneeAvatar: string | null;
  boardName?: string;
  columnTitle?: string;
  recentActivity: Array<{
    action: string;
    timestamp: Date | null;
    userId: string;
    userName: string;
  }>;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
    canChangeStatus: boolean;
  };
}

export class TaskService extends BaseService {

  /**
   * Listar tasks de um board específico
   */
  async getBoardTasks(authContext: AuthContext, boardId: string, options: PaginationOptions = {}): Promise<TaskWithDetails[]> {
    this.log('task-service', 'getBoardTasks', { userId: authContext.userId, boardId });
    
    try {
      // Verificar permissões
      this.requirePermission(authContext, PERMISSIONS.TASKS.LIST, 'list tasks');

      // Verificar acesso ao board
      const boardAccess = await this.checkBoardAccess(authContext.userId, boardId);
      if (!boardAccess) {
        throw new Error('Acesso negado ao board solicitado');
      }

      // Tentar cache primeiro
      const cacheKey = `board_tasks:${boardId}:user:${authContext.userId}`;
      const cached = await this.cache.get<TaskWithDetails[]>(cacheKey);
      if (cached) {
        this.log('task-service', 'cache hit', { cacheKey });
        return cached;
      }

      // Buscar tasks do DAO
      const tasks = await this.storage.getBoardTasks(boardId);
      
      // Enriquecer com detalhes e permissões
      const enrichedTasks: TaskWithDetails[] = await Promise.all(
        tasks.map(async (task) => {
          // Buscar informações do assignee
          const assigneeInfo = await this.getAssigneeInfo(task.assigneeId);
          
          // Buscar nome do board
          const board = await this.storage.getBoard(boardId);
          
          // Calcular permissões
          const permissions = this.calculateTaskPermissions(authContext, task);

          return {
            ...task,
            assigneeName: assigneeInfo?.name || null,
            assigneeAvatar: assigneeInfo?.avatar || null,
            boardName: board?.name || 'Board',
            columnTitle: task.status, // Por enquanto usa o status como nome da coluna
            recentActivity: [{
              action: 'created',
              timestamp: task.createdAt,
              userId: (task as any).createdById || '',
              userName: 'User',
            }],
            permissions,
          };
        })
      );

      // Cache por 1 minuto
      await this.cache.set(cacheKey, enrichedTasks, TTL.SHORT / 2);
      
      this.log('task-service', 'tasks retrieved', { count: enrichedTasks.length });
      return enrichedTasks;

    } catch (error) {
      this.logError('task-service', 'getBoardTasks', error);
      throw error;
    }
  }

  /**
   * Obter uma task específica por ID
   */
  async getTask(authContext: AuthContext, taskId: string): Promise<TaskWithDetails | null> {
    this.log('task-service', 'getTask', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.VIEW, 'view task');

      // Tentar cache primeiro
      const cacheKey = `task:${taskId}:full`;
      const cached = await this.cache.get<TaskWithDetails>(cacheKey);
      if (cached) {
        return cached;
      }

      // Buscar task básica
      const task = await this.storage.getTask(taskId);
      if (!task) {
        return null;
      }

      // Verificar acesso ao board da task
      const boardAccess = await this.checkBoardAccess(authContext.userId, task.boardId);
      if (!boardAccess) {
        throw new Error('Acesso negado à task solicitada');
      }

      // Enriquecer com dados completos
      const [assigneeInfo, board] = await Promise.all([
        this.getAssigneeInfo(task.assigneeId),
        this.storage.getBoard(task.boardId),
      ]);

      const permissions = this.calculateTaskPermissions(authContext, task);

      const enrichedTask: TaskWithDetails = {
        ...task,
        assigneeName: assigneeInfo?.name || null,
        assigneeAvatar: assigneeInfo?.avatar || null,
        boardName: board?.name || 'Board',
        columnTitle: task.status,
        recentActivity: [{
          action: 'created',
          timestamp: task.createdAt,
          userId: (task as any).createdById || '',
          userName: 'User',
        }],
        permissions,
      };

      // Cache por 5 minutos
      await this.cache.set(cacheKey, enrichedTask, TTL.MEDIUM);
      
      return enrichedTask;

    } catch (error) {
      this.logError('task-service', 'getTask', error);
      throw error;
    }
  }

  /**
   * Criar nova task
   */
  async createTask(authContext: AuthContext, request: TaskCreateRequest): Promise<Task> {
    this.log('task-service', 'createTask', { userId: authContext.userId, title: request.title });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.CREATE, 'create tasks');

      // Verificar acesso ao board
      const boardAccess = await this.checkBoardAccess(authContext.userId, request.boardId);
      if (!boardAccess) {
        throw new Error('Acesso negado ao board');
      }

      // Validar dados
      const validData = insertTaskSchema.parse({
        boardId: request.boardId,
        title: request.title,
        description: request.description || '',
        status: request.status,
        priority: request.priority,
        assigneeId: request.assigneeId || '',
        progress: request.progress || 0,
        tags: request.tags || [],
        createdById: authContext.userId,
      });

      // Criar task via DAO
      const task = await this.storage.createTask(validData);

      // Invalidar caches
      await this.invalidateCache([
        `board_tasks:${request.boardId}:*`,
        `task:${task.id}:*`,
        'analytics:*'
      ]);

      // Emitir evento tipado
      await this.emitEvent('task.created', {
        task,
        boardId: request.boardId,
        userId: authContext.userId,
      });

      this.log('task-service', 'task created successfully', { taskId: task.id });
      return task;

    } catch (error) {
      this.logError('task-service', 'createTask', error);
      throw error;
    }
  }

  /**
   * Atualizar task existente
   */
  async updateTask(authContext: AuthContext, taskId: string, request: TaskUpdateRequest): Promise<Task> {
    this.log('task-service', 'updateTask', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'edit tasks');

      // Verificar se task existe
      const existingTask = await this.storage.getTask(taskId);
      if (!existingTask) {
        throw new Error('Task não encontrada');
      }

      // Verificar acesso ao board
      const boardAccess = await this.checkBoardAccess(authContext.userId, existingTask.boardId);
      if (!boardAccess) {
        throw new Error('Acesso negado à task');
      }

      // Validar dados de atualização
      const validData = updateTaskSchema.parse(request);
      
      // Atualizar via DAO
      const updatedTask = await this.storage.updateTask(taskId, validData);

      // Invalidar caches
      await this.invalidateCache([
        `task:${taskId}:*`,
        `board_tasks:${existingTask.boardId}:*`,
        'analytics:*'
      ]);

      // Emitir evento tipado
      await this.emitEvent('task.updated', {
        taskId,
        task: updatedTask,
        changes: validData,
        userId: authContext.userId,
      });

      this.log('task-service', 'task updated successfully', { taskId });
      return updatedTask;

    } catch (error) {
      this.logError('task-service', 'updateTask', error);
      throw error;
    }
  }

  /**
   * Excluir task
   */
  async deleteTask(authContext: AuthContext, taskId: string): Promise<void> {
    this.log('task-service', 'deleteTask', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.DELETE, 'delete tasks');

      // Verificar se task existe
      const task = await this.storage.getTask(taskId);
      if (!task) {
        throw new Error('Task não encontrada');
      }

      // Verificar acesso ao board
      const boardAccess = await this.checkBoardAccess(authContext.userId, task.boardId);
      if (!boardAccess) {
        throw new Error('Acesso negado à task');
      }

      // Excluir via DAO
      await this.storage.deleteTask(taskId);

      // Invalidar todos os caches relacionados
      await this.invalidateCache([
        `task:${taskId}:*`,
        `board_tasks:${task.boardId}:*`,
        'analytics:*'
      ]);

      // Emitir evento tipado
      await this.emitEvent('task.deleted', {
        taskId,
        task,
        boardId: task.boardId,
        userId: authContext.userId,
      });

      this.log('task-service', 'task deleted successfully', { taskId });

    } catch (error) {
      this.logError('task-service', 'deleteTask', error);
      throw error;
    }
  }

  /**
   * Alterar status da task
   */
  async updateTaskStatus(authContext: AuthContext, taskId: string, newStatus: string): Promise<Task> {
    this.log('task-service', 'updateTaskStatus', { userId: authContext.userId, taskId, newStatus });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'edit task status');

      return this.updateTask(authContext, taskId, { status: newStatus });

    } catch (error) {
      this.logError('task-service', 'updateTaskStatus', error);
      throw error;
    }
  }

  /**
   * Listar todas as tasks (sem filtro de board)
   */
  async getAllTasks(authContext: AuthContext, options: PaginationOptions = {}): Promise<TaskWithDetails[]> {
    this.log('task-service', 'getAllTasks', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.LIST, 'list tasks');

      // Buscar todas as tasks do DAO
      const tasks = await this.storage.getTasks();
      
      // Enriquecer com detalhes
      const enrichedTasks: TaskWithDetails[] = await Promise.all(
        tasks.map(async (task) => {
          const assigneeInfo = await this.getAssigneeInfo(task.assigneeId);
          
          return {
            ...task,
            assigneeName: assigneeInfo?.name || null,
            assigneeAvatar: assigneeInfo?.avatar || null,
            recentActivity: [], // Pode ser implementado depois
            permissions: {
              canEdit: this.hasPermission(authContext, 'Edit Tasks'),
              canDelete: this.hasPermission(authContext, 'Delete Tasks'),
              canAssign: this.hasPermission(authContext, 'Edit Tasks'),
              canChangeStatus: this.hasPermission(authContext, 'Edit Tasks'),
            }
          };
        })
      );

      return enrichedTasks;
    } catch (error) {
      this.logError('task-service', 'getAllTasks', error);
      throw error;
    }
  }

  /**
   * Obter assignees de uma task
   */
  async getTaskAssignees(authContext: AuthContext, taskId: string): Promise<any[]> {
    this.log('task-service', 'getTaskAssignees', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.VIEW, 'view assignees');
      return await this.storage.getTaskAssignees(taskId);
    } catch (error) {
      this.logError('task-service', 'getTaskAssignees', error);
      throw error;
    }
  }

  /**
   * Adicionar assignee a uma task
   */
  async addTaskAssignee(authContext: AuthContext, taskId: string, userId: string): Promise<any> {
    this.log('task-service', 'addTaskAssignee', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'add assignee');
      return await this.storage.addTaskAssignee({ taskId, userId });
    } catch (error) {
      this.logError('task-service', 'addTaskAssignee', error);
      throw error;
    }
  }

  /**
   * Remover assignee de uma task
   */
  async removeTaskAssignee(authContext: AuthContext, taskId: string, userId: string): Promise<void> {
    this.log('task-service', 'removeTaskAssignee', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'remove assignee');
      return await this.storage.removeTaskAssignee(taskId, userId);
    } catch (error) {
      this.logError('task-service', 'removeTaskAssignee', error);
      throw error;
    }
  }

  /**
   * Definir assignees de uma task
   */
  async setTaskAssignees(authContext: AuthContext, taskId: string, userIds: string[]): Promise<void> {
    this.log('task-service', 'setTaskAssignees', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'set assignees');
      return await this.storage.setTaskAssignees(taskId, userIds);
    } catch (error) {
      this.logError('task-service', 'setTaskAssignees', error);
      throw error;
    }
  }

  /**
   * Reordenar tasks
   */
  async reorderTasks(authContext: AuthContext, reorderedTasks: { id: string; position: number }[]): Promise<void> {
    this.log('task-service', 'reorderTasks', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'reorder tasks');
      return await this.storage.reorderTasks(reorderedTasks);
    } catch (error) {
      this.logError('task-service', 'reorderTasks', error);
      throw error;
    }
  }

  /**
   * Atribuir task para usuário
   */
  async assignTask(authContext: AuthContext, taskId: string, assigneeId: string): Promise<Task> {
    this.log('task-service', 'assignTask', { userId: authContext.userId, taskId, assigneeId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'atribuir tasks');

      return this.updateTask(authContext, taskId, { assigneeId });

    } catch (error) {
      this.logError('task-service', 'assignTask', error);
      throw error;
    }
  }

  // === MÉTODOS PRIVADOS DE APOIO ===

  private async getAssigneeInfo(assigneeId?: string | null) {
    if (!assigneeId) return null;

    try {
      const user = await this.storage.getUser(assigneeId);
      return user ? {
        name: user.name,
        avatar: user.avatar || '',
      } : null;
    } catch (error) {
      Logger.error.generic('TASK-SERVICE-ASSIGNEE', error);
      return null;
    }
  }

  private calculateTaskPermissions(authContext: AuthContext, task: Task) {
    return {
      canEdit: this.hasPermission(authContext, 'Edit Tasks'),
      canDelete: this.hasPermission(authContext, 'Excluir Tasks'),
      canAssign: this.hasPermission(authContext, 'Assign Members'),
      canChangeStatus: this.hasPermission(authContext, 'Edit Tasks'),
    };
  }

  private async checkBoardAccess(userId: string, boardId: string): Promise<boolean> {
    try {
      // Verificar se usuário é criador do board ou tem compartilhamento
      const board = await this.storage.getBoard(boardId);
      if (board?.createdById === userId) {
        return true;
      }

      const shares = await this.storage.getBoardShares(boardId);
      return shares.some(share => share.shareWithId === userId);
    } catch (error) {
      Logger.error.generic('TASK-SERVICE-BOARD-ACCESS', error);
      return false;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();