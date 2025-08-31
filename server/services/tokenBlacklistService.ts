import { cache, TTL } from '../cache';

/**
 * 🚀 TOKEN BLACKLIST SERVICE - Segurança avançada para logout
 * 
 * Responsabilidades:
 * - Blacklist de tokens para logout server-side
 * - Cleanup automático de tokens expirados
 * - Performance otimizada com cache em memória
 */
export class TokenBlacklistService {
  private static readonly BLACKLIST_PREFIX = 'blacklist:token:';

  /**
   * Adicionar token à blacklist
   */
  static async blacklistToken(token: string, expiryTime: number): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${token}`;
    const ttlSeconds = Math.max(0, expiryTime - Math.floor(Date.now() / 1000));
    
    if (ttlSeconds > 0) {
      await cache.set(key, 'blacklisted', ttlSeconds);
      console.log(`🚫 [BLACKLIST] Token adicionado à blacklist por ${ttlSeconds}s`);
    }
  }

  /**
   * Verificar se token está na blacklist
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.BLACKLIST_PREFIX}${token}`;
    const cleanKey = `${key}:clean`;
    
    // Primeiro verificar se já sabemos que o token não está na blacklist
    const cleanResult = await cache.get(cleanKey);
    if (cleanResult === 'not_blacklisted') {
      return false; // Token confirmado como limpo
    }
    
    // Verificar blacklist real
    const result = await cache.get(key);
    const isBlacklisted = result !== null;
    
    // Se não está na blacklist, cache por 10 minutos para evitar lookups futuros
    if (!isBlacklisted) {
      await cache.set(cleanKey, 'not_blacklisted', 10 * 60);
    }
    
    return isBlacklisted;
  }

  /**
   * Blacklist múltiplos tokens (útil para logout de todas as sessões)
   */
  static async blacklistMultipleTokens(tokens: Array<{ token: string; expiryTime: number }>): Promise<void> {
    const promises = tokens.map(({ token, expiryTime }) => 
      this.blacklistToken(token, expiryTime)
    );
    
    await Promise.all(promises);
    console.log(`🚫 [BLACKLIST] ${tokens.length} tokens adicionados à blacklist`);
  }

  /**
   * Cleanup manual (cache já faz TTL automaticamente, mas útil para debug)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    // Como usamos TTL, o cache limpa automaticamente
    // Este método existe para compatibilidade e debug
    console.log('🧹 [BLACKLIST] Cleanup automático via TTL (nenhuma ação necessária)');
    return 0;
  }

  /**
   * Obter estatísticas da blacklist
   */
  static async getBlacklistStats(): Promise<{ totalBlacklistedTokens: number }> {
    // Implementação simplificada para cache em memória
    console.log('📊 [BLACKLIST] Stats da blacklist (funcionalidade básica)');
    return {
      totalBlacklistedTokens: 0 // Cache em memória - estatística básica
    };
  }
}