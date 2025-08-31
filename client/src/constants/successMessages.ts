/**
 * Mensagens de sucesso centralizadas
 * Organize por categoria para facilitar manutenção
 */

export const SUCCESS_MESSAGES = {
  // Autenticação e Usuários
  AUTH: {
    PASSWORD_CHANGED: "Senha alterada com sucesso!",
    USER_CREATED: "Usuário criado",
    USER_UPDATED: "Usuário atualizado", 
    USER_DELETED: "Usuário excluído",
    USER_LINKED_TO_PROFILE: "Usuário vinculado ao perfil",
    USER_UNLINKED_FROM_PROFILE: "Vínculo removido",
    USER_ADDED_TO_TEAM: "Usuário adicionado ao time",
    USER_REMOVED_FROM_TEAM: "Usuário removido do time",
  },

  // Boards
  BOARDS: {
    CREATED: "Novo board Kanban criado com sucesso!",
    UPDATED: "As informações do board foram atualizadas com sucesso!",
    DELETED: "O board foi excluído com sucesso!",
    STATUS_CHANGED: "foi alterado com sucesso!",
  },

  // Tasks (Tarefas)
  TASKS: {
    CREATED: "Tarefa criada com sucesso!",
    UPDATED: "Tarefa atualizada com sucesso!",
    DELETED: "Tarefa excluída com sucesso!",
  },

  // Teams (Times)
  TEAMS: {
    CREATED: "Time criado",
    UPDATED: "Time atualizado",
    DELETED: "Time excluído",
    LINKED_TO_PROFILE: "Time vinculado ao perfil",
    UNLINKED_FROM_PROFILE: "Vínculo removido",
  },

  // Profiles (Perfis)
  PROFILES: {
    CREATED: "Perfil criado",
    UPDATED: "Perfil atualizado", 
    DELETED: "Perfil excluído",
    PERMISSIONS_ADDED: "permissões adicionadas ao perfil",
    PERMISSION_REMOVED: "Permissão removida do perfil",
  },

  // Columns (Colunas)
  COLUMNS: {
    CREATED: "Coluna criada com sucesso!",
    UPDATED: "Coluna atualizada com sucesso!",
    DELETED: "Coluna excluída com sucesso!",
  },

  // Tags
  TAGS: {
    CREATED: "Tag criada com sucesso!",
    UPDATED: "Tag atualizada com sucesso!",
    DELETED: "Tag excluída com sucesso!",
  },

  // Settings (Configurações)
  SETTINGS: {
    UPDATED: "Configurações atualizadas com sucesso!",
    EMAIL_UPDATED: "Configurações de email atualizadas com sucesso!",
  },

  // Notifications (Notificações)
  NOTIFICATIONS: {
    CREATED: "Notificação criada com sucesso",
    MARKED_AS_READ: "Notificações marcadas como lidas com sucesso",
    DELETED: "Notificação excluída com sucesso",
  },

  // Generic (Genérico)
  GENERIC: {
    SUCCESS: "Sucesso",
    OPERATION_COMPLETED: "Operação concluída com sucesso!",
    CHANGES_SAVED: "Alterações salvas com sucesso!",
  }
} as const;