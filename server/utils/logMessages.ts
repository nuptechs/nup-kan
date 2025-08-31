/**
 * 📝 SERVER LOG MESSAGES - Sistema Centralizado de Logs Backend
 * 
 * Sistema para centralizar todas as mensagens de console do servidor,
 * organizadas por categoria para facilitar manutenção e consistência.
 * 
 * Benefícios:
 * - ✅ Mensagens organizadas e consistentes
 * - ✅ Facilita desabilitar/habilitar logs por categoria  
 * - ✅ Melhora manutenibilidade do código
 * - ✅ Padronização de formato e emojis
 */

// 💾 CACHE OPERATIONS
export const CACHE_LOGS = {
  HIT: (key: string) => `🎯 [CACHE-HIT] '${key}'`,
  MISS: (key: string) => `❌ [CACHE-MISS] '${key}'`,
  SET: (key: string, ttl?: number) => `💾 [CACHE-SET] '${key}'${ttl ? ` (TTL: ${ttl}s)` : ''}`,
  INVALIDATE: (pattern: string) => `🧹 [CACHE-INVALIDATE] Pattern: '${pattern}'`,
  BOARDS_HIT: (cacheKey: string) => `🚀 [CACHE HIT] Boards servidos do cache: ${cacheKey}`,
  BOARDS_MISS: (type: string, id?: string) => `🔍 [CACHE MISS] Buscando ${type}${id ? ` para: ${id}` : ''} no banco`,
} as const;

// 🔒 SECURITY & ACCESS CONTROL
export const SECURITY_LOGS = {
  USER_BOARD_ACCESS: (userId: string, count: number) => `🔒 [SECURITY] Usuário ${userId} pode acessar ${count} boards`,
  ACCESS_DENIED: (userId: string, resource: string) => `🚫 [SECURITY] Acesso negado - ${userId} -> ${resource}`,
  PERMISSION_CHECK: (userId: string, permission: string, result: 'GRANTED' | 'DENIED') => `${result === 'GRANTED' ? '✅' : '❌'} [AUTHORIZATION] User ${userId} -> ${permission}: ${result}`,
} as const;

// 🔄 DATABASE TRANSACTIONS
export const TRANSACTION_LOGS = {
  INITIALIZING: (boardId: string) => `🔄 [TRANSACTION] Initializing board ${boardId} with default data`,
  ALREADY_HAS_COLUMNS: (boardId: string) => `⚠️ [TRANSACTION] Board ${boardId} already has columns, skipping initialization`,
  STARTING: (boardId: string) => `🔒 [TRANSACTION] Iniciando transação para board ${boardId}`,
  COLUMN_INSERTED: (title: string, boardId: string) => `✅ [TRANSACTION] Coluna "${title}" inserida para board ${boardId}`,
  BOARD_INITIALIZED: (boardId: string, count: number) => `✅ [TRANSACTION] Board ${boardId} inicializado com ${count} colunas (transação concluída)`,
  REORDERING_COLUMNS: (columns: any[]) => `🔄 [TRANSACTION] Reordenando columns: ${JSON.stringify(columns.map(c => ({ id: c.id, position: c.position })))}`,
  STARTING_REORDER: (count: number) => `🔒 [TRANSACTION] Iniciando transação para reordenar ${count} columns`,
  COLUMN_UPDATED: (id: string, position: number, rowCount: number) => `✅ [TRANSACTION] Column ${id} -> position ${position}, rowCount: ${rowCount}`,
  COLUMN_NOT_UPDATED: (id: string) => `❌ [TRANSACTION] Column ${id} não foi atualizada`,
  REORDER_SUCCESS: () => `✅ [TRANSACTION] Todas as columns reordenadas com sucesso (transação concluída)`,
  REORDERING_TASKS: (tasks: any[]) => `🔄 [TRANSACTION] Reordenando tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, position: t.position })))}`,
} as const;

// ⚠️ ERROR HANDLING
export const ERROR_LOGS = {
  EVENT_CREATION_FAILED: (error: any) => `⚠️  DatabaseStorage: Event creation failed, but task was created:`,
  TASK_CREATION_FAILED: (error: any) => `❌ DatabaseStorage: Task creation failed:`,
  GENERIC_ERROR: (context: string, error: any) => `❌ [${context}] Error:`,
} as const;

// 🔷 SERVICE OPERATIONS
export const SERVICE_LOGS = {
  BOARD_SERVICE: (operation: string, params: any) => `🔷 [BOARD-SERVICE] ${operation} ${JSON.stringify(params)}`,
  USER_SERVICE: (operation: string, params: any) => `🔷 [USER-SERVICE] ${operation} ${JSON.stringify(params)}`,
  TASK_SERVICE: (operation: string, params: any) => `🔷 [TASK-SERVICE] ${operation} ${JSON.stringify(params)}`,
  COLUMN_SERVICE: (operation: string, params: any) => `🔷 [COLUMN-SERVICE] ${operation} ${JSON.stringify(params)}`,
  TAG_SERVICE: (operation: string, params: any) => `🔷 [TAG-SERVICE] ${operation} ${JSON.stringify(params)}`,
  TEAM_SERVICE: (operation: string, params: any) => `🔷 [TEAM-SERVICE] ${operation} ${JSON.stringify(params)}`,
  CACHE_HIT: (service: string, details: any) => `🔷 [${service.toUpperCase()}] cache hit ${JSON.stringify(details)}`,
  OPERATION_COMPLETE: (service: string, operation: string, details: any) => `🔷 [${service.toUpperCase()}] ${operation} ${JSON.stringify(details)}`,
} as const;

// 🎪 EVENTS & WORKERS
export const EVENT_LOGS = {
  WORKER_LOCAL: () => `🎪 [EVENT-WORKER] Sistema funcionando em modo local`,
  WORKER_PRODUCTION: () => `🎪 [EVENT-WORKER] Sistema funcionando em modo produção`,
  EVENT_EMITTED: (eventType: string, data: any) => `📡 [EVENT] ${eventType} emitted: ${JSON.stringify(data)}`,
} as const;

// 🔐 PERMISSIONS & AUTH
export const AUTH_LOGS = {
  TOKEN_VALIDATED: (email: string) => `✅ [UNIFIED-AUTH] Token validado para: ${email}`,
  CACHE_HIT_AUTH: (userId: string) => `🎯 [UNIFIED-AUTH] Cache hit para usuário: ${userId}`,
  USER_AUTHENTICATED: (userId: string) => `✅ [CURRENT-USER-JWT] Usuário autenticado via JWT: ${userId}`,
  PERMISSION_SYNC: (message: string) => `🔧 [PERMISSION SYNC] ${message}`,
  PROFILE_ADMIN_IDENTIFIED: (name: string, id: string) => `👤 [PERMISSION SYNC] Perfil administrador identificado: ${name} (${id})`,
} as const;

// 🚀 EXPRESS SERVER
export const EXPRESS_LOGS = {
  REQUEST: (method: string, path: string, status: number, duration: number, details?: string) => 
    `${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })} [express] ${method} ${path} ${status} in ${duration}ms${details ? ` :: ${details}` : ''}`,
  SERVER_START: (port: number) => `${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })} [express] serving on port ${port}`,
} as const;

// 🎯 CENTRAL LOGGER CLASS
export class Logger {
  private static enabled = true;
  
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  static cache = {
    hit: (key: string) => this.enabled && console.log(CACHE_LOGS.HIT(key)),
    miss: (key: string) => this.enabled && console.log(CACHE_LOGS.MISS(key)),
    set: (key: string, ttl?: number) => this.enabled && console.log(CACHE_LOGS.SET(key, ttl)),
    invalidate: (pattern: string) => this.enabled && console.log(CACHE_LOGS.INVALIDATE(pattern)),
  };
  
  static security = {
    userBoardAccess: (userId: string, count: number) => this.enabled && console.log(SECURITY_LOGS.USER_BOARD_ACCESS(userId, count)),
    accessDenied: (userId: string, resource: string) => this.enabled && console.log(SECURITY_LOGS.ACCESS_DENIED(userId, resource)),
    permissionCheck: (userId: string, permission: string, result: 'GRANTED' | 'DENIED') => this.enabled && console.log(SECURITY_LOGS.PERMISSION_CHECK(userId, permission, result)),
  };
  
  static transaction = {
    initializing: (boardId: string) => this.enabled && console.log(TRANSACTION_LOGS.INITIALIZING(boardId)),
    alreadyHasColumns: (boardId: string) => this.enabled && console.log(TRANSACTION_LOGS.ALREADY_HAS_COLUMNS(boardId)),
    starting: (boardId: string) => this.enabled && console.log(TRANSACTION_LOGS.STARTING(boardId)),
    columnInserted: (title: string, boardId: string) => this.enabled && console.log(TRANSACTION_LOGS.COLUMN_INSERTED(title, boardId)),
    boardInitialized: (boardId: string, count: number) => this.enabled && console.log(TRANSACTION_LOGS.BOARD_INITIALIZED(boardId, count)),
    reorderingColumns: (columns: any[]) => this.enabled && console.log(TRANSACTION_LOGS.REORDERING_COLUMNS(columns)),
    startingReorder: (count: number) => this.enabled && console.log(TRANSACTION_LOGS.STARTING_REORDER(count)),
    columnUpdated: (id: string, position: number, rowCount: number) => this.enabled && console.log(TRANSACTION_LOGS.COLUMN_UPDATED(id, position, rowCount)),
    columnNotUpdated: (id: string) => this.enabled && console.log(TRANSACTION_LOGS.COLUMN_NOT_UPDATED(id)),
    reorderSuccess: () => this.enabled && console.log(TRANSACTION_LOGS.REORDER_SUCCESS()),
    reorderingTasks: (tasks: any[]) => this.enabled && console.log(TRANSACTION_LOGS.REORDERING_TASKS(tasks)),
  };
  
  static error = {
    eventCreationFailed: (error: any) => this.enabled && console.error(ERROR_LOGS.EVENT_CREATION_FAILED(error), error),
    taskCreationFailed: (error: any) => this.enabled && console.error(ERROR_LOGS.TASK_CREATION_FAILED(error), error),
    generic: (context: string, error: any) => this.enabled && console.error(ERROR_LOGS.GENERIC_ERROR(context, error), error),
  };
  
  static service = {
    operation: (service: string, operation: string, params: any) => {
      switch(service.toLowerCase()) {
        case 'board':
          return this.enabled && console.log(SERVICE_LOGS.BOARD_SERVICE(operation, params));
        case 'user':
          return this.enabled && console.log(SERVICE_LOGS.USER_SERVICE(operation, params));
        case 'task':
          return this.enabled && console.log(SERVICE_LOGS.TASK_SERVICE(operation, params));
        case 'column':
          return this.enabled && console.log(SERVICE_LOGS.COLUMN_SERVICE(operation, params));
        case 'tag':
          return this.enabled && console.log(SERVICE_LOGS.TAG_SERVICE(operation, params));
        case 'team':
          return this.enabled && console.log(SERVICE_LOGS.TEAM_SERVICE(operation, params));
        default:
          return this.enabled && console.log(SERVICE_LOGS.BOARD_SERVICE(operation, params));
      }
    },
    cacheHit: (service: string, details: any) => this.enabled && console.log(SERVICE_LOGS.CACHE_HIT(service, details)),
    operationComplete: (service: string, operation: string, details: any) => this.enabled && console.log(SERVICE_LOGS.OPERATION_COMPLETE(service, operation, details)),
  };
  
  static auth = {
    tokenValidated: (email: string) => this.enabled && console.log(AUTH_LOGS.TOKEN_VALIDATED(email)),
    cacheHit: (userId: string) => this.enabled && console.log(AUTH_LOGS.CACHE_HIT_AUTH(userId)),
    userAuthenticated: (userId: string) => this.enabled && console.log(AUTH_LOGS.USER_AUTHENTICATED(userId)),
    permissionSync: (message: string) => this.enabled && console.log(AUTH_LOGS.PERMISSION_SYNC(message)),
    profileAdminIdentified: (name: string, id: string) => this.enabled && console.log(AUTH_LOGS.PROFILE_ADMIN_IDENTIFIED(name, id)),
  };
  
  static express = {
    request: (method: string, path: string, status: number, duration: number, details?: string) => 
      this.enabled && console.log(EXPRESS_LOGS.REQUEST(method, path, status, duration, details)),
    serverStart: (port: number) => this.enabled && console.log(EXPRESS_LOGS.SERVER_START(port)),
  };
}