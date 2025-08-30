import { usePermissions } from "./usePermissions";
import { PermissionSystemError } from "../errors/PermissionSystemError";

export type ProfileMode = "read-only" | "full-access" | "admin" | "loading";

/**
 * ✅ HOOK ROBUSTO para determinar o modo de perfil do usuário
 * Implementa validação de integridade e tratamento de erros
 */
export function useProfileMode(): {
  mode: ProfileMode;
  isReadOnly: boolean;
  isAdmin: boolean;
  canCreate: (resource: string) => boolean;
  canEdit: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canView: (resource: string) => boolean;
} {
  const { 
    hasPermission, 
    isAdmin: checkIsAdmin, 
    isLoading, 
    error, 
    permissions, 
    validateSystemState 
  } = usePermissions();

  // ✅ CORREÇÃO ROBUSTA - Implementa lógica sem fallbacks silenciosos
  const determineMode = (): ProfileMode => {
    // 1. Estados explícitos durante carregamento
    if (isLoading) return "loading";
    
    try {
      // 2. Validação de integridade do sistema
      validateSystemState();
      
      // 3. Validação de dados
      if (!Array.isArray(permissions)) {
        throw new PermissionSystemError("Dados de permissões corrompidos");
      }
      
      // 4. Log para auditoria
      console.log(`🔐 [PROFILE-MODE] Usuário tem ${permissions.length} permissões`);
      
      // 5. Lógica de negócio (agora confiável)
      if (checkIsAdmin()) {
        console.log(`🔐 [PROFILE-MODE] Modo determinado: admin`);
        return "admin";
      }
      
      // Verificar se tem permissões de criação
      const hasCreatePermissions = hasPermission("Criar Boards") || 
                                  hasPermission("Criar Tarefas") ||
                                  hasPermission("Criar Colunas");
      
      if (hasCreatePermissions) {
        console.log(`🔐 [PROFILE-MODE] Modo determinado: full-access`);
        return "full-access";
      }
      
      // 6. Read-only é agora um estado válido, não fallback
      console.log(`🔐 [PROFILE-MODE] Modo determinado: read-only`);
      return "read-only";
      
    } catch (error) {
      // Erro crítico - propagar para error boundary
      console.error('🚨 [PROFILE-MODE] Erro crítico ao determinar modo:', error);
      throw error;
    }
  };

  const mode = determineMode();
  const isReadOnly = mode === "read-only";
  const isAdmin = mode === "admin";

  // ✅ FUNÇÕES ROBUSTAS DE VERIFICAÇÃO POR AÇÃO
  const canCreate = (resource: string) => {
    // Estados de carregamento são explícitos
    if (mode === "loading") return false;
    if (isReadOnly) return false;
    
    // Validar entrada
    if (!resource || typeof resource !== 'string') {
      console.warn('🚨 [PROFILE-MODE] Parâmetro resource inválido para canCreate:', resource);
      return false;
    }
    
    // Verificar múltiplas variações de permissão para garantir compatibilidade
    return hasPermission(`Criar ${resource}`) || 
           hasPermission(`Create ${resource}`) ||
           (resource === "Boards" && hasPermission("Criar Boards")) ||
           (resource === "Tasks" && hasPermission("Criar Tarefas"));
  };

  const canEdit = (resource: string) => {
    if (mode === "loading") return false;
    if (isReadOnly) return false;
    
    if (!resource || typeof resource !== 'string') {
      console.warn('🚨 [PROFILE-MODE] Parâmetro resource inválido para canEdit:', resource);
      return false;
    }
    
    return hasPermission(`Editar ${resource}`);
  };

  const canDelete = (resource: string) => {
    if (mode === "loading") return false;
    if (isReadOnly) return false;
    
    if (!resource || typeof resource !== 'string') {
      console.warn('🚨 [PROFILE-MODE] Parâmetro resource inválido para canDelete:', resource);
      return false;
    }
    
    return hasPermission(`Excluir ${resource}`);
  };

  const canView = (resource: string) => {
    if (mode === "loading") return false;
    
    if (!resource || typeof resource !== 'string') {
      console.warn('🚨 [PROFILE-MODE] Parâmetro resource inválido para canView:', resource);
      return false;
    }
    
    return hasPermission(`Visualizar ${resource}`) || hasPermission(`Listar ${resource}`);
  };

  return {
    mode,
    isReadOnly,
    isAdmin,
    canCreate,
    canEdit,
    canDelete,
    canView,
  };
}