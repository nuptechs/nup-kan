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

// Column Service
export { columnService } from './columnService';
export type { ColumnCreateRequest, ColumnUpdateRequest } from './columnService';

// Tag Service
export { tagService } from './tagService';
export type { TagCreateRequest, TagUpdateRequest } from './tagService';

// Profile Service
export { profileService } from './profileService';
export type { ProfileCreateRequest, ProfileUpdateRequest } from './profileService';

// Permission Service
export { permissionService } from './permissionService';
export type { PermissionCreateRequest, PermissionUpdateRequest } from './permissionService';

// 🗑️ REMOVIDO: Team Member Service (consolidado em UserTeamService)

// Board Share Service
export { boardShareService } from './boardShareService';
export type { BoardShareCreateRequest } from './boardShareService';

// Task Status Service
export { taskStatusService } from './taskStatusService';
export type { TaskStatusCreateRequest, TaskPriorityCreateRequest } from './taskStatusService';

// User Team Service
export { userTeamService } from './userTeamService';
export type { UserTeamRequest } from './userTeamService';

// Task Event Service
export { taskEventService } from './taskEventService';
export type { TaskEventCreateRequest } from './taskEventService';

// Export Service
export { exportService } from './exportService';
export type { ExportCreateRequest } from './exportService';

// Team Profile Service
export { teamProfileService } from './teamProfileService';
export type { TeamProfileRequest } from './teamProfileService';

// 🎯 CENTRALIZADO: Assignee Service (consolidação completa)
export { assigneeService } from './assigneeService';
export type { AssigneeRequest, AssigneeWithUser } from './assigneeService';

// 🏗️ HIERARQUIA: Hierarchy Service (formalização de acesso)
export { hierarchyService } from './hierarchyService';
export type { UserHierarchy, PermissionResolution } from './hierarchyService';

// Future services exports...
// export { analyticsService } from './analyticsService';