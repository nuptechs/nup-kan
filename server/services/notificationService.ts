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
   * Buscar contagem de notificações não lidas
   */
  async getUnreadCount(authContext: AuthContext): Promise<number> {
    this.log('notification-service', 'getUnreadCount', { userId: authContext.userId });
    
    try {
      const count = await this.storage.getUnreadNotificationCount(authContext.userId);
      return count;
    } catch (error) {
      this.logError('notification-service', 'getUnreadCount', error);
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
      
      if (error instanceof Error) {
        throw new Error(`Erro na criação da notificação: ${error.message}`);
      }
      
      throw new Error('Erro desconhecido na criação da notificação');
    }
  }

  /**
   * Buscar uma notificação específica
   */
  async getNotification(authContext: AuthContext, notificationId: string): Promise<Notification | null> {
    this.log('notification-service', 'getNotification', { userId: authContext.userId, notificationId });
    
    try {
      const notification = await this.storage.getNotification(notificationId);
      return notification || null;
    } catch (error) {
      this.logError('notification-service', 'getNotification', error);
      throw error;
    }
  }

  /**
   * Atualizar uma notificação
   */
  async updateNotification(authContext: AuthContext, notificationId: string, data: any): Promise<Notification> {
    this.log('notification-service', 'updateNotification', { userId: authContext.userId, notificationId });
    
    try {
      const notification = await this.storage.updateNotification(notificationId, data);
      await this.invalidateCache([`notifications:user:${authContext.userId}`]);
      
      this.emitEvent('notification.updated', {
        notificationId,
        userId: authContext.userId,
      });

      return notification;
    } catch (error) {
      this.logError('notification-service', 'updateNotification', error);
      throw error;
    }
  }

  /**
   * Excluir uma notificação
   */
  async deleteNotification(authContext: AuthContext, notificationId: string): Promise<void> {
    this.log('notification-service', 'deleteNotification', { userId: authContext.userId, notificationId });
    
    try {
      await this.storage.deleteNotification(notificationId);
      await this.invalidateCache([`notifications:user:${authContext.userId}`]);
      
      this.emitEvent('notification.deleted', {
        notificationId,
        userId: authContext.userId,
      });
    } catch (error) {
      this.logError('notification-service', 'deleteNotification', error);
      throw error;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markNotificationAsRead(authContext: AuthContext, notificationId: string): Promise<Notification> {
    this.log('notification-service', 'markNotificationAsRead', { userId: authContext.userId, notificationId });
    
    try {
      const notification = await this.storage.markNotificationAsRead(notificationId);
      await this.invalidateCache([`notifications:user:${authContext.userId}`]);
      
      this.emitEvent('notification.read', {
        notificationId,
        userId: authContext.userId,
      });

      return notification;
    } catch (error) {
      this.logError('notification-service', 'markNotificationAsRead', error);
      throw error;
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllNotificationsAsRead(authContext: AuthContext, userId: string): Promise<number> {
    this.log('notification-service', 'markAllNotificationsAsRead', { userId: authContext.userId, targetUserId: userId });
    
    try {
      const count = await this.storage.markAllNotificationsAsRead(userId);
      await this.invalidateCache([`notifications:user:${userId}`]);
      
      this.emitEvent('notifications.all_read', {
        userId,
        count,
        markedBy: authContext.userId,
      });

      return count;
    } catch (error) {
      this.logError('notification-service', 'markAllNotificationsAsRead', error);
      throw error;
    }
  }

  /**
   * Excluir notificações expiradas
   */
  async deleteExpiredNotifications(authContext: AuthContext): Promise<number> {
    this.log('notification-service', 'deleteExpiredNotifications', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Excluir System', 'limpar notificações expiradas');
      
      const count = await this.storage.deleteExpiredNotifications();
      
      this.emitEvent('notifications.expired_deleted', {
        count,
        deletedBy: authContext.userId,
      });

      return count;
    } catch (error) {
      this.logError('notification-service', 'deleteExpiredNotifications', error);
      throw error;
    }
  }

  /**
   * Calcular tempo relativo (ex: "2h atrás")
   */
  private calculateTimeAgo(date: Date | null): string {
    if (!date) return 'Data não disponível';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}min atrás`;
    
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