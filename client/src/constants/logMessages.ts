/**
 * 📝 LOG MESSAGES - Sistema Centralizado de Logs
 * 
 * Sistema para centralizar todas as mensagens de console do aplicativo,
 * organizadas por categoria para facilitar manutenção e consistência.
 * 
 * Benefícios:
 * - ✅ Mensagens organizadas e consistentes
 * - ✅ Facilita desabilitar/habilitar logs por categoria  
 * - ✅ Melhora manutenibilidade do código
 * - ✅ Padronização de formato e emojis
 */

// 🔧 AUTENTICAÇÃO E JWT
export const AUTH_LOGS = {
  INSTANCE_CREATED: (hookId: string) => `🔧 [useAuth] Instância criada: ${hookId}`,
  JWT_REQUEST_STARTED: (authVersion: number) => `🔍 [useAuth-JWT] REQUISIÇÃO INICIADA - authVersion: ${authVersion}`,
  JWT_AUTH_CHANGE: (hookId: string, authVersion: number) => `🔥 [useAuth-JWT] AuthService.onAuthChange DISPARADO! Hook: ${hookId} authVersion: ${authVersion}`,
  JWT_VERSION_CHANGE: (prev: number, current: number) => `🔥 [useAuth-JWT] authVersion mudou de ${prev} para ${current}`,
  JWT_NO_LOCAL_TOKEN: () => `🔍 [useAuth-JWT] Sem token local`,
} as const;

// 🔐 PERMISSÕES E AUTORIZAÇÃO
export const PERMISSION_LOGS = {
  USER_PERMISSIONS: (userId: string, count: number) => `🔐 [PERMISSIONS] Usuário ${userId} tem ${count} permissões`,
  ACCESS_DENIED: (details: any) => `🚫 [SECURITY] Tentativa de acesso negada:`,
  CRITICAL_ERROR: (error: any) => `🚨 [PERMISSION-INTEGRITY] Erro crítico detectado:`,
  DATA_CORRUPTED: (data: any) => `🚨 [PERMISSION-INTEGRITY] Dados de permissões corrompidos:`,
} as const;

// 🔐 PROFILE MODE
export const PROFILE_MODE_LOGS = {
  USER_PERMISSIONS: (count: number) => `🔐 [PROFILE-MODE] Usuário tem ${count} permissões`,
  MODE_ADMIN: () => `🔐 [PROFILE-MODE] Modo determinado: admin`,
  MODE_FULL_ACCESS: () => `🔐 [PROFILE-MODE] Modo determinado: full-access`,
  MODE_READ_ONLY: () => `🔐 [PROFILE-MODE] Modo determinado: read-only`,
  CRITICAL_ERROR: (error: any) => `🚨 [PROFILE-MODE] Erro crítico ao determinar modo:`,
  INVALID_RESOURCE_CREATE: (resource: any) => `🚨 [PROFILE-MODE] Parâmetro resource inválido para canCreate: ${resource}`,
  INVALID_RESOURCE_EDIT: (resource: any) => `🚨 [PROFILE-MODE] Parâmetro resource inválido para canEdit: ${resource}`,
  INVALID_RESOURCE_DELETE: (resource: any) => `🚨 [PROFILE-MODE] Parâmetro resource inválido para canDelete: ${resource}`,
  INVALID_RESOURCE_VIEW: (resource: any) => `🚨 [PROFILE-MODE] Parâmetro resource inválido para canView: ${resource}`,
} as const;

// 🍞 SISTEMA DE TOAST  
export const TOAST_LOGS = {
  CREATING_TOAST: (id: string, props: any, duration: number) => `🍞 [TOAST] Criando toast com ID: ${id} props: ${JSON.stringify(props)} duration: ${duration}`,
  TOAST_ADDED: () => `🍞 [TOAST] Toast adicionado ao dispatch com sucesso`,
  AUTO_DISMISS: (id: string) => `🍞 [TOAST] Auto-dismiss do toast ID: ${id}`,
  TOASTER_RENDERING: (count: number, toasts: any[]) => `🍞 [TOASTER] Renderizando com ${count} toasts: ${JSON.stringify(toasts)}`,
  TOAST_INDIVIDUAL: (toast: any) => `🍞 [TOASTER] Renderizando toast individual: ${JSON.stringify(toast)}`,
} as const;

// 🛡️ PROTEÇÃO DE CONSOLE
export const CONSOLE_PROTECTION_LOGS = {
  PROTECTION_ACTIVATED: () => `%c🛡️ PROTEÇÃO MÁXIMA DE CONSOLE ATIVADA`,
  PROTECTION_STYLE: () => `color: #3b82f6; font-weight: bold; font-size: 14px; background: #eff6ff; padding: 3px 8px; border-radius: 5px;`,
  INTERCEPT_INFO: () => `%c Console protegido com defineProperty - interceptação forçada`,
  CONTROLS_INFO: () => `%c Ctrl+Shift+S: estatísticas | Ctrl+L: limpar | window.testSuppression(): teste`,
  STYLE_ITALIC: () => `color: #6b7280; font-style: italic;`,
  SUPPRESSION_TEST: () => `%c🧪 TESTE DE SUPRESSÃO`,
  SUPPRESSION_SUCCESS: () => `%c Se você vê apenas este teste e não o warning anterior, a supressão está funcionando!`,
  TEST_STYLE: () => `color: #8b5cf6; font-weight: bold; font-size: 14px;`,
  SUCCESS_STYLE: () => `color: #059669;`,
} as const;

// 🧹 APOLLO CLEANUP
export const APOLLO_CLEANUP_LOGS = {
  STARTING: () => `🧹 [APOLLO-CLEANUP] Starting Apollo cache cleanup...`,
  CLEARED_LOCALSTORAGE: (count: number) => `🧹 [APOLLO-CLEANUP] Cleared ${count} Apollo localStorage entries`,
  TIP_ERRORS: () => `%c💡 Tip: If you see Apollo errors, run clearApolloCache() in the console`,
  TIP_STYLE: () => `color: #3b82f6; font-weight: bold`,
  CLEARED_SESSIONSTORAGE: (count: number) => `🧹 [APOLLO-CLEANUP] Cleared ${count} Apollo sessionStorage entries`,
  CLEARED_SERVICE_WORKERS: (count: number) => `🧹 [APOLLO-CLEANUP] Cleared ${count} service workers`,
  CLEARED_CACHES: (count: number) => `🧹 [APOLLO-CLEANUP] Cleared ${count} Apollo caches`,
  COMPLETED_SUCCESS: () => `%c%c✅ [APOLLO-CLEANUP] Apollo cache cleanup completed successfully`,
  ERROR_DURING_CLEANUP: (error: any) => `❌ [APOLLO-CLEANUP] Error during cleanup: ${error}`,
  ERROR_CLEARING_LOCALSTORAGE: (error: any) => `❌ [APOLLO-CLEANUP] Error clearing localStorage: ${error}`,
  ERROR_CLEARING_SESSIONSTORAGE: (error: any) => `❌ [APOLLO-CLEANUP] Error clearing sessionStorage: ${error}`,
  ERROR_CLEARING_BROWSER_CACHE: (error: any) => `❌ [APOLLO-CLEANUP] Error clearing browser cache: ${error}`,
  INDEXEDDB_NOT_AVAILABLE: () => `🟡 [APOLLO-CLEANUP] IndexedDB not available`,
  DEEP_CLEAN_REMOVED_LOCAL: (key: string) => `🗑️ [APOLLO-CLEANUP] Deep clean removed localStorage key: ${key}`,
  DEEP_CLEAN_REMOVED_SESSION: (key: string) => `🗑️ [APOLLO-CLEANUP] Deep clean removed sessionStorage key: ${key}`,
  DEEP_CLEAN_COMPLETED: () => `%c%c✅ [APOLLO-CLEANUP] Deep clean completed`,
  DEEP_CLEAN_ERROR: (error: any) => `❌ [APOLLO-CLEANUP] Error during deep clean: ${error}`,
  INITIAL_CLEANUP_ERROR: (error: any) => `❌ [APOLLO-CLEANUP] Failed to run initial Apollo cleanup: ${error}`,
  GLOBAL_REFS_ERROR: (error: any) => `❌ [APOLLO-CLEANUP] Failed to clear global Apollo references: ${error}`,
  MANUAL_CLEANUP: () => `🚀 [APOLLO-CLEANUP] Running manual Apollo cache cleanup...`,
  SUCCESS_STYLE: () => `color: #10b981; font-weight: bold;`,
} as const;

// 🔴 DEBUG E TRACE
export const DEBUG_LOGS = {
  UPDATE_SUCCESS_START: () => `🔴 [UPDATE-SUCCESS] updateUserMutation.onSuccess INICIADO`,
  UPDATE_SUCCESS_CLEAR: () => `🔴 [UPDATE-SUCCESS] Limpando formulário e fechando modal`,
  TRACE_ERROR_SUCCESS: (error: any) => `🔴 [TRACE-ERROR-SUCCESS] Erro no onSuccess: ${error}`,
  TRACE_ERROR_MUTATION: () => `🔴 [TRACE-ERROR-MUTATION] updateUserMutation.onError EXECUTADO`,
  TRACE_ERROR: (error: any) => `🔴 [TRACE-ERROR] Erro na mutationFn: ${error}`,
  TRACE_RESPONSE_STATUS: (status: any) => `🔴 [TRACE-2] Response recebida - Status: ${status}`,
  TRACE_RESPONSE_JSON: (json: any) => `🔴 [TRACE-2] Response JSON: ${JSON.stringify(json)}`,
  TRACE_MUTATION_START: () => `🔴 [TRACE-1] updateUserMutation.mutationFn INICIADO`,
  TRACE_ID: (id: any) => `🔴 [TRACE-1] ID: ${id}`,
  TRACE_DATA: (data: any) => `🔴 [TRACE-1] Data: ${JSON.stringify(data)}`,
  GENERIC_DEBUG: (message: string, data?: any) => data ? `🔴 [DEBUG] ${message}: ${JSON.stringify(data)}` : `🔴 [DEBUG] ${message}`,
} as const;

// ❌ OPERAÇÕES DE USUÁRIO
export const USER_LOGS = {
  CREATE_ERROR: (error: any) => `❌ [USER-CREATE] Erro na criação: ${error}`,
  UPDATE_ERROR: (error: any) => `❌ [USER-UPDATE] Erro na atualização: ${error}`,
  DELETE_ERROR: (error: any) => `❌ [USER-DELETE] Erro na exclusão: ${error}`,
  VALIDATION_ERROR: (error: any) => `❌ [USER-VALIDATION] Erro de validação: ${error}`,
} as const;

// 📤 SISTEMA DE EXPORTAÇÃO
export const EXPORT_LOGS = {
  EXPORT_ERROR: (error: any) => `Export error: ${error}`,
  HISTORY_UPDATE_FAILED: (error: any) => `Failed to update export history: ${error}`,
  EXPORT_SUCCESS: (type: string) => `✅ [EXPORT] ${type} exportado com sucesso`,
  EXPORT_START: (type: string) => `📤 [EXPORT] Iniciando exportação: ${type}`,
} as const;

// 🎯 HELPERS PARA LOGS DINÂMICOS
export const LOG_HELPERS = {
  // Para logs com dados dinâmicos
  withData: (message: string, data: any) => `${message}: ${JSON.stringify(data)}`,
  
  // Para logs de sucesso com style
  success: (message: string) => [`%c${message}`, 'color: #10b981; font-weight: bold;'],
  
  // Para logs de erro com style  
  error: (message: string) => [`%c${message}`, 'color: #ef4444; font-weight: bold;'],
  
  // Para logs de warning com style
  warning: (message: string) => [`%c${message}`, 'color: #f59e0b; font-weight: bold;'],
  
  // Para logs de info com style
  info: (message: string) => [`%c${message}`, 'color: #3b82f6; font-weight: bold;'],
} as const;

// 🔄 OPERAÇÕES DE CACHE
export const CACHE_LOGS = {
  INVALIDATED: (endpoints: any) => `🔄 [CACHE] Cache invalidado para: ${JSON.stringify(endpoints)}`,
  HIT: (key: string) => `🎯 [CACHE-HIT] '${key}'`,
  MISS: (key: string) => `❌ [CACHE-MISS] '${key}'`,
  SET: (key: string, ttl?: number) => ttl ? `💾 [CACHE-SET] '${key}' (TTL: ${ttl}s)` : `💾 [CACHE-SET] '${key}'`,
} as const;

// 🔄 OPERAÇÕES FRONTEND (Kanban)
export const FRONTEND_LOGS = {
  UPDATING_TASK: (taskId: string, updates: any) => `🔄 [FRONTEND] Updating task: ${taskId} ${JSON.stringify(updates)}`,
  TASK_UPDATED: () => `✅ [FRONTEND] Task updated successfully`,
  TASK_UPDATE_FAILED: (error: any) => `❌ [FRONTEND] Task update failed: ${error}`,
  REORDERING_TASKS: (taskUpdates: any) => `🔄 [FRONTEND] Reordering tasks: ${JSON.stringify(taskUpdates)}`,
  TASKS_REORDERED: () => `✅ [FRONTEND] Tasks reordered successfully`,
  TASK_REORDER_FAILED: (error: any) => `❌ [FRONTEND] Task reorder failed: ${error}`,
  UPDATING_COLUMNS: (columnUpdates: any) => `🔄 [FRONTEND] Updating column positions: ${JSON.stringify(columnUpdates)}`,
  COLUMNS_UPDATED: () => `✅ [FRONTEND] Columns updated successfully`,
  COLUMN_UPDATE_FAILED: (error: any) => `❌ [FRONTEND] Column update failed: ${error}`,
  FAILED_FETCH_ASSIGNEES: (taskId: string, error: any) => `❌ [FRONTEND] Failed to fetch assignees for task ${taskId}: ${error}`,
} as const;

// 🔔 NOTIFICAÇÕES
export const NOTIFICATIONS_LOGS = {
  CREATE_ERROR: (error: any) => `❌ [NOTIFICATIONS] Error creating notification: ${error}`,
  MARK_READ_ERROR: (error: any) => `❌ [NOTIFICATIONS] Error marking notification as read: ${error}`,
  MARK_ALL_READ_ERROR: (error: any) => `❌ [NOTIFICATIONS] Error marking all notifications as read: ${error}`,
  DELETE_ERROR: (error: any) => `❌ [NOTIFICATIONS] Error deleting notification: ${error}`,
  PARSE_METADATA_ERROR: (error: any) => `⚠️ [NOTIFICATIONS] Failed to parse notification metadata: ${error}`,
} as const;

// 🔐 LOGIN E AUTENTICAÇÃO
export const LOGIN_LOGS = {
  STARTING_LOGIN: (email: string) => `🔐 [LOGIN-JWT] Iniciando login: ${JSON.stringify({ email })}`,
  LOGIN_SUCCESS: (result: any) => `🔐 [LOGIN-JWT] Login bem-sucedido: ${JSON.stringify(result)}`,
  PROCESSING_RESPONSE: () => `🔐 [LOGIN-JWT] Processando resposta do login...`,
  TOKENS_SAVED: () => `✅ [LOGIN-JWT] Tokens salvos no localStorage`,
  FIRST_LOGIN_REDIRECT: () => `🔄 [LOGIN-JWT] Primeiro login detectado - redirecionando para troca de senha`,
  NO_JWT_FALLBACK: () => `⚠️ [LOGIN-JWT] Resposta não contém tokens JWT, usando fallback`,
  LOGIN_ERROR: (error: any) => `❌ [LOGIN-JWT] Erro: ${error}`,
} as const;

// 🔑 TROCA DE SENHA
export const CHANGE_PASSWORD_LOGS = {
  STARTING: () => `🔐 [CHANGE-PASSWORD] Iniciando troca de senha...`,
  SUCCESS: () => `✅ [CHANGE-PASSWORD] Senha alterada com sucesso`,
  ERROR: (error: any) => `❌ [CHANGE-PASSWORD] Erro: ${error}`,
} as const;

// 📊 SELEÇÃO DE BOARDS
export const BOARD_SELECTION_LOGS = {
  API_ERROR: (error: any) => `❌ [BOARD-SELECTION] Original API error: ${error}`,
  CREATE_ERROR: (error: any) => `❌ [BOARD-SELECTION] Erro ao criar board: ${error}`,
  CACHE_INVALIDATED: () => `🔄 [CACHE] Cache de boards invalidado e refeito`,
  DEBUG_REQUEST: () => `🚀 [DEBUG] Fazendo request para toggle-status...`,
  DEBUG_RESPONSE: (data: any) => `🚀 [DEBUG] Resposta recebida: ${JSON.stringify(data)}`,
  DEBUG_SUCCESS: (updatedBoard: any) => `🚀 [DEBUG] onSuccess chamado com: ${JSON.stringify(updatedBoard)}`,
  DEBUG_ACTIVE_STATUS: (isActive: any, statusText: string) => `🚀 [DEBUG] isActive final: ${isActive} statusText: ${statusText}`,
  DEBUG_MUTATION_ERROR: (error: any) => `❌ [DEBUG] Erro na mutation: ${error}`,
} as const;

// 🔒 SERVIÇO DE AUTENTICAÇÃO
export const AUTH_SERVICE_LOGS = {
  TOKEN_REFRESH_ERROR: (error: any) => `❌ [AUTH-SERVICE] Erro ao renovar token: ${error}`,
} as const;

// 💻 SISTEMA (main.tsx)
export const SYSTEM_LOGS = {
  WARNING_SUPPRESSED: (count: number) => `🔇 [SYSTEM] ${count} warnings suprimidos`,
  CONSOLE_CLEAR: () => `🧹 [SYSTEM] Console cleared`,
} as const;

// 🎨 ESTILOS REUTILIZÁVEIS
export const LOG_STYLES = {
  SUCCESS: 'color: #10b981; font-weight: bold;',
  ERROR: 'color: #ef4444; font-weight: bold;',
  WARNING: 'color: #f59e0b; font-weight: bold;',
  INFO: 'color: #3b82f6; font-weight: bold;',
  MUTED: 'color: #6b7280; font-style: italic;',
  PROTECTION: 'color: #3b82f6; font-weight: bold; font-size: 14px; background: #eff6ff; padding: 3px 8px; border-radius: 5px;',
  SUPPRESSED_STYLE: 'color: #ef4444; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px;',
} as const;