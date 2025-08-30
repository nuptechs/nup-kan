// Cache Manager Simplificado - Apenas Memória (Redis removido)

class CacheManager {
  private memoryCache = new Map<string, { data: any, expires: number }>();
  
  constructor() {
    console.log('💾 [CACHE] Iniciando sistema de cache em memória');
    // Limpeza automática a cada 5 minutos
    setInterval(() => this.cleanMemoryCache(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() < cached.expires) {
        console.log(`🎯 [CACHE-HIT] '${key}'`);
        return cached.data;
      }
      
      // Remover se expirado
      if (cached) {
        this.memoryCache.delete(key);
      }
      
      console.log(`❌ [CACHE-MISS] '${key}'`);
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Erro ao buscar:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      this.memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttlSeconds * 1000)
      });
      console.log(`💾 [CACHE-SET] '${key}' (TTL: ${ttlSeconds}s)`);
      
      // Limpeza preventiva se cache muito grande
      if (this.memoryCache.size > 1000) {
        this.cleanMemoryCache();
      }
    } catch (error) {
      console.error('❌ [CACHE] Erro ao salvar:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const deleted = this.memoryCache.delete(key);
      if (deleted) {
        console.log(`🗑️ [CACHE-DEL] '${key}'`);
      }
    } catch (error) {
      console.error('❌ [CACHE] Erro ao deletar:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const searchPattern = pattern.replace('*', '');
      const keysToDelete: string[] = [];
      
      for (const key of Array.from(this.memoryCache.keys())) {
        if (key.includes(searchPattern)) {
          keysToDelete.push(key);
          this.memoryCache.delete(key);
        }
      }
      
      console.log(`🧹 [CACHE-INVALIDATE] ${keysToDelete.length} chaves para padrão '${pattern}'`);
    } catch (error) {
      console.error('❌ [CACHE] Erro ao invalidar padrão:', error);
    }
  }

  private cleanMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of Array.from(this.memoryCache.entries())) {
      if (now > value.expires) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [CACHE-CLEANUP] ${cleaned} chaves expiradas removidas`);
    }
  }

  // Métricas de cache
  async getStats(): Promise<{ hits: number, misses: number, size: number }> {
    return {
      hits: 0,
      misses: 0,
      size: this.memoryCache.size
    };
  }

  // Método para debug
  getDebugInfo(): { size: number, keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
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

// TTL constants (Time To Live em segundos) - OTIMIZADO PARA MEMÓRIA
export const TTL = {
  SHORT: 300,     // 5 minutos - dados que mudam frequentemente
  MEDIUM: 1800,   // 30 minutos - dados moderadamente estáveis  
  LONG: 7200,     // 2 horas - dados muito estáveis
  VERY_LONG: 14400 // 4 horas - dados quase estáticos (reduzido para economizar memória)
} as const;