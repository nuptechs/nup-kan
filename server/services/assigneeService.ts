/**
 * 👤 ASSIGNEE SERVICE - Centralização de Gerenciamento de Assignees
 * 
 * CONSOLIDAÇÃO COMPLETA: Todos os métodos de assignees centralizados aqui
 * 
 * Responsabilidades:
 * - CRUD completo de task assignees
 * - Validação de assignments (usuário válido, permissões)
 * - Cache inteligente de assignees
 * - Emissão de eventos de assignment
 * - Integração com hierarquia User → Team → Profile → Permission
 * 
 * Arquitetura: Interface única para todos os assignments de tasks
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { TaskAssignee, InsertTaskAssignee, User } from "@shared/schema";
import { insertTaskAssigneeSchema } from "@shared/schema";
import { TTL } from "../cache";
import { PERMISSIONS } from "../config/permissions";
import { hierarchyService } from "./hierarchyService";

export interface AssigneeRequest {
  taskId: string;
  userId: string;
}

export interface AssigneeWithUser extends TaskAssignee {
  user: User;
}

export class AssigneeService extends BaseService {

  /**
   * 🎯 CENTRALIZADO: Obter todos os assignees de uma task
   */
  async getTaskAssignees(authContext: AuthContext, taskId: string): Promise<AssigneeWithUser[]> {
    this.log('assignee-service', 'getTaskAssignees', { userId: authContext.userId, taskId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.VIEW, 'visualizar assignees de task');

      const cacheKey = `assignees:task:${taskId}`;
      const cached = await this.cache.get<AssigneeWithUser[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const assignees = await this.storage.getTaskAssignees(taskId);
      await this.cache.set(cacheKey, assignees, TTL.SHORT);
      
      return assignees;
    } catch (error) {
      this.logError('assignee-service', 'getTaskAssignees', error);
      throw error;
    }
  }

  /**
   * 🎯 CENTRALIZADO: Adicionar assignee a uma task
   */
  async addTaskAssignee(authContext: AuthContext, request: AssigneeRequest): Promise<TaskAssignee> {
    this.log('assignee-service', 'addTaskAssignee', { userId: authContext.userId, request });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.ASSIGN, 'adicionar assignee');

      // Validar dados
      const validData = insertTaskAssigneeSchema.parse(request);

      // Verificar se task existe
      const task = await this.storage.getTask(request.taskId);
      if (!task) {
        throw new Error('Task não encontrada');
      }

      // Verificar se usuário existe e tem acesso
      const user = await this.storage.getUser(request.userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Usar hierarchyService para verificar se usuário pode ser assignee da task
      const userHierarchy = await hierarchyService.resolveUserHierarchy(authContext, request.userId);
      const canBeAssigned = userHierarchy.allPermissions.some(p => 
        p.name === 'Visualizar Tarefas' || p.name === 'Editar Tarefas'
      );
      
      if (!canBeAssigned) {
        throw new Error('Usuário não tem permissões para ser assignee de tasks');
      }

      // Verificar se já é assignee
      const existingAssignees = await this.storage.getTaskAssignees(request.taskId);
      const alreadyAssigned = existingAssignees.some(a => a.userId === request.userId);
      
      if (alreadyAssigned) {
        throw new Error('Usuário já é assignee desta task');
      }

      const assignee = await this.storage.addTaskAssignee(validData);

      // Invalidar caches
      await this.invalidateCache([
        `assignees:task:${request.taskId}`,
        `user:${request.userId}:assignments`
      ]);

      // Log assignee adicionado
      this.log('assignee-service', 'assignee-added', {
        taskId: request.taskId,
        userId: request.userId,
        assignedBy: authContext.userId
      });

      return assignee;
    } catch (error) {
      this.logError('assignee-service', 'addTaskAssignee', error);
      throw error;
    }
  }

  /**
   * 🎯 CENTRALIZADO: Remover assignee de uma task
   */
  async removeTaskAssignee(authContext: AuthContext, taskId: string, userId: string): Promise<void> {
    this.log('assignee-service', 'removeTaskAssignee', { userId: authContext.userId, taskId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.ASSIGN, 'remover assignee');

      // Verificar se assignee existe
      const existingAssignees = await this.storage.getTaskAssignees(taskId);
      const assigneeExists = existingAssignees.some(a => a.userId === userId);
      
      if (!assigneeExists) {
        throw new Error('Usuário não é assignee desta task');
      }

      await this.storage.removeTaskAssignee(taskId, userId);

      // Invalidar caches
      await this.invalidateCache([
        `assignees:task:${taskId}`,
        `user:${userId}:assignments`
      ]);

      // Log assignee removido
      this.log('assignee-service', 'assignee-removed', {
        taskId,
        userId,
        removedBy: authContext.userId
      });
    } catch (error) {
      this.logError('assignee-service', 'removeTaskAssignee', error);
      throw error;
    }
  }

  /**
   * 🎯 CENTRALIZADO: Obter todas as tasks atribuídas a um usuário
   */
  async getUserAssignments(authContext: AuthContext, userId: string): Promise<AssigneeWithUser[]> {
    this.log('assignee-service', 'getUserAssignments', { userId: authContext.userId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TASKS.VIEW, 'visualizar assignments do usuário');

      const cacheKey = `user:${userId}:assignments`;
      const cached = await this.cache.get<AssigneeWithUser[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Buscar todas as tasks onde o usuário é assignee
      const allTasks = await this.storage.getTasks();
      const userAssignments: AssigneeWithUser[] = [];

      for (const task of allTasks) {
        const assignees = await this.storage.getTaskAssignees(task.id);
        const userAssignee = assignees.find(a => a.userId === userId);
        if (userAssignee) {
          userAssignments.push(userAssignee);
        }
      }

      await this.cache.set(cacheKey, userAssignments, TTL.MEDIUM);
      return userAssignments;
    } catch (error) {
      this.logError('assignee-service', 'getUserAssignments', error);
      throw error;
    }
  }

  /**
   * 🎯 CENTRALIZADO: Transferir assignees em massa (para quando usuário sai do time)
   */
  async transferUserAssignments(authContext: AuthContext, fromUserId: string, toUserId: string): Promise<number> {
    this.log('assignee-service', 'transferUserAssignments', { 
      userId: authContext.userId, 
      fromUserId, 
      toUserId 
    });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.MANAGE, 'transferir assignments');

      const userAssignments = await this.getUserAssignments(authContext, fromUserId);
      let transferredCount = 0;

      for (const assignment of userAssignments) {
        try {
          // Remover do usuário antigo
          await this.removeTaskAssignee(authContext, assignment.taskId, fromUserId);
          
          // Adicionar ao novo usuário
          await this.addTaskAssignee(authContext, {
            taskId: assignment.taskId,
            userId: toUserId
          });
          
          transferredCount++;
        } catch (error) {
          this.logError('assignee-service', 'transferUserAssignments', 
            `Erro transferindo assignment ${assignment.taskId}: ${error}`);
          // Continue com próximo assignment
        }
      }

      // Log transferência de assignments
      this.log('assignee-service', 'assignments-transferred', {
        fromUserId,
        toUserId,
        transferredCount,
        transferredBy: authContext.userId
      });

      return transferredCount;
    } catch (error) {
      this.logError('assignee-service', 'transferUserAssignments', error);
      throw error;
    }
  }
}

// Instância singleton
export const assigneeService = new AssigneeService();