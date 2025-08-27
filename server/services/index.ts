/**
 * 🏗️ SERVICES INDEX - Exportação Unificada dos Serviços
 * 
 * Este é o ponto de entrada único para todos os serviços da aplicação.
 * Os services são a única interface pública para persistência de dados.
 * 
 * ARQUITETURA:
 * Routes -> Services (únicos públicos) -> DatabaseStorage (DAO privado) -> Database
 */

// Base Service
export { BaseService, createSuccessResponse, createErrorResponse } from './baseService';
export type { ServiceResponse, PaginatedResponse, PaginationOptions } from './baseService';

// Board Service
export { boardService } from './boardServiceNew';
export type { BoardCreateRequest, BoardUpdateRequest, BoardWithStats } from './boardServiceNew';

// Task Service  
export { taskService } from './taskServiceNew';
export type { TaskCreateRequest, TaskUpdateRequest, TaskWithDetails } from './taskServiceNew';

// Future services exports...
// export { userService } from './userService';
// export { teamService } from './teamService';
// export { analyticsService } from './analyticsService';