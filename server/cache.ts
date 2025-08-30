// Cache Manager Otimizado - Redis + Memória como fallback
import { createClient } from 'redis';
import Redis from 'ioredis';

class CacheManager {
  private redis: any | null = null;
  private memoryCache = new Map<string, { data: any, expires: number }>();
  private isRedisEnabled = false;
  
  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          keepAlive: true,
        },
      });
      await this.redis.connect();
      this.isRedisEnabled = true;
      console.log('🟢 [CACHE] Redis conectado com sucesso');
    } catch (error) {
      console.error('🔴 [CACHE] Erro conectando Redis, usando cache em memória:', error);
      this.redis = null;
      this.isRedisEnabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Tentar Redis primeiro se disponível
      if (this.isRedisEnabled && this.redis) {
        const result = await this.redis.get(key);
        if (result) {
          return JSON.parse(result);
        }
        return null;
      }
      
      // Fallback para memória
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() < cached.expires) {
        return cached.data;
      }
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Erro ao buscar:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      // Tentar Redis primeiro se disponível
      if (this.isRedisEnabled && this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        console.log(`💾 [CACHE-REDIS] Salvando chave: '${key}' (TTL: ${ttlSeconds}s)`);
        return;
      }
      
      // Fallback para memória
      this.memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttlSeconds * 1000)
      });
      console.log(`💾 [CACHE-MEMORY] Salvando chave: '${key}' (TTL: ${ttlSeconds}s)`);
      this.cleanMemoryCache();
    } catch (error) {
      console.error('❌ [CACHE] Erro ao salvar:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      // Deletar do Redis se disponível
      if (this.isRedisEnabled && this.redis) {
        await this.redis.del(key);
      }
      
      // Deletar da memória também
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('❌ [CACHE] Erro ao deletar:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let totalDeleted = 0;
      
      // Invalidar no Redis se disponível
      if (this.isRedisEnabled && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          totalDeleted += keys.length;
          console.log(`🧹 [CACHE-REDIS] Invalidou ${keys.length} chaves para padrão '${pattern}'`);
        }
      }
      
      // Invalidar na memória
      const searchPattern = pattern.replace('*', '');
      const keysToDelete: string[] = [];
      
      for (const key of Array.from(this.memoryCache.keys())) {
        if (key.includes(searchPattern)) {
          keysToDelete.push(key);
          this.memoryCache.delete(key);
        }
      }
      
      totalDeleted += keysToDelete.length;
      console.log(`🧹 [CACHE] Invalidou total de ${totalDeleted} chaves para padrão '${pattern}'`);
    } catch (error) {
      console.error('❌ [CACHE] Erro ao invalidar padrão:', error);
    }
  }

  private cleanMemoryCache(): void {
    if (this.memoryCache.size > 1000) { // Limitar cache em memória
      const now = Date.now();
      for (const [key, value] of Array.from(this.memoryCache.entries())) {
        if (now > value.expires) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  // Métricas de cache (simplificado)
  async getStats(): Promise<{ hits: number, misses: number, size: number }> {
    return {
      hits: 0,
      misses: 0,
      size: this.memoryCache.size
    };
  }
}

// Singleton para usar em toda aplicação
export const cache = new CacheManager();

// Funções helper para cache de dados específicos
export const CacheKeys = {
  USER_PERMISSIONS: (userId: string) => `user_permissions:${userId}`,
  USER_DATA: (userId: string) => `user:${userId}`,
  BOARD_DATA: (boardId: string) => `board:${boardId}`,
  BOARD_COLUMNS: (boardId: string) => `board_columns:${boardId}`,
  BOARD_TASKS: (boardId: string) => `board_tasks:${boardId}`,
  ANALYTICS: 'analytics:global',
  ALL_BOARDS: 'boards:all',
} as const;

// TTL constants (Time To Live em segundos) - OTIMIZADO PARA PERFORMANCE
export const TTL = {
  SHORT: 300,     // 5 minutos - dados que mudam frequentemente
  MEDIUM: 1800,   // 30 minutos - dados moderadamente estáveis  
  LONG: 7200,     // 2 horas - dados muito estáveis
  VERY_LONG: 14400 // 4 horas - dados quase estáticos
} as const;