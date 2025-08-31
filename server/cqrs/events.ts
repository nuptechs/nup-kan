// Event-driven system for CQRS synchronization

// Sistema de eventos com PostgreSQL apenas

// Sistema de eventos local (sem cache externo)

// Event Types
export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;
  data: any;
}

export interface BoardCreatedEvent extends DomainEvent {
  type: 'board.created';
  boardId: string;
  board: any;
}

export interface TaskCreatedEvent extends DomainEvent {
  type: 'task.created';
  taskId: string;
  task: any;
}

export interface TaskUpdatedEvent extends DomainEvent {
  type: 'task.updated';
  taskId: string;
  task: any;
  changes: any;
}

export interface TaskDeletedEvent extends DomainEvent {
  type: 'task.deleted';
  taskId: string;
  task: any;
}

class EventBus {
  private eventQueue: any = null;
  private worker: any = null;

  constructor() {
    // Sistema de eventos local
    this.eventQueue = null;

    this.startEventWorker();
  }

  // 📡 Emitir evento (modo local)
  async emit(eventType: string, eventData: any): Promise<void> {
    const event: DomainEvent = {
      type: eventType,
      timestamp: new Date(),
      aggregateId: eventData.id || eventData.boardId || eventData.taskId || 'unknown',
      data: eventData,
    };

    try {
      console.log(`🟡 [EVENT] ${eventType} processado localmente`);
      await this.handleEvent(event);
    } catch (error) {
      console.error(`❌ [EVENT] Erro processando evento ${eventType}:`, error);
    }
  }

  // 🎯 Worker desabilitado (modo local)
  private startEventWorker(): void {
    this.worker = null;
    console.log('🎪 [EVENT-WORKER] Sistema funcionando em modo local');
  }

  // 🎪 Router de eventos para handlers
  private async handleEvent(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'board.created':
        EventHandlers.handleBoardCreated(event as BoardCreatedEvent)
          .catch(error => console.error('⚠️ [EVENT-HANDLER] Erro assíncrono em board.created:', error));
        break;
      case 'task.created':
        await EventHandlers.handleTaskCreated(event as TaskCreatedEvent);
        break;
      case 'task.updated':
        await EventHandlers.handleTaskUpdated(event as TaskUpdatedEvent);
        break;
      case 'task.deleted':
        await EventHandlers.handleTaskDeleted(event as TaskDeletedEvent);
        break;
      default:
        console.warn(`⚠️ [EVENT] Handler não encontrado para: ${event.type}`);
    }
  }

  // 📊 Prioridade dos eventos
  private getEventPriority(eventType: string): number {
    switch (eventType) {
      case 'user.login':
      case 'user.permissions.updated':
        return 10; // Alta prioridade
      case 'task.created':
      case 'task.updated':
        return 5;  // Média prioridade
      case 'board.created':
      case 'board.updated':
        return 3;  // Baixa prioridade
      default:
        return 1;  // Prioridade padrão
    }
  }

  // 📈 Métricas do Event Bus
  async getMetrics() {
    try {
      if (!this.eventQueue) {
        return {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          health: 'local',
        };
      }

      const waiting = await this.eventQueue.getWaiting();
      const active = await this.eventQueue.getActive();
      const completed = await this.eventQueue.getCompleted();
      const failed = await this.eventQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        health: 'healthy',
      };
    } catch (error) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        health: 'unhealthy',
        error: error?.toString(),
      };
    }
  }
}

/**
 * 🎭 EVENT HANDLERS - Sistema de Eventos PostgreSQL
 */
class EventHandlers {
  
  // 📝 Handler: Board Criado
  static async handleBoardCreated(event: BoardCreatedEvent): Promise<void> {
    // Sistema funcionando com PostgreSQL apenas
    console.log('📊 [EVENT-HANDLER] Processando evento de criação de board');

    const { board } = event.data;

    // Board criado no PostgreSQL - evento processado
    if (board && board.name) {
      console.log(`📊 [SYNC] Board ${board.name} processado com sucesso`);
    } else {
      console.log('📊 [SYNC] Board processado com sucesso (dados incompletos no evento)');
    }
  }

  // 📝 Handler: Task Criada
  static async handleTaskCreated(event: TaskCreatedEvent): Promise<void> {
    const { task } = event.data;
    
    // Task criada no PostgreSQL - evento processado
    console.log(`📊 [SYNC] Task ${task.title} processada com sucesso`);
  }

  // 📝 Handler: Task Atualizada
  static async handleTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    const { task, changes } = event.data;
    
    // Task atualizada no PostgreSQL - evento processado
    console.log(`📊 [SYNC] Task ${task.title} atualizada com sucesso`);
  }

  // 📝 Handler: Task Deletada
  static async handleTaskDeleted(event: TaskDeletedEvent): Promise<void> {

    const { taskId, task } = event.data;

    // Task removida do PostgreSQL - evento processado
    console.log(`📊 [SYNC] Task ${task.title} removida com sucesso`);
  }
}

export const eventBus = new EventBus();
export { EventHandlers };