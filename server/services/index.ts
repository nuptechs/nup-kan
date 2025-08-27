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

// User Service
export { userService } from './userService';
export type { UserCreateRequest, UserUpdateRequest, UserWithDetails } from './userService';

// Team Service
export { teamService } from './teamService';
export type { TeamCreateRequest, TeamUpdateRequest, TeamWithMembers } from './teamService';

// Notification Service
export { notificationService } from './notificationService';
export type { NotificationCreateRequest, NotificationUpdateRequest, NotificationWithDetails } from './notificationService';

// Future services exports...
// export { analyticsService } from './analyticsService';