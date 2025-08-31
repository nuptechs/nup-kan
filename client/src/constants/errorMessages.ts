/**
 * Mensagens de erro centralizadas
 * Organize por categoria para facilitar manutenção
 */

export const ERROR_MESSAGES = {
  // Autenticação e Usuários
  AUTH: {
    PASSWORD_CHANGE_FAILED: "Erro ao alterar senha",
    PASSWORD_TOO_SHORT: "A senha deve ter pelo menos 6 caracteres",
    PASSWORDS_DONT_MATCH: "As senhas não coincidem",
    USER_CREATE_FAILED: "Erro ao criar usuário. Tente novamente.",
    USER_UPDATE_FAILED: "Erro ao atualizar usuário. Tente novamente.",
    USER_DELETE_FAILED: "Erro ao excluir usuário. Tente novamente.",
    USER_LINK_FAILED: "Erro ao vincular usuário ao perfil. Tente novamente.",
    USER_UNLINK_FAILED: "Erro ao remover vínculo. Tente novamente.",
  },

  // Boards
  BOARDS: {
    CREATE_FAILED: "Erro ao criar board viu. Tente novamente.",
    UPDATE_FAILED: "Erro ao atualizar board. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir board. Tente novamente.",
    STATUS_CHANGE_FAILED: "Erro ao alterar status do board. Tente novamente.",
    LOAD_FAILED: "Erro ao carregar boards. Tente novamente.",
  },

  // Tasks (Tarefas)
  TASKS: {
    CREATE_FAILED: "Falha ao criar tarefa. Tente novamente.",
    UPDATE_FAILED: "Falha ao atualizar tarefa. Tente novamente.",
    DELETE_FAILED: "Falha ao excluir tarefa. Tente novamente.",
    MOVE_FAILED: "Erro ao mover tarefa. Tente novamente.",
    LOAD_FAILED: "Erro ao carregar tarefas. Tente novamente.",
    REORDER_FAILED: "Erro ao reordenar tarefas. Tente novamente.",
    DUPLICATE_FAILED: "Erro ao duplicar tarefa. Tente novamente.",
  },

  // Teams (Times)
  TEAMS: {
    CREATE_FAILED: "Erro ao criar time. Tente novamente.",
    UPDATE_FAILED: "Erro ao atualizar time. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir time. Tente novamente.",
    LINK_FAILED: "Erro ao vincular time ao perfil. Tente novamente.",
    UNLINK_FAILED: "Erro ao remover vínculo. Tente novamente.",
  },

  // Profiles (Perfis)
  PROFILES: {
    CREATE_FAILED: "Erro ao criar perfil. Tente novamente.",
    UPDATE_FAILED: "Erro ao atualizar perfil. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir perfil. Tente novamente.",
    PERMISSIONS_ADD_FAILED: "Erro ao adicionar permissões. Tente novamente.",
    PERMISSION_REMOVE_FAILED: "Erro ao remover permissão. Tente novamente.",
    LOAD_FAILED: "Erro ao carregar perfis. Tente novamente.",
  },

  // Columns (Colunas)
  COLUMNS: {
    CREATE_FAILED: "Erro ao criar coluna. Tente novamente.",
    UPDATE_FAILED: "Erro ao atualizar coluna. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir coluna. Tente novamente.",
    REORDER_FAILED: "Erro ao reordenar colunas. Tente novamente.",
  },

  // Tags
  TAGS: {
    CREATE_FAILED: "Erro ao criar tag. Tente novamente.",
    UPDATE_FAILED: "Erro ao atualizar tag. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir tag. Tente novamente.",
  },

  // Settings (Configurações)
  SETTINGS: {
    UPDATE_FAILED: "Erro ao atualizar configurações. Tente novamente.",
    EMAIL_UPDATE_FAILED:
      "Erro ao atualizar configurações de email. Tente novamente.",
    LOAD_FAILED: "Erro ao carregar configurações. Tente novamente.",
    EMAIL_TEST_FAILED: "Erro no teste",
    INVALID_FORMAT: "Formato inválido",
    FIELD_REQUIRED: "Campo obrigatório",
  },

  // Custom Fields (Campos Personalizados)
  CUSTOM_FIELDS: {
    CREATE_FAILED: "Erro ao criar campo personalizado. Tente novamente.",
    UPDATE_FAILED: "Erro ao atualizar campo personalizado. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir campo personalizado. Tente novamente.",
    SAVE_FAILED: "Erro ao salvar campos personalizados. Tente novamente.",
  },

  // Sharing (Compartilhamento)
  SHARING: {
    SHARE_FAILED: "Erro ao compartilhar board. Tente novamente.",
    UNSHARE_FAILED: "Erro ao remover compartilhamento. Tente novamente.",
    PERMISSION_CHANGE_FAILED:
      "Erro ao alterar permissões de compartilhamento. Tente novamente.",
  },

  // Notifications (Notificações)
  NOTIFICATIONS: {
    CREATE_FAILED: "Erro ao criar notificação. Tente novamente.",
    MARK_READ_FAILED:
      "Erro ao marcar notificações como lidas. Tente novamente.",
    DELETE_FAILED: "Erro ao excluir notificação. Tente novamente.",
    LOAD_FAILED: "Erro ao carregar notificações. Tente novamente.",
  },

  // System Logs
  SYSTEM_LOGS: {
    LOAD_FAILED: "Erro ao carregar logs do sistema. Tente novamente.",
  },

  // Generic (Genérico)
  GENERIC: {
    ERROR: "Erro",
    OPERATION_FAILED: "Operação falhou. Tente novamente.",
    NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
    PERMISSION_DENIED: "Você não tem permissão para realizar esta ação.",
    VALIDATION_ERROR: "Dados inválidos. Verifique os campos.",
    SERVER_ERROR: "Erro interno do servidor. Tente novamente.",
  },
} as const;
