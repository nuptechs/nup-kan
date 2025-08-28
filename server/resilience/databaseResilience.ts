/**
 * 🛡️ DATABASE RESILIENCE SERVICE
 * 
 * Sistema completo de resiliência para produção:
 * - Circuit Breaker Pattern
 * - Retry com backoff exponencial  
 * - Health checks automáticos
 * - Fallback para operações críticas
 * - Monitoramento em tempo real
 */

interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailTime: number;
  successCount: number;
}

export class DatabaseResilience {
  private static instance: DatabaseResilience;
  private circuitBreaker: CircuitBreakerState;
  private readonly MAX_FAILURES = 5;
  private readonly RECOVERY_TIME = 30000; // 30 segundos
  private readonly RETRY_ATTEMPTS = 3;
  
  private constructor() {
    this.circuitBreaker = {
      isOpen: false,
      failures: 0,
      lastFailTime: 0,
      successCount: 0
    };
    
    // Health check a cada 1 minuto
    setInterval(() => this.healthCheck(), 60000);
  }
  
  public static getInstance(): DatabaseResilience {
    if (!DatabaseResilience.instance) {
      DatabaseResilience.instance = new DatabaseResilience();
    }
    return DatabaseResilience.instance;
  }
  
  /**
   * Executa operação com resiliência completa
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // 1. Verificar Circuit Breaker
    if (this.isCircuitOpen()) {
      console.warn(`🚨 [RESILIENCE] Circuit breaker aberto para ${operationName}`);
      if (fallback) {
        console.log(`🔄 [RESILIENCE] Usando fallback para ${operationName}`);
        return await fallback();
      }
      throw new Error(`Serviço temporariamente indisponível: ${operationName}`);
    }
    
    // 2. Executar com retry
    return this.executeWithRetry(operation, operationName);
  }
  
  /**
   * Retry com backoff exponencial
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await operation();
        
        // Sucesso - resetar circuit breaker
        this.onSuccess();
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ [RESILIENCE] ${operationName} falhou (tentativa ${attempt}/${this.RETRY_ATTEMPTS}):`, error);
        
        // Registrar falha
        this.onFailure();
        
        // Se não é a última tentativa, aguardar backoff
        if (attempt < this.RETRY_ATTEMPTS) {
          const backoffTime = Math.pow(2, attempt) * 1000; // Exponencial: 2s, 4s, 8s
          console.log(`⏳ [RESILIENCE] Aguardando ${backoffTime}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // Todas as tentativas falharam
    throw lastError!;
  }
  
  /**
   * Verificar se circuit breaker está aberto
   */
  private isCircuitOpen(): boolean {
    const now = Date.now();
    
    // Se está fechado, continuar fechado
    if (!this.circuitBreaker.isOpen) {
      return false;
    }
    
    // Verificar se passou o tempo de recuperação
    if (now - this.circuitBreaker.lastFailTime > this.RECOVERY_TIME) {
      console.log('🔄 [RESILIENCE] Tentando fechar circuit breaker...');
      this.circuitBreaker.isOpen = false;
      return false;
    }
    
    return true;
  }
  
  /**
   * Registrar sucesso
   */
  private onSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.successCount++;
    
    if (this.circuitBreaker.isOpen) {
      console.log('✅ [RESILIENCE] Circuit breaker fechado - serviço recuperado');
      this.circuitBreaker.isOpen = false;
    }
  }
  
  /**
   * Registrar falha
   */
  private onFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailTime = Date.now();
    
    if (this.circuitBreaker.failures >= this.MAX_FAILURES && !this.circuitBreaker.isOpen) {
      console.error('🚨 [RESILIENCE] Circuit breaker aberto - muitas falhas detectadas');
      this.circuitBreaker.isOpen = true;
    }
  }
  
  /**
   * Health check automático
   */
  private async healthCheck(): Promise<void> {
    try {
      // Tentar operação simples no banco
      const { db } = await import('../db');
      await db.execute(sql`SELECT 1 as health_check`);
      
      console.log('💚 [RESILIENCE] Health check passou - banco saudável');
      
    } catch (error) {
      console.error('💔 [RESILIENCE] Health check falhou:', error);
      this.onFailure();
    }
  }
  
  /**
   * Obter métricas do sistema
   */
  getMetrics() {
    return {
      circuitBreakerOpen: this.circuitBreaker.isOpen,
      totalFailures: this.circuitBreaker.failures,
      totalSuccesses: this.circuitBreaker.successCount,
      lastFailTime: this.circuitBreaker.lastFailTime,
      isHealthy: !this.circuitBreaker.isOpen && this.circuitBreaker.failures === 0
    };
  }
}

// Instância global
export const resilience = DatabaseResilience.getInstance();