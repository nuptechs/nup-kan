/**
 * 🎪 CENTRAL EVENT BUS - Sistema de Eventos Centralizado e Tipado
 * 
 * Responsabilidades:
 * - Interface única para emissão de eventos
 * - Type-safety completo com eventos tipados
 * - Extensibilidade para Kafka, WebSocket, etc.
 * - Logging centralizado de eventos
 * - Performance otimizada
 */

import { Logger } from '../utils/logMessages';
import type { 
  AllDomainEvents, 
  EventRegistry, 
  EventType, 
  EventData,
  DomainEvent 
} from './types';

// 🎯 Handler de evento genérico
export type DomainEventHandler<T extends EventType> = (event: EventRegistry[T]) => Promise<void> | void;

// 🎪 Event Bus Central
class CentralEventBus {
  private handlers = new Map<string, DomainEventHandler<any>[]>();
  private isEnabled = true;

  /**
   * 🎯 Emit typesafe - Método principal para emitir eventos
   */
  async emit<T extends EventType>(
    eventType: T, 
    data: EventData<T>,
    metadata?: DomainEvent['metadata']
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Criar evento tipado
    const event: EventRegistry[T] = {
      type: eventType,
      timestamp: new Date(),
      aggregateId: this.extractAggregateId(data),
      data,
      metadata: {
        source: 'nupkan-api',
        version: 1,
        ...metadata
      }
    } as EventRegistry[T];

    try {
      // Log do evento
      Logger.service.operation('event-bus', 'emit', `${eventType} → ${event.aggregateId}`);

      // Executar handlers
      const eventHandlers = this.handlers.get(eventType) || [];
      await Promise.all(
        eventHandlers.map(handler => 
          Promise.resolve(handler(event)).catch(error => 
            Logger.error.generic(`EVENT-HANDLER-${eventType.toUpperCase()}`, error)
          )
        )
      );

      // Log sucesso
      Logger.service.operationComplete('event-bus', 'emit', { 
        eventType, 
        handlersCount: eventHandlers.length 
      });

    } catch (error) {
      Logger.error.generic('EVENT-BUS-EMIT', error);
      throw error;
    }
  }

  /**
   * 📡 Registrar handler para um tipo de evento
   */
  on<T extends EventType>(eventType: T, handler: DomainEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    
    Logger.service.operation('event-bus', 'register-handler', `${eventType} → ${handler.name || 'anonymous'}`);
  }

  /**
   * 🚫 Remover handler
   */
  off<T extends EventType>(eventType: T, handler: DomainEventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        Logger.service.operation('event-bus', 'unregister-handler', eventType);
      }
    }
  }

  /**
   * 🎯 Extrair ID do agregado para tracking
   */
  private extractAggregateId(data: any): string {
    // Prioridade: id específico → boardId → taskId → userId → unknown
    return data.id || 
           data.boardId || 
           data.taskId || 
           data.userId || 
           data.tagId ||
           data.columnId ||
           'unknown';
  }

  /**
   * 🔧 Controles do sistema
   */
  enable(): void {
    this.isEnabled = true;
    Logger.service.operation('event-bus', 'enable', 'Event bus habilitado');
  }

  disable(): void {
    this.isEnabled = false;
    Logger.service.operation('event-bus', 'disable', 'Event bus desabilitado');
  }

  /**
   * 📊 Estatísticas
   */
  getStats() {
    const stats = {
      enabled: this.isEnabled,
      totalEventTypes: this.handlers.size,
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      eventTypes: Array.from(this.handlers.keys())
    };
    
    Logger.service.operation('event-bus', 'stats', JSON.stringify(stats));
    return stats;
  }

  /**
   * 🧹 Limpar todos os handlers (útil para testes)
   */
  clear(): void {
    this.handlers.clear();
    Logger.service.operation('event-bus', 'clear', 'Todos os handlers removidos');
  }
}

// 🎪 Instância singleton do Event Bus
export const eventBus = new CentralEventBus();

// 🔧 Helpers para facilitar uso
export const emit = eventBus.emit.bind(eventBus);
export const on = eventBus.on.bind(eventBus);
export const off = eventBus.off.bind(eventBus);

// 📤 Exports
export { CentralEventBus };
export type { DomainEventHandler };
export * from './types';

// 🎯 Default export para compatibilidade
export default eventBus;