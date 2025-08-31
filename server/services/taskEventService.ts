/**
 * 📝 TASK EVENT SERVICE - Gerenciamento de Eventos de Tasks
 * 
 * Responsabilidades:
 * - Histórico de mudanças em tasks
 * - Log de ações e auditoria
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { TaskEvent, InsertTaskEvent } from "@shared/schema";
import { insertTaskEventSchema } from "@shared/schema";
import { TTL } from "../cache";
import { PERMISSIONS } from "../config/permissions";

export interface TaskEventCreateRequest {
  taskId: string;
  userId: string;
  eventType: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: any;
}

export class TaskEventService extends BaseService {

  async getTaskEvents(authContext: AuthContext, taskId: string): Promise<TaskEvent[]> {
    this.log('task-event-service', 'getTaskEvents', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.VIEW, 'visualizar histórico da task');

      const cacheKey = `task_events:${taskId}`;
      const cached = await this.cache.get<TaskEvent[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const events = await this.storage.getTaskEvents(taskId);
      await this.cache.set(cacheKey, events, TTL.SHORT);
      
      return events;
    } catch (error) {
      this.logError('task-event-service', 'getTaskEvents', error);
      throw error;
    }
  }

  async createTaskEvent(authContext: AuthContext, request: TaskEventCreateRequest): Promise<TaskEvent> {
    this.log('task-event-service', 'createTaskEvent', { userId: authContext.userId, taskId: request.taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.EDIT, 'criar evento da task');

      const validData = insertTaskEventSchema.parse(request);
      const event = await this.storage.createTaskEvent(validData);

      await this.invalidateCache([`task_events:${request.taskId}`]);

      this.emitEvent('task_event.created', {
        eventId: event.id,
        taskId: request.taskId,
        eventType: request.eventType,
        userId: authContext.userId,
      });

      return event;
    } catch (error) {
      this.logError('task-event-service', 'createTaskEvent', error);
      throw error;
    }
  }
}

export const taskEventService = new TaskEventService();