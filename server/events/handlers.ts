/**
 * 🎪 EVENT HANDLERS - Handlers Centralizados de Eventos
 * 
 * Responsabilidades:
 * - Processar eventos de domínio
 * - Sincronização cross-agregado
 * - Side effects (emails, notificações, etc)
 * - Integração com sistemas externos
 */

import { Logger } from '../utils/logMessages';
import type { 
  BoardCreatedEvent,
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  UserCreatedEvent,
  TagCreatedEvent,
  ColumnCreatedEvent
} from './types';

export class DomainEventHandlers {
  
  // 📋 BOARD HANDLERS
  static async handleBoardCreated(event: BoardCreatedEvent): Promise<void> {
    const { board, userId, createdDefaultColumns } = event.data;
    
    Logger.service.operation('domain-events', 'board-created', `Board ${board.name} criado por ${userId}`);
    
    // Side effects do board criado
    // Exemplo: criar colunas padrão, notificar usuários, etc.
    if (createdDefaultColumns) {
      Logger.service.operation('domain-events', 'board-init', `Colunas padrão criadas para board ${board.id}`);
    }
  }

  // 📝 TASK HANDLERS
  static async handleTaskCreated(event: TaskCreatedEvent): Promise<void> {
    const { task, boardId, userId } = event.data;
    
    Logger.service.operation('domain-events', 'task-created', `Task "${task.title}" criada no board ${boardId}`);
    
    // Side effects:
    // - Atualizar estatísticas do board
    // - Notificar assignees
    // - Webhook externo se configurado
  }

  static async handleTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    const { task, changes, userId } = event.data;
    
    Logger.service.operation('domain-events', 'task-updated', `Task "${task.title}" atualizada`);
    
    // Side effects:
    // - Notificar mudanças para assignees
    // - Atualizar métricas
    // - Log de auditoria
  }

  static async handleTaskDeleted(event: TaskDeletedEvent): Promise<void> {
    const { task, boardId, userId } = event.data;
    
    Logger.service.operation('domain-events', 'task-deleted', `Task "${task.title}" removida do board ${boardId}`);
    
    // Side effects:
    // - Atualizar estatísticas
    // - Notificar stakeholders
    // - Cleanup de relacionamentos
  }

  // 👥 USER HANDLERS
  static async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    const { user, welcomeEmailSent } = event.data;
    
    Logger.service.operation('domain-events', 'user-created', `Usuário ${user.email} criado`);
    
    // Side effects:
    // - Enviar email de boas-vindas (se não enviado)
    // - Criar workspace padrão
    // - Notificar admins
    if (!welcomeEmailSent) {
      Logger.service.operation('domain-events', 'welcome-email-pending', `Email de boas-vindas pendente para ${user.email}`);
    }
  }

  // 🏷️ TAG HANDLERS
  static async handleTagCreated(event: TagCreatedEvent): Promise<void> {
    const { tagName, color, userId } = event.data;
    
    Logger.service.operation('domain-events', 'tag-created', `Tag "${tagName}" criada por ${userId}`);
    
    // Side effects:
    // - Invalidar cache de tags
    // - Atualizar índices de busca
  }

  // 📊 COLUMN HANDLERS
  static async handleColumnCreated(event: ColumnCreatedEvent): Promise<void> {
    const { columnTitle, boardId, position, userId } = event.data;
    
    Logger.service.operation('domain-events', 'column-created', `Coluna "${columnTitle}" criada no board ${boardId}`);
    
    // Side effects:
    // - Invalidar cache do board
    // - Reordenar outras colunas se necessário
  }
}

// 🎯 Registrar todos os handlers automaticamente
export function registerDomainEventHandlers(eventBus: any) {
  // Board events
  eventBus.on('board.created', DomainEventHandlers.handleBoardCreated);
  
  // Task events
  eventBus.on('task.created', DomainEventHandlers.handleTaskCreated);
  eventBus.on('task.updated', DomainEventHandlers.handleTaskUpdated);
  eventBus.on('task.deleted', DomainEventHandlers.handleTaskDeleted);
  
  // User events
  eventBus.on('user.created', DomainEventHandlers.handleUserCreated);
  
  // Tag events
  eventBus.on('tag.created', DomainEventHandlers.handleTagCreated);
  
  // Column events
  eventBus.on('column.created', DomainEventHandlers.handleColumnCreated);
  
  Logger.service.operation('domain-events', 'handlers-registered', 'Todos os event handlers registrados');
}