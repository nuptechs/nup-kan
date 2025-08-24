import { usePermissions } from "./usePermissions";

export type ProfileMode = "read-only" | "full-access" | "admin";

/**
 * Hook para determinar o modo de acesso baseado nas permissões do usuário
 * - read-only: Pode visualizar mas não modificar
 * - full-access: Pode modificar dentro do seu escopo
 * - admin: Acesso completo ao sistema
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
  const { hasPermission, isAdmin: checkIsAdmin } = usePermissions();

  // Determinar o modo baseado nas permissões
  const determineMode = (): ProfileMode => {
    if (checkIsAdmin()) return "admin";
    
    // Se tem permissões de criação, é full-access
    if (hasPermission("Criar Boards") || hasPermission("Criar Tarefas")) {
      return "full-access";
    }
    
    // Se só tem permissões de visualização, é read-only
    return "read-only";
  };

  const mode = determineMode();
  const isReadOnly = mode === "read-only";
  const isAdmin = mode === "admin";

  // Funções de verificação por ação
  const canCreate = (resource: string) => {
    if (isReadOnly) return false;
    return hasPermission(`Criar ${resource}`);
  };

  const canEdit = (resource: string) => {
    if (isReadOnly) return false;
    return hasPermission(`Editar ${resource}`);
  };

  const canDelete = (resource: string) => {
    if (isReadOnly) return false;
    return hasPermission(`Excluir ${resource}`);
  };

  const canView = (resource: string) => {
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