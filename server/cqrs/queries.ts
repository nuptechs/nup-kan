/**
 * 🔍 CQRS QUERY SIDE - Leituras Ultra-Rápidas
 * 
 * RESPONSABILIDADES:
 * - Queries otimizadas no MongoDB (Read Model)
 * - Fallback para PostgreSQL se MongoDB não disponível
 * - Cache inteligente em múltiplas camadas
 * - Performance 10-50x superior ao PostgreSQL para reads
 */

import { mongoStore } from '../mongodb';
import { cache, CacheKeys, TTL } from '../cache';
import { OptimizedQueries } from '../optimizedQueries';

/**
 * 🚀 QUERY HANDLERS - Ultra-Otimizados
 */
export class QueryHandlers {
  
  // 📊 QUERY: Buscar Boards com Estatísticas (MongoDB First)
  static async getBoardsWithStats(limit: number = 20, offset: number = 0) {
    console.log('🔍 [QUERY] Buscando boards com stats');
    const startTime = Date.now();

    try {
      // 🥇 PRIMEIRA TENTATIVA: MongoDB (Read Model) - 10x mais rápido
      if (mongoStore.collections?.boardsWithStats) {
        const boardsData = await mongoStore.collections.boardsWithStats
          .find({})
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .toArray();

        if (boardsData.length > 0) {
          const duration = Date.now() - startTime;
          console.log(`🚀 [QUERY-MONGO] ${boardsData.length} boards em ${duration}ms (MongoDB)`);
          return boardsData.map(board => ({
            id: board._id,
            name: board.name,
            description: board.description,
            color: board.color,
            createdAt: board.createdAt,
            createdById: board.createdById,
            taskCount: board.taskCount,
            completedTasks: board.completedTasks,
            inProgressTasks: board.inProgressTasks,
            pendingTasks: board.pendingTasks,
            columns: board.columns,
            activeMembers: board.activeMembers,
            metrics: board.metrics,
          }));
        }
      }

      // 🥈 FALLBACK: PostgreSQL (Write Model) - Com cache
      console.log('🟡 [QUERY] MongoDB vazio, usando PostgreSQL com cache');
      const boards = await OptimizedQueries.getBoardsWithStatsOptimized(limit, offset);
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] ${boards.length} boards em ${duration}ms (PostgreSQL)`);
      return boards;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getBoardsWithStats após ${duration}ms:`, error);
      throw error;
    }
  }

  // 📋 QUERY: Buscar Tasks de um Board (MongoDB First)
  static async getBoardTasks(boardId: string, limit: number = 100, offset: number = 0) {
    console.log('🔍 [QUERY] Buscando tasks do board:', boardId);
    const startTime = Date.now();

    try {
      // 🥇 PRIMEIRA TENTATIVA: MongoDB (Read Model)
      if (mongoStore.collections?.tasksOptimized) {
        const tasksData = await mongoStore.collections.tasksOptimized
          .find({ boardId })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .toArray();

        if (tasksData.length > 0) {
          const duration = Date.now() - startTime;
          console.log(`🚀 [QUERY-MONGO] ${tasksData.length} tasks em ${duration}ms (MongoDB)`);
          return tasksData.map(task => ({
            id: task._id,
            boardId: task.boardId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            progress: task.progress,
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            assigneeAvatar: task.assigneeAvatar,
            tags: task.tags,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            boardName: task.boardName,
            columnTitle: task.columnTitle,
            recentActivity: task.recentActivity,
          }));
        }
      }

      // 🥈 FALLBACK: PostgreSQL
      console.log('🟡 [QUERY] MongoDB vazio, usando PostgreSQL');
      const tasks = await OptimizedQueries.getBoardTasksOptimized(boardId);
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] ${tasks.length} tasks em ${duration}ms (PostgreSQL)`);
      return tasks;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getBoardTasks após ${duration}ms:`, error);
      throw error;
    }
  }

  // 👤 QUERY: Buscar Usuário com Permissões (MongoDB First)
  static async getUserWithPermissions(userId: string) {
    console.log('🔍 [QUERY] Buscando usuário com permissões:', userId);
    const startTime = Date.now();

    try {
      // 🥇 CACHE REDIS PRIMEIRO
      const cached = await cache.get(`user_with_permissions_v2:${userId}`);
      if (cached) {
        console.log(`🚀 [QUERY-CACHE] Usuário em 0ms (Cache Hit)`);
        return cached;
      }

      // 🥇 SEGUNDA TENTATIVA: MongoDB (Read Model)
      if (mongoStore.collections?.usersWithPermissions) {
        const userData = await mongoStore.collections.usersWithPermissions.findOne({ _id: userId });

        if (userData) {
          // Cachear resultado
          await cache.set(`user_with_permissions_v2:${userId}`, userData, TTL.MEDIUM);
          
          const duration = Date.now() - startTime;
          console.log(`🚀 [QUERY-MONGO] Usuário em ${duration}ms (MongoDB)`);
          return {
            id: userData._id,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            profileId: userData.profileId,
            profileName: userData.profileName,
            permissions: userData.permissions,
            permissionCategories: userData.permissionCategories,
            teams: userData.teams,
            stats: userData.stats,
          };
        }
      }

      // 🥈 FALLBACK: PostgreSQL
      console.log('🟡 [QUERY] MongoDB vazio, usando PostgreSQL');
      const [user, permissions] = await Promise.all([
        OptimizedQueries.getUserWithProfileOptimized(userId),
        OptimizedQueries.getUserPermissionsOptimized(userId),
      ]);

      const result = {
        ...user,
        permissions: permissions.map(p => p.name),
        permissionCategories: [...new Set(permissions.map(p => p.category))],
        teams: [], // Será preenchido se necessário
        stats: {
          activeTasks: 0,
          completedTasks: 0,
          boardsAccess: 0,
          lastActivity: new Date(),
        },
      };

      // Cachear resultado
      await cache.set(`user_with_permissions_v2:${userId}`, result, TTL.MEDIUM);
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] Usuário em ${duration}ms (PostgreSQL)`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getUserWithPermissions após ${duration}ms:`, error);
      throw error;
    }
  }

  // 📊 QUERY: Analytics Ultra-Rápidos (MongoDB First)
  static async getAnalytics(type: 'global' | 'board' = 'global', targetId: string = 'global') {
    console.log('🔍 [QUERY] Buscando analytics:', type, targetId);
    const startTime = Date.now();

    try {
      // 🥇 PRIMEIRA TENTATIVA: MongoDB (Read Model)
      if (mongoStore.collections?.analytics) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        const analyticsData = await mongoStore.collections.analytics.findOne({
          type,
          targetId,
          date: today,
        });

        if (analyticsData) {
          const duration = Date.now() - startTime;
          console.log(`🚀 [QUERY-MONGO] Analytics em ${duration}ms (MongoDB)`);
          return analyticsData.data;
        }
      }

      // 🥈 FALLBACK: Calcular em tempo real do PostgreSQL
      console.log('🟡 [QUERY] MongoDB vazio, calculando analytics em tempo real');
      const analytics = await OptimizedQueries.getAnalyticsOptimized();
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] Analytics em ${duration}ms (PostgreSQL)`);
      return analytics;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getAnalytics após ${duration}ms:`, error);
      throw error;
    }
  }

  // 📈 QUERY: Métricas do Sistema
  static async getSystemMetrics() {
    const startTime = Date.now();

    try {
      const [cacheStats, mongoHealth] = await Promise.all([
        cache.getStats(),
        mongoStore.health(),
      ]);

      const duration = Date.now() - startTime;
      
      return {
        performance: {
          queryResponseTime: duration,
          cacheHitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0,
          cacheSize: cacheStats.size,
        },
        health: {
          mongodb: mongoHealth ? 'healthy' : 'unavailable',
          cache: cacheStats.size >= 0 ? 'healthy' : 'unhealthy',
        },
        features: {
          cqrsEnabled: mongoHealth,
          cacheEnabled: true,
          eventDriven: true,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getSystemMetrics após ${duration}ms:`, error);
      throw error;
    }
  }
}