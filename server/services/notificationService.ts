/**
 * 🔔 NOTIFICATION SERVICE - Gerenciamento de Notificações
 * 
 * Responsabilidades:
 * - CRUD completo de notificações com validação
 * - Lógica de negócio (status, expiração, filtros)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de notificações
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { Notification, InsertNotification, UpdateNotification } from "@shared/schema";
import { insertNotificationSchema, updateNotificationSchema } from "@shared/schema";
import { TTL } from "../cache";

export interface NotificationCreateRequest {
  userId: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  category?: string;
  metadata?: any;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface NotificationUpdateRequest {
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  metadata?: any;
}

export interface NotificationWithDetails extends Notification {
  isExpired?: boolean;
  timeAgo?: string;
}

export class NotificationService extends BaseService {

  /**
   * Listar notificações do usuário
   */
  async getNotifications(authContext: AuthContext, options: PaginationOptions = {}): Promise<NotificationWithDetails[]> {
    this.log('notification-service', 'getNotifications', { userId: authContext.userId });
    
    try {
      const cacheKey = `notifications:user:${authContext.userId}`;
      const cached = await this.cache.get<NotificationWithDetails[]>(cacheKey);
      if (cached) {
        this.log('notification-service', 'cache hit', { cacheKey });
        return cached;
      }

      const notifications = await this.storage.getNotifications(authContext.userId);
      
      // Enriquecer com detalhes
      const enrichedNotifications: NotificationWithDetails[] = notifications.map(notification => ({
        ...notification,
        isExpired: notification.expiresAt ? new Date() > notification.expiresAt : false,
        timeAgo: this.calculateTimeAgo(notification.createdAt)
      }));

      await this.cache.set(cacheKey, enrichedNotifications, TTL.SHORT);
      
      return enrichedNotifications;
    } catch (error) {
      this.logError('notification-service', 'getNotifications', error);
      throw error;
    }
  }

  /**
   * Obter notificação específica
   */
  async getNotification(authContext: AuthContext, notificationId: string): Promise<NotificationWithDetails | null> {
    this.log('notification-service', 'getNotification', { userId: authContext.userId, notificationId });
    
    try {
      const notification = await this.storage.getNotification(notificationId);
      if (!notification) {
        return null;
      }

      // Verificar se a notificação pertence ao usuário
      if (notification.userId !== authContext.userId) {
        throw new Error('Acesso negado à notificação');
      }

      return {
        ...notification,
        isExpired: notification.expiresAt ? new Date() > notification.expiresAt : false,
        timeAgo: this.calculateTimeAgo(notification.createdAt)
      };
    } catch (error) {
      this.logError('notification-service', 'getNotification', error);
      throw error;
    }
  }

  /**
   * Criar nova notificação
   */
  async createNotification(authContext: AuthContext, request: NotificationCreateRequest): Promise<Notification> {
    this.log('notification-service', 'createNotification', { userId: authContext.userId, targetUserId: request.userId });
    
    try {
      // Preparar dados para validação
      const dataForValidation = {
        userId: request.userId,
        title: request.title,
        message: request.message,
        type: request.type || 'info',
        priority: request.priority || 'normal',
        category: request.category || 'general',
        isRead: false,
        metadata: typeof request.metadata === 'string' ? request.metadata : JSON.stringify(request.metadata || {}),
        expiresAt: request.expiresAt || null,
        actionUrl: request.actionUrl || null
      };

      console.log('🔍 [NOTIFICATION-SERVICE] Dados para validação:', dataForValidation);
      
      // Validar dados
      const validatedData = insertNotificationSchema.parse(dataForValidation);

      const notification = await this.storage.createNotification(validatedData);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `notifications:user:${request.userId}`,
        `notifications:count:${request.userId}`
      ]);

      // Emitir evento
      this.emitEvent('notification.created', {
        notificationId: notification.id,
        targetUserId: request.userId,
        createdBy: authContext.userId,
        notification: notification
      });

      return notification;
    } catch (error) {
      this.logError('notification-service', 'createNotification', error);
      
      // Retornar erro estruturado para o response service
      if (error instanceof Error) {
        throw new Error(`Erro na criação da notificação: ${error.message}`);
      }
      
      throw new Error('Erro desconhecido na criação da notificação');
    }
  }

  /**
   * Atualizar notificação
   */
  async updateNotification(authContext: AuthContext, notificationId: string, request: NotificationUpdateRequest): Promise<Notification> {
    this.log('notification-service', 'updateNotification', { userId: authContext.userId, notificationId });
    
    try {
      const existingNotification = await this.storage.getNotification(notificationId);
      if (!existingNotification) {
        throw new Error('Notificação não encontrada');
      }

      // Verificar se a notificação pertence ao usuário
      if (existingNotification.userId !== authContext.userId) {
        throw new Error('Acesso negado à notificação');
      }

      // Validar dados
      const validatedData = updateNotificationSchema.parse(request);

      const notification = await this.storage.updateNotification(notificationId, validatedData);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `notifications:user:${existingNotification.userId}`,
        `notifications:count:${existingNotification.userId}`
      ]);

      // Emitir evento
      this.emitEvent('notification.updated', {
        notificationId: notificationId,
        updatedBy: authContext.userId,
        changes: validatedData
      });

      return notification;
    } catch (error) {
      this.logError('notification-service', 'updateNotification', error);
      throw error;
    }
  }

  /**
   * Excluir notificação
   */
  async deleteNotification(authContext: AuthContext, notificationId: string): Promise<void> {
    this.log('notification-service', 'deleteNotification', { userId: authContext.userId, notificationId });
    
    try {
      const notification = await this.storage.getNotification(notificationId);
      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      // Verificar se a notificação pertence ao usuário
      if (notification.userId !== authContext.userId) {
        throw new Error('Acesso negado à notificação');
      }

      await this.storage.deleteNotification(notificationId);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `notifications:user:${notification.userId}`,
        `notifications:count:${notification.userId}`
      ]);

      // Emitir evento
      this.emitEvent('notification.deleted', {
        notificationId: notificationId,
        deletedBy: authContext.userId,
        deletedNotification: notification
      });
    } catch (error) {
      this.logError('notification-service', 'deleteNotification', error);
      throw error;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(authContext: AuthContext, notificationId: string): Promise<Notification> {
    this.log('notification-service', 'markAsRead', { userId: authContext.userId, notificationId });
    
    try {
      const notification = await this.storage.markNotificationAsRead(notificationId);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `notifications:user:${authContext.userId}`,
        `notifications:count:${authContext.userId}`
      ]);

      return notification;
    } catch (error) {
      this.logError('notification-service', 'markAsRead', error);
      throw error;
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(authContext: AuthContext): Promise<number> {
    this.log('notification-service', 'markAllAsRead', { userId: authContext.userId });
    
    try {
      const count = await this.storage.markAllNotificationsAsRead(authContext.userId);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `notifications:user:${authContext.userId}`,
        `notifications:count:${authContext.userId}`
      ]);

      // Emitir evento
      this.emitEvent('notifications.marked_all_read', {
        userId: authContext.userId,
        count: count
      });

      return count;
    } catch (error) {
      this.logError('notification-service', 'markAllAsRead', error);
      throw error;
    }
  }

  /**
   * Obter contagem de notificações não lidas
   */
  async getUnreadCount(authContext: AuthContext): Promise<number> {
    this.log('notification-service', 'getUnreadCount', { userId: authContext.userId });
    
    try {
      const cacheKey = `notifications:count:${authContext.userId}`;
      const cached = await this.cache.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const count = await this.storage.getUnreadNotificationCount(authContext.userId);
      await this.cache.set(cacheKey, count, TTL.SHORT);
      
      return count;
    } catch (error) {
      this.logError('notification-service', 'getUnreadCount', error);
      throw error;
    }
  }

  /**
   * Limpar notificações expiradas
   */
  async cleanupExpiredNotifications(): Promise<number> {
    this.log('notification-service', 'cleanupExpiredNotifications', {});
    
    try {
      const count = await this.storage.deleteExpiredNotifications();

      // Emitir evento se notificações foram removidas
      if (count > 0) {
        this.emitEvent('notifications.expired_cleaned', {
          count: count
        });
      }

      return count;
    } catch (error) {
      this.logError('notification-service', 'cleanupExpiredNotifications', error);
      throw error;
    }
  }

  /**
   * Calcular tempo relativo (helper privado)
   */
  private calculateTimeAgo(date: Date | null): string {
    if (!date) return 'Desconhecido';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d atrás`;
    
    const months = Math.floor(days / 30);
    return `${months} meses atrás`;
  }
}

// Instância singleton
export const notificationService = new NotificationService();