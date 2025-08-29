/**
 * 🔍 CQRS QUERY SIDE - Leituras Ultra-Rápidas
 * 
 * RESPONSABILIDADES:
 * - Queries otimizadas no PostgreSQL
 * - Cache inteligente para performance
 * - Performance otimizada com cache inteligente
 */

// Sistema de queries com PostgreSQL apenas
import { cache, CacheKeys, TTL } from '../cache';
import { OptimizedQueries } from '../optimizedQueries';

/**
 * 🚀 QUERY HANDLERS - Ultra-Otimizados
 */
export class QueryHandlers {
  
  // 📊 QUERY: Buscar Boards com Estatísticas (PostgreSQL)
  static async getBoardsWithStats(limit: number = 20, offset: number = 0) {
    try {
      return await OptimizedQueries.getBoardsWithStatsOptimized(limit, offset) as any[];
    } catch (error) {
      console.error('QUERY: Erro em getBoardsWithStats:', error);
      throw error;
    }
  }

  // 📋 QUERY: Buscar Tasks de um Board (PostgreSQL)
  static async getBoardTasks(boardId: string, limit: number = 100, offset: number = 0) {
    const startTime = Date.now();
    
    try {
      return await OptimizedQueries.getBoardTasksOptimized(boardId, limit, offset) as any[];
    } catch (error) {
      console.error('QUERY: Erro em getBoardTasks:', error);
      throw error;
    }
  }

  // 👤 QUERY: Buscar Usuário com Permissões (PostgreSQL)
  static async getUserWithPermissions(userId: string) {
    const startTime = Date.now();
    
    try {
      // 🥇 PRIMEIRA TENTATIVA: Cache (Ultra-rápido)
      const cached = await cache.get(CacheKeys.userWithPermissions(userId));
      if (cached) {
        const duration = Date.now() - startTime;
        console.log(`⚡ [QUERY-CACHE] Usuário em ${duration}ms (Cache)`);
        return cached;
      }
      
      // 🔄 SEGUNDA TENTATIVA: PostgreSQL (Source of Truth)
      const result = await OptimizedQueries.getUserWithPermissionsOptimized(userId);
      
      // Cache por 30 minutos se obtido com sucesso
      if (result) {
        await cache.set(
          CacheKeys.userWithPermissions(userId), 
          result, 
          TTL.MEDIUM
        );
      }
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] Usuário em ${duration}ms (PostgreSQL)`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getUserWithPermissions após ${duration}ms:`, error);
      throw error;
    }
  }

  // 📊 QUERY: Analytics Ultra-Rápidos (PostgreSQL)
  static async getAnalytics() {
    const startTime = Date.now();
    
    try {
      // 🥇 PRIMEIRA TENTATIVA: Cache (Ultra-rápido)
      const cached = await cache.get(CacheKeys.analytics());
      if (cached) {
        const duration = Date.now() - startTime;
        console.log(`⚡ [QUERY-CACHE] Analytics em ${duration}ms (Cache)`);
        return cached;
      }

      // 🔄 SEGUNDA TENTATIVA: PostgreSQL com cache
      const result = await OptimizedQueries.getAnalyticsOptimized();
      
      // Cache por 5 minutos
      if (result) {
        await cache.set(CacheKeys.analytics(), result, TTL.SHORT);
      }
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] Analytics em ${duration}ms (PostgreSQL)`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getAnalytics após ${duration}ms:`, error);
      throw error;
    }
  }

  // 🔍 QUERY: Buscar Tasks por Filtros (PostgreSQL)
  static async getTasksByFilters(filters: any, limit: number = 50, offset: number = 0) {
    const startTime = Date.now();
    
    try {
      const cacheKey = `tasks:filtered:${JSON.stringify(filters)}:${limit}:${offset}`;
      
      // Cache por 2 minutos para queries filtradas
      const cached = await cache.get(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        console.log(`⚡ [QUERY-CACHE] Tasks filtradas em ${duration}ms (Cache)`);
        return cached;
      }

      const result = await OptimizedQueries.getTasksByFiltersOptimized(filters, limit, offset);
      
      if (result) {
        await cache.set(cacheKey, result, 120); // 2 minutos
      }
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] Tasks filtradas em ${duration}ms (PostgreSQL)`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getTasksByFilters após ${duration}ms:`, error);
      throw error;
    }
  }

  // 🏃‍♂️ QUERY: Performance Metrics (PostgreSQL)
  static async getPerformanceMetrics() {
    const startTime = Date.now();
    
    try {
      const cached = await cache.get(CacheKeys.performanceMetrics());
      if (cached) {
        const duration = Date.now() - startTime;
        console.log(`⚡ [QUERY-CACHE] Performance em ${duration}ms (Cache)`);
        return cached;
      }

      const result = await OptimizedQueries.getPerformanceMetricsOptimized();
      
      if (result) {
        await cache.set(CacheKeys.performanceMetrics(), result, TTL.SHORT);
      }
      
      const duration = Date.now() - startTime;
      console.log(`🔄 [QUERY-PG] Performance em ${duration}ms (PostgreSQL)`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [QUERY] Erro em getPerformanceMetrics após ${duration}ms:`, error);
      throw error;
    }
  }
}

/**
 * 🎯 CACHE KEYS - Chaves padronizadas para cache
 */
export const QueryCacheKeys = {
  boardsWithStats: (limit: number, offset: number) => `boards:stats:${limit}:${offset}`,
  boardTasks: (boardId: string, limit: number, offset: number) => `board:${boardId}:tasks:${limit}:${offset}`,
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  analytics: () => 'analytics:global',
  performanceMetrics: () => 'performance:metrics',
  tasksByFilters: (filters: any, limit: number, offset: number) => `tasks:filtered:${JSON.stringify(filters)}:${limit}:${offset}`,
};

export default QueryHandlers;