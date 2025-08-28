/**
 * 📊 TASK STATUS SERVICE - Gerenciamento de Status de Tasks
 * 
 * Responsabilidades:
 * - CRUD completo de status de tasks
 * - Lógica de negócio (transições, validações)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { TaskStatus, InsertTaskStatus, UpdateTaskStatus, TaskPriority, InsertTaskPriority, UpdateTaskPriority } from "@shared/schema";
import { insertTaskStatusSchema, updateTaskStatusSchema, insertTaskPrioritySchema, updateTaskPrioritySchema } from "@shared/schema";
import { TTL } from "../cache";

export interface TaskStatusCreateRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface TaskPriorityCreateRequest {
  name: string;
  level: number;
  color?: string;
  description?: string;
}

export class TaskStatusService extends BaseService {

  // Task Status methods
  async getTaskStatuses(authContext: AuthContext): Promise<TaskStatus[]> {
    this.log('task-status-service', 'getTaskStatuses', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Tarefas', 'listar status de tasks');

      const cacheKey = 'task_statuses:all';
      const cached = await this.cache.get<TaskStatus[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const statuses = await this.storage.getTaskStatuses();
      await this.cache.set(cacheKey, statuses, TTL.LONG);
      
      return statuses;
    } catch (error) {
      this.logError('task-status-service', 'getTaskStatuses', error);
      throw error;
    }
  }

  async getTaskStatus(authContext: AuthContext, statusId: string): Promise<TaskStatus | null> {
    this.log('task-status-service', 'getTaskStatus', { userId: authContext.userId, statusId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Tarefas', 'visualizar status');

      const status = await this.storage.getTaskStatus(statusId);
      return status || null;
    } catch (error) {
      this.logError('task-status-service', 'getTaskStatus', error);
      throw error;
    }
  }

  async createTaskStatus(authContext: AuthContext, request: TaskStatusCreateRequest): Promise<TaskStatus> {
    this.log('task-status-service', 'createTaskStatus', { userId: authContext.userId, name: request.name });
    
    try {
      this.requirePermission(authContext, 'Criar Tarefas', 'criar status de task');

      const validData = insertTaskStatusSchema.parse(request);
      const status = await this.storage.createTaskStatus(validData);

      await this.invalidateCache(['task_statuses:*']);

      this.emitEvent('task_status.created', {
        statusId: status.id,
        userId: authContext.userId,
        statusName: status.name,
      });

      return status;
    } catch (error) {
      this.logError('task-status-service', 'createTaskStatus', error);
      throw error;
    }
  }

  async updateTaskStatus(authContext: AuthContext, statusId: string, request: Partial<TaskStatusCreateRequest>): Promise<TaskStatus> {
    this.log('task-status-service', 'updateTaskStatus', { userId: authContext.userId, statusId });
    
    try {
      this.requirePermission(authContext, 'Editar Tarefas', 'editar status de task');

      const validData = updateTaskStatusSchema.parse(request);
      const status = await this.storage.updateTaskStatus(statusId, validData);

      await this.invalidateCache(['task_statuses:*']);

      this.emitEvent('task_status.updated', {
        statusId,
        userId: authContext.userId,
        changes: validData,
      });

      return status;
    } catch (error) {
      this.logError('task-status-service', 'updateTaskStatus', error);
      throw error;
    }
  }

  async deleteTaskStatus(authContext: AuthContext, statusId: string): Promise<void> {
    this.log('task-status-service', 'deleteTaskStatus', { userId: authContext.userId, statusId });
    
    try {
      this.requirePermission(authContext, 'Excluir Tasks', 'excluir status de task');

      await this.storage.deleteTaskStatus(statusId);

      await this.invalidateCache(['task_statuses:*']);

      this.emitEvent('task_status.deleted', {
        statusId,
        userId: authContext.userId,
      });

    } catch (error) {
      this.logError('task-status-service', 'deleteTaskStatus', error);
      throw error;
    }
  }

  // Task Priority methods
  async getTaskPriorities(authContext: AuthContext): Promise<TaskPriority[]> {
    this.log('task-status-service', 'getTaskPriorities', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Tasks', 'listar prioridades de tasks');

      const cacheKey = 'task_priorities:all';
      const cached = await this.cache.get<TaskPriority[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const priorities = await this.storage.getTaskPriorities();
      await this.cache.set(cacheKey, priorities, TTL.LONG);
      
      return priorities;
    } catch (error) {
      this.logError('task-status-service', 'getTaskPriorities', error);
      throw error;
    }
  }

  async getTaskPriority(authContext: AuthContext, priorityId: string): Promise<TaskPriority | null> {
    this.log('task-status-service', 'getTaskPriority', { userId: authContext.userId, priorityId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Tasks', 'visualizar prioridade');

      const priority = await this.storage.getTaskPriority(priorityId);
      return priority || null;
    } catch (error) {
      this.logError('task-status-service', 'getTaskPriority', error);
      throw error;
    }
  }

  async createTaskPriority(authContext: AuthContext, request: TaskPriorityCreateRequest): Promise<TaskPriority> {
    this.log('task-status-service', 'createTaskPriority', { userId: authContext.userId, name: request.name });
    
    try {
      this.requirePermission(authContext, 'Criar Tasks', 'criar prioridade de task');

      const validData = insertTaskPrioritySchema.parse(request);
      const priority = await this.storage.createTaskPriority(validData);

      await this.invalidateCache(['task_priorities:*']);

      this.emitEvent('task_priority.created', {
        priorityId: priority.id,
        userId: authContext.userId,
        priorityName: priority.name,
      });

      return priority;
    } catch (error) {
      this.logError('task-status-service', 'createTaskPriority', error);
      throw error;
    }
  }

  async updateTaskPriority(authContext: AuthContext, priorityId: string, request: Partial<TaskPriorityCreateRequest>): Promise<TaskPriority> {
    this.log('task-status-service', 'updateTaskPriority', { userId: authContext.userId, priorityId });
    
    try {
      this.requirePermission(authContext, 'Editar Tarefas', 'editar prioridade de task');

      const validData = updateTaskPrioritySchema.parse(request);
      const priority = await this.storage.updateTaskPriority(priorityId, validData);

      await this.invalidateCache(['task_priorities:*']);

      this.emitEvent('task_priority.updated', {
        priorityId,
        userId: authContext.userId,
        changes: validData,
      });

      return priority;
    } catch (error) {
      this.logError('task-status-service', 'updateTaskPriority', error);
      throw error;
    }
  }

  async deleteTaskPriority(authContext: AuthContext, priorityId: string): Promise<void> {
    this.log('task-status-service', 'deleteTaskPriority', { userId: authContext.userId, priorityId });
    
    try {
      this.requirePermission(authContext, 'Excluir Tasks', 'excluir prioridade de task');

      await this.storage.deleteTaskPriority(priorityId);

      await this.invalidateCache(['task_priorities:*']);

      this.emitEvent('task_priority.deleted', {
        priorityId,
        userId: authContext.userId,
      });

    } catch (error) {
      this.logError('task-status-service', 'deleteTaskPriority', error);
      throw error;
    }
  }
}

export const taskStatusService = new TaskStatusService();