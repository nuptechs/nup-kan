/**
 * 🚨 PERMISSION SYSTEM ERROR - Classe de erro customizada para falhas do sistema de permissões
 */

export class PermissionSystemError extends Error {
  public readonly code: string;
  public readonly originalError?: Error;
  public readonly userId?: string;
  public readonly timestamp: Date;

  constructor(
    message: string, 
    originalError?: Error, 
    code: string = 'PERMISSION_SYSTEM_ERROR',
    userId?: string
  ) {
    super(message);
    this.name = 'PermissionSystemError';
    this.code = code;
    this.originalError = originalError;
    this.userId = userId;
    this.timestamp = new Date();

    // Manter stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionSystemError);
    }
  }

  /**
   * Serializar erro para logging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userId: this.userId,
      timestamp: this.timestamp.toISOString(),
      originalError: this.originalError?.message,
      stack: this.stack
    };
  }

  /**
   * Determinar se é um erro crítico que requer failfast
   */
  isCritical(): boolean {
    const criticalCodes = [
      'AUTH_CONTEXT_CORRUPTED',
      'PERMISSION_DATA_CORRUPTED',
      'USER_DATA_MISSING'
    ];
    return criticalCodes.includes(this.code);
  }
}

/**
 * Factory functions para diferentes tipos de erro
 */
export const PermissionErrors = {
  authContextCorrupted: (error?: Error, userId?: string) => 
    new PermissionSystemError(
      'Contexto de autenticação corrompido', 
      error, 
      'AUTH_CONTEXT_CORRUPTED', 
      userId
    ),

  permissionDataCorrupted: (userId?: string) => 
    new PermissionSystemError(
      'Dados de permissões corrompidos', 
      undefined, 
      'PERMISSION_DATA_CORRUPTED', 
      userId
    ),

  userDataMissing: (userId?: string) => 
    new PermissionSystemError(
      'Dados do usuário não encontrados', 
      undefined, 
      'USER_DATA_MISSING', 
      userId
    ),

  loadingTimeout: (userId?: string) => 
    new PermissionSystemError(
      'Timeout ao carregar permissões', 
      undefined, 
      'LOADING_TIMEOUT', 
      userId
    )
};