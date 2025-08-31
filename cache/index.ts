/**
 * 🚀 CACHE UTIL ÚNICO - Interface Simplificada para Cache
 * 
 * RESPONSABILIDADES:
 * - Interface unificada e limpa para operações de cache
 * - Simplificar uso nos services com apenas 3 métodos essenciais
 * - Centralizar toda lógica de invalidação
 * 
 * DESIGN:
 * - get<T>(key): buscar valor tipado
 * - set(key, value, ttl): definir com TTL em segundos
 * - invalidate(keys[]): invalidar múltiplas chaves de uma vez
 */

import { cache as cacheManager } from '../server/cache';
import { Logger } from '../server/utils/logMessages';

/**
 * 💎 CACHE UTIL - Interface Clean e Unificada
 */
export class CacheUtil {
  
  /**
   * 🔍 Buscar valor do cache com tipagem
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await cacheManager.get<T>(key);
    } catch (error) {
      Logger.error.generic('CACHE-UTIL-GET', error);
      return null;
    }
  }

  /**
   * 💾 Definir valor no cache com TTL
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await cacheManager.set(key, value, ttl);
    } catch (error) {
      Logger.error.generic('CACHE-UTIL-SET', error);
    }
  }

  /**
   * 🗑️ Invalidar múltiplas chaves de uma vez
   * Suporta patterns com * e chaves exatas
   */
  async invalidate(keys: string[]): Promise<void> {
    try {
      Logger.cache.invalidate(keys.join(', '));
      
      await Promise.all(
        keys.map(key => {
          if (key.includes('*')) {
            return cacheManager.invalidatePattern(key);
          } else {
            return cacheManager.del(key);
          }
        })
      );
    } catch (error) {
      Logger.error.generic('CACHE-UTIL-INVALIDATE', error);
    }
  }
}

// 🎯 Instância singleton exportada
export const cache = new CacheUtil();

// 📤 Export individual dos métodos para conveniência
export const { get, set, invalidate } = cache;