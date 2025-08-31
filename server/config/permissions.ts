/**
 * 🔐 PERMISSION CONFIGURATION - Central de Permissões
 * 
 * Este arquivo centraliza TODAS as permissões do sistema.
 * - Fonte única da verdade para controle de acesso
 * - Facilita manutenção e auditoria
 * - Elimina inconsistências entre services
 */
import { Logger } from '../utils/logMessages';

// ============================================
// TIPOS DE PERMISSÕES
// ============================================

export type PermissionAction = 'list' | 'create' | 'edit' | 'delete' | 'view' | 'manage' | 'assign';
export type Resource = 
  | 'users' | 'teams' | 'boards' | 'tasks' | 'tags' | 'columns' 
  | 'profiles' | 'permissions' | 'exports' | 'notifications' 
  | 'analytics' | 'auth' | 'system' | 'custom-fields';

// ============================================
// DEFINIÇÃO CENTRAL DE PERMISSÕES
// ============================================

export const PERMISSIONS = {
  // 👤 USUÁRIOS
  USERS: {
    LIST: 'List Users',
    CREATE: 'Create Users', 
    EDIT: 'Edit Users',
    DELETE: 'Delete Users',
    VIEW: 'View Users'
  },

  // 👥 TIMES  
  TEAMS: {
    LIST: 'List Teams',
    CREATE: 'Create Teams',
    EDIT: 'Edit Teams', 
    DELETE: 'Delete Teams',
    VIEW: 'View Teams',
    MANAGE: 'Manage Teams'
  },

  // 📋 BOARDS
  BOARDS: {
    LIST: 'List Boards',
    CREATE: 'Create Boards',
    EDIT: 'Edit Boards',
    DELETE: 'Delete Boards',
    VIEW: 'View Boards'
  },

  // ✅ TAREFAS
  TASKS: {
    LIST: 'List Tasks',
    CREATE: 'Create Tasks', 
    EDIT: 'Edit Tasks',
    DELETE: 'Delete Tasks',
    VIEW: 'View Tasks',
    ASSIGN: 'Assign Tasks'
  },

  // 🏷️ TAGS
  TAGS: {
    LIST: 'List Tags',
    CREATE: 'Create Tags',
    EDIT: 'Edit Tags', 
    DELETE: 'Delete Tags',
    VIEW: 'View Tags'
  },

  // 📊 COLUNAS
  COLUMNS: {
    LIST: 'List Columns',
    CREATE: 'Create Columns',
    EDIT: 'Edit Columns',
    DELETE: 'Delete Columns', 
    VIEW: 'View Columns'
  },

  // 👤 PERFIS
  PROFILES: {
    LIST: 'List Profiles',
    CREATE: 'Create Profiles',
    EDIT: 'Edit Profiles',
    DELETE: 'Delete Profiles',
    VIEW: 'View Profiles'
  },

  // 🔐 PERMISSÕES
  PERMISSIONS: {
    LIST: 'List Permissions',
    CREATE: 'Create Permissions', 
    EDIT: 'Edit Permissions',
    DELETE: 'Delete Permissions',
    MANAGE: 'Manage Permissions'
  },

  // 📊 EXPORTAÇÕES
  EXPORTS: {
    LIST: 'List Export',
    CREATE: 'Create Export',
    EDIT: 'Edit Export'
  },

  // 🔔 NOTIFICAÇÕES  
  NOTIFICATIONS: {
    LIST: 'List Notifications',
    CREATE: 'Create Notifications',
    EDIT: 'Edit Notifications',
    DELETE: 'Delete Notifications'
  },

  // 📈 ANALYTICS
  ANALYTICS: {
    LIST: 'List Analytics',
    VIEW: 'View Analytics'
  },

  // 🔑 AUTENTICAÇÃO
  AUTH: {
    LIST: 'List Auth',
    CREATE: 'Create Auth'
  },

  // ⚙️ SISTEMA
  SYSTEM: {
    LIST: 'List System',
    DELETE: 'Delete System',
    MANAGE: 'Manage System'
  },

  // 📝 CAMPOS CUSTOMIZADOS
  CUSTOM_FIELDS: {
    LIST: 'List Custom-fields',
    CREATE: 'Create Custom-fields',
    EDIT: 'Edit Custom-fields', 
    DELETE: 'Delete Custom-fields'
  },

  // 🔗 ATRIBUIÇÕES ESPECIAIS
  SPECIAL: {
    ASSIGN_MEMBERS: 'Assign Members'
  }

} as const;

// ============================================
// MAPEAMENTO DE RECURSOS PARA PERMISSÕES
// ============================================

export const RESOURCE_PERMISSIONS = {
  users: PERMISSIONS.USERS,
  teams: PERMISSIONS.TEAMS,
  boards: PERMISSIONS.BOARDS,
  tasks: PERMISSIONS.TASKS,
  tags: PERMISSIONS.TAGS,
  columns: PERMISSIONS.COLUMNS,
  profiles: PERMISSIONS.PROFILES,
  permissions: PERMISSIONS.PERMISSIONS,
  exports: PERMISSIONS.EXPORTS,
  notifications: PERMISSIONS.NOTIFICATIONS,
  analytics: PERMISSIONS.ANALYTICS,
  auth: PERMISSIONS.AUTH,
  system: PERMISSIONS.SYSTEM,
  'custom-fields': PERMISSIONS.CUSTOM_FIELDS
} as const;

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Obtém todas as permissões como array
 */
export function getAllPermissions(): string[] {
  const allPermissions: string[] = [];
  
  Object.values(PERMISSIONS).forEach(resourcePerms => {
    Object.values(resourcePerms).forEach(permission => {
      if (!allPermissions.includes(permission)) {
        allPermissions.push(permission);
      }
    });
  });
  
  return allPermissions.sort();
}

/**
 * Verifica se uma permissão existe
 */
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}

/**
 * Obtém permissões por recurso
 */
export function getPermissionsForResource(resource: Resource): Record<string, string> {
  return RESOURCE_PERMISSIONS[resource] || {};
}

/**
 * Constrói nome de permissão
 */
export function buildPermission(action: PermissionAction, resource: Resource): string {
  const actionMap: Record<PermissionAction, string> = {
    list: 'List',
    create: 'Create', 
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    manage: 'Manage',
    assign: 'Assign'
  };
  
  const resourceMap: Record<Resource, string> = {
    users: 'Users',
    teams: 'Teams',
    boards: 'Boards', 
    tasks: 'Tasks',
    tags: 'Tags',
    columns: 'Columns',
    profiles: 'Profiles',
    permissions: 'Permissions',
    exports: 'Export',
    notifications: 'Notifications',
    analytics: 'Analytics', 
    auth: 'Auth',
    system: 'System',
    'custom-fields': 'Custom-fields'
  };
  
  return `${actionMap[action]} ${resourceMap[resource]}`;
}

// ============================================
// VALIDAÇÕES
// ============================================

// Validar que todas as permissões seguem o padrão
const validationErrors: string[] = [];
const allPerms = getAllPermissions();

allPerms.forEach(perm => {
  if (!perm.match(/^(List|Create|Edit|Delete|View|Manage|Assign)\s+[A-Z]/)) {
    validationErrors.push(`Permissão mal formatada: ${perm}`);
  }
});

if (validationErrors.length > 0) {
  Logger.error.generic('PERMISSIONS-VALIDATION', validationErrors);
}

Logger.auth.permissionSync(`${allPerms.length} permissões carregadas do arquivo central`);