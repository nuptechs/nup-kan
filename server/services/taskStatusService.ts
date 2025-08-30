/**
 * 📊 TASK STATUS SERVICE - Legacy Compatibility Service
 * 
 * This service provides compatibility for legacy routes while the system
 * transitions to using status fields directly in tasks table.
 * 
 * Note: TaskStatus and TaskPriority tables were removed from schema.
 * Status and priority are now simple string fields in the tasks table.
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";

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

// Legacy compatibility types
interface LegacyTaskStatus {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface LegacyTaskPriority {
  id: string;
  name: string;
  level: number;
  color: string;
  description: string;
}

export class TaskStatusService extends BaseService {

  // Task Status methods - returning default statuses
  async getTaskStatuses(authContext: AuthContext): Promise<LegacyTaskStatus[]> {
    this.log('task-status-service', 'getTaskStatuses', { userId: authContext.userId });
    
    // Return default task statuses
    const defaultStatuses: LegacyTaskStatus[] = [
      { id: 'backlog', name: 'Backlog', color: '#64748b', description: 'Task backlog' },
      { id: 'todo', name: 'To Do', color: '#3b82f6', description: 'Tasks to be started' },
      { id: 'in-progress', name: 'In Progress', color: '#f59e0b', description: 'Tasks in progress' },
      { id: 'review', name: 'Review', color: '#8b5cf6', description: 'Tasks in review' },
      { id: 'done', name: 'Done', color: '#10b981', description: 'Completed tasks' }
    ];
    
    return defaultStatuses;
  }

  async getTaskStatus(authContext: AuthContext, statusId: string): Promise<LegacyTaskStatus | null> {
    this.log('task-status-service', 'getTaskStatus', { userId: authContext.userId, statusId });
    
    const statuses = await this.getTaskStatuses(authContext);
    return statuses.find(s => s.id === statusId) || null;
  }

  async createTaskStatus(authContext: AuthContext, request: TaskStatusCreateRequest): Promise<LegacyTaskStatus> {
    this.log('task-status-service', 'createTaskStatus', { userId: authContext.userId, name: request.name });
    
    // Return a mock status for compatibility
    const status: LegacyTaskStatus = {
      id: `custom-${Date.now()}`,
      name: request.name,
      color: request.color || '#3b82f6',
      description: request.description || ''
    };

    return status;
  }

  async updateTaskStatus(authContext: AuthContext, statusId: string, request: Partial<TaskStatusCreateRequest>): Promise<LegacyTaskStatus> {
    this.log('task-status-service', 'updateTaskStatus', { userId: authContext.userId, statusId });
    
    const existing = await this.getTaskStatus(authContext, statusId);
    if (!existing) {
      throw new Error('Status not found');
    }

    return {
      ...existing,
      name: request.name || existing.name,
      color: request.color || existing.color,
      description: request.description || existing.description
    };
  }

  async deleteTaskStatus(authContext: AuthContext, statusId: string): Promise<void> {
    this.log('task-status-service', 'deleteTaskStatus', { userId: authContext.userId, statusId });
    // No-op for compatibility
  }

  // Task Priority methods - returning default priorities
  async getTaskPriorities(authContext: AuthContext): Promise<LegacyTaskPriority[]> {
    this.log('task-status-service', 'getTaskPriorities', { userId: authContext.userId });
    
    const defaultPriorities: LegacyTaskPriority[] = [
      { id: 'low', name: 'Low', level: 1, color: '#64748b', description: 'Low priority' },
      { id: 'medium', name: 'Medium', level: 2, color: '#f59e0b', description: 'Medium priority' },
      { id: 'high', name: 'High', level: 3, color: '#ef4444', description: 'High priority' },
      { id: 'urgent', name: 'Urgent', level: 4, color: '#dc2626', description: 'Urgent priority' }
    ];
    
    return defaultPriorities;
  }

  async getTaskPriority(authContext: AuthContext, priorityId: string): Promise<LegacyTaskPriority | null> {
    this.log('task-status-service', 'getTaskPriority', { userId: authContext.userId, priorityId });
    
    const priorities = await this.getTaskPriorities(authContext);
    return priorities.find(p => p.id === priorityId) || null;
  }

  async createTaskPriority(authContext: AuthContext, request: TaskPriorityCreateRequest): Promise<LegacyTaskPriority> {
    this.log('task-status-service', 'createTaskPriority', { userId: authContext.userId, name: request.name });
    
    const priority: LegacyTaskPriority = {
      id: `custom-${Date.now()}`,
      name: request.name,
      level: request.level,
      color: request.color || '#3b82f6',
      description: request.description || ''
    };

    return priority;
  }

  async updateTaskPriority(authContext: AuthContext, priorityId: string, request: Partial<TaskPriorityCreateRequest>): Promise<LegacyTaskPriority> {
    this.log('task-status-service', 'updateTaskPriority', { userId: authContext.userId, priorityId });
    
    const existing = await this.getTaskPriority(authContext, priorityId);
    if (!existing) {
      throw new Error('Priority not found');
    }

    return {
      ...existing,
      name: request.name || existing.name,
      level: request.level || existing.level,
      color: request.color || existing.color,
      description: request.description || existing.description
    };
  }

  async deleteTaskPriority(authContext: AuthContext, priorityId: string): Promise<void> {
    this.log('task-status-service', 'deleteTaskPriority', { userId: authContext.userId, priorityId });
    // No-op for compatibility
  }
}

export const taskStatusService = new TaskStatusService();