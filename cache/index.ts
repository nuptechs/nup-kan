/**
 * 🚀 CACHE UNIFICADO - Sistema Completo de Cache
 * 
 * RESPONSABILIDADES:
 * - Cache em memória com TTL automático
 * - Interface clean: get<T>, set, invalidate
 * - Limpeza automática de chaves expiradas
 * - Logs detalhados para debugging
 */

import { Logger } from '../server/utils/logMessages';

// Cache Keys constants para reutilização
export const CacheKeys = {
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  BOARD_TASKS: (boardId: string) => `board:tasks:${boardId}`,
  BOARD_COLUMNS: (boardId: string) => `board_columns:${boardId}`,
  TASK_DETAILS: (taskId: string) => `task:details:${taskId}`,
  TEAM_MEMBERS: (teamId: string) => `team:members:${teamId}`,
  USER_TEAMS: (userId: string) => `user:teams:${userId}`,
  BOARD_STATS: (boardId: string) => `board:stats:${boardId}`,
  USER_NOTIFICATIONS: (userId: string) => `notifications:user:${userId}`,
  BOARD_SHARES: (boardId: string) => `board:shares:${boardId}`,
  HIERARCHY_DATA: (userId: string) => `hierarchy:${userId}`,
  ANALYTICS: 'analytics:global',
  ALL_BOARDS: 'boards:all',
};

// TTL constants em segundos
export const TTL = {
  SHORT: 300,        // 5 minutos
  MEDIUM: 900,       // 15 minutos  
  LONG: 1800,        // 30 minutos
  VERY_LONG: 3600,   // 1 hora
  AUTH: 1800,        // 30 minutos para auth
  PERMISSIONS: 900,  // 15 minutos para permissões
  NOTIFICATIONS: 300 // 5 minutos para notificações
};

/**
 * 🏗️ CACHE MANAGER - Implementação completa
 */
class CacheManager {
  private memoryCache = new Map<string, { data: any, expires: number }>();
  
  constructor() {
    Logger.auth.permissionSync('Memory cache system started');
    // Limpeza automática a cada 5 minutos
    setInterval(() => this.cleanMemoryCache(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() < cached.expires) {
        Logger.cache.hit(key);
        return cached.data;
      }
      
      // Remover se expirado
      if (cached) {
        this.memoryCache.delete(key);
      }
      
      Logger.cache.miss(key);
      return null;
    } catch (error) {
      Logger.error.generic('CACHE-GET', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      this.memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttlSeconds * 1000)
      });
      Logger.cache.set(key, ttlSeconds);
      
      // Limpeza preventiva se cache muito grande
      if (this.memoryCache.size > 1000) {
        this.cleanMemoryCache();
      }
    } catch (error) {
      Logger.error.generic('CACHE-SET', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const deleted = this.memoryCache.delete(key);
      if (deleted) {
        Logger.cache.invalidate(key);
      }
    } catch (error) {
      Logger.error.generic('CACHE-DEL', error);
    }
  }

  /**
   * 🗑️ Invalidar múltiplas chaves de uma vez
   */
  async invalidate(keys: string[]): Promise<void> {
    try {
      Logger.cache.invalidate(keys.join(', '));
      
      await Promise.all(
        keys.map(key => {
          if (key.includes('*')) {
            // Pattern matching para wildcards
            return this.invalidatePattern(key);
          } else {
            // Chave exata
            return this.del(key);
          }
        })
      );
    } catch (error) {
      Logger.error.generic('CACHE-INVALIDATE', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const keysToDelete: string[] = [];
      
      for (const key of Array.from(this.memoryCache.keys())) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.memoryCache.delete(key));
      Logger.cache.invalidate(`Pattern: ${pattern} (${keysToDelete.length} keys)`);
    } catch (error) {
      Logger.error.generic('CACHE-INVALIDATE-PATTERN', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const size = this.memoryCache.size;
      this.memoryCache.clear();
      Logger.cache.invalidate(`ALL_CACHE_CLEARED (${size} keys)`);
    } catch (error) {
      Logger.error.generic('CACHE-CLEAR', error);
    }
  }

  private cleanMemoryCache(): void {
    const now = Date.now();
    let expired = 0;
    
    for (const [key, cached] of Array.from(this.memoryCache.entries())) {
      if (now >= cached.expires) {
        this.memoryCache.delete(key);
        expired++;
      }
    }
    
    if (expired > 0) {
      Logger.cache.invalidate(`AUTO_CLEANUP: ${expired} expired keys removed`);
    }
  }

  getSize(): number {
    return this.memoryCache.size;
  }
}

// Singleton instance
const cacheManager = new CacheManager();

/**
 * 💎 CACHE UTIL - Interface Externa Simplificada
 */
export class CacheUtil {
  
  /**
   * 🔍 Buscar valor do cache com tipagem
   */
  async get<T>(key: string): Promise<T | null> {
    return await cacheManager.get<T>(key);
  }

  /**
   * 💾 Definir valor no cache com TTL
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await cacheManager.set(key, value, ttl);
  }

  /**
   * 🗑️ Invalidar múltiplas chaves de uma vez
   */
  async invalidate(keys: string[]): Promise<void> {
    await cacheManager.invalidate(keys);
  }

  /**
   * 🧹 Limpar todo o cache
   */
  async clear(): Promise<void> {
    await cacheManager.clear();
  }

  /**
   * 📊 Obter tamanho do cache
   */
  getSize(): number {
    return cacheManager.getSize();
  }
}

// Export da instância única
export const cache = new CacheUtil();
export default cache;