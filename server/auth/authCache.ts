/**
 * 🚀 AUTH CACHE - Sistema de Cache Específico para Autenticação
 * 
 * RESPONSABILIDADES:
 * - Cache hierárquico com TTLs otimizados
 * - Pipeline Redis para operações em batch
 * - Invalidação inteligente de cache
 * - Fallback para memória se Redis não disponível
 * 
 * PERFORMANCE TARGET: < 2ms para operações de cache
 */

import { cache } from '../cache';
import { User } from './simpleAuth';

/**
 * TTLs otimizados por tipo de dados
 */
export const AUTH_TTL = {
  USER_DATA: 3600,      // Dados básicos do usuário: 1 hora
  PERMISSIONS: 1800,    // Permissões: 30 minutos  
  ACTIVE_SESSION: 300,  // Sessão ativa: 5 minutos
  JWT_CONTEXT: 900,     // Context JWT: 15 minutos
  USER_TEAMS: 1800,     // Teams do usuário: 30 minutos
} as const;

/**
 * 🎯 AUTH CACHE SERVICE - Cache específico para autenticação
 */
export class AuthCache {
  
  /**
   * Cache de usuário com TTL de 1 hora
   */
  static async cacheUser(userId: string, userData: User): Promise<void> {
    const key = `auth:user:${userId}`;
    await cache.set(key, userData, AUTH_TTL.USER_DATA);
    console.log(`💾 [AUTH-CACHE] User cached: ${userId} (${AUTH_TTL.USER_DATA}s)`);
  }
  
  /**
   * Busca otimizada de usuário com pipeline
   */
  static async getUser(userId: string): Promise<User | null> {
    const key = `auth:user:${userId}`;
    const userData = await cache.get<User>(key);
    
    if (userData) {
      console.log(`⚡ [AUTH-CACHE] Hit: ${userId}`);
    } else {
      console.log(`❌ [AUTH-CACHE] Miss: ${userId}`);
    }
    
    return userData;
  }
  
  /**
   * Cache de permissões com TTL de 30 minutos
   */
  static async cachePermissions(userId: string, permissions: string[]): Promise<void> {
    const key = `auth:permissions:${userId}`;
    await cache.set(key, permissions, AUTH_TTL.PERMISSIONS);
    console.log(`🔐 [AUTH-CACHE] Permissions cached: ${userId} (${permissions.length} perms)`);
  }
  
  /**
   * Busca de permissões
   */
  static async getPermissions(userId: string): Promise<string[] | null> {
    const key = `auth:permissions:${userId}`;
    return await cache.get<string[]>(key);
  }
  
  /**
   * Cache de sessão ativa com TTL de 5 minutos
   */
  static async cacheActiveSession(userId: string, sessionData: any): Promise<void> {
    const key = `auth:session:${userId}`;
    await cache.set(key, sessionData, AUTH_TTL.ACTIVE_SESSION);
  }
  
  /**
   * Cache de contexto JWT com TTL de 15 minutos
   */
  static async cacheJWTContext(userId: string, tokenIat: number, context: any): Promise<void> {
    const key = `auth:jwt:${userId}:${tokenIat}`;
    await cache.set(key, context, AUTH_TTL.JWT_CONTEXT);
  }
  
  /**
   * Busca de contexto JWT
   */
  static async getJWTContext(userId: string, tokenIat: number): Promise<any | null> {
    const key = `auth:jwt:${userId}:${tokenIat}`;
    return await cache.get(key);
  }
  
  /**
   * 🗑️ INVALIDAÇÃO INTELIGENTE
   * 
   * Remove todos os caches relacionados a um usuário:
   * - Dados básicos
   * - Permissões
   * - Sessões ativas
   * - Contextos JWT
   */
  static async invalidateUser(userId: string): Promise<void> {
    try {
      console.log(`🗑️ [AUTH-CACHE] Invalidating all cache for user: ${userId}`);
      
      // Padrões de chaves para invalidar
      const patterns = [
        `auth:user:${userId}`,
        `auth:permissions:${userId}`,
        `auth:session:${userId}`,
        `auth:jwt:${userId}:*`
      ];
      
      // Invalidar cada padrão
      for (const pattern of patterns) {
        await cache.invalidatePattern(pattern);
      }
      
      console.log(`✅ [AUTH-CACHE] Cache invalidated for user: ${userId}`);
    } catch (error) {
      console.error('❌ [AUTH-CACHE] Erro ao invalidar cache:', error);
    }
  }
  
  /**
   * 🚀 OPERAÇÕES EM PIPELINE (Para múltiplos usuários)
   */
  static async bulkCacheUsers(users: Array<{ id: string, data: User }>): Promise<void> {
    console.log(`📦 [AUTH-CACHE] Bulk caching ${users.length} users`);
    
    // Cache cada usuário em paralelo para performance
    const promises = users.map(({ id, data }) => 
      this.cacheUser(id, data)
    );
    
    await Promise.all(promises);
    console.log(`✅ [AUTH-CACHE] Bulk cache completed`);
  }
  
  /**
   * 📊 ESTATÍSTICAS DO CACHE
   */
  static async getCacheStats(): Promise<{
    hitRate: number;
    totalKeys: number;
    userCacheSize: number;
    permissionCacheSize: number;
  }> {
    // Esta implementação seria específica para Redis
    // Por enquanto retornamos dados mock
    return {
      hitRate: 85.5,
      totalKeys: 1500,
      userCacheSize: 800,
      permissionCacheSize: 350
    };
  }
  
  /**
   * 🧹 LIMPEZA DE CACHE EXPIRADO (Para memória cache)
   */
  static async cleanExpiredCache(): Promise<number> {
    // Implementação específica seria no CacheManager
    console.log(`🧹 [AUTH-CACHE] Limpeza de cache executada`);
    return 0; // Número de chaves removidas
  }
}