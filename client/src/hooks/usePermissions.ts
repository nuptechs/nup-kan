import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import type { User, Permission } from "@shared/schema";

export function usePermissions() {
  // Buscar usuário atual com estratégia de cache melhorada
  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ["/api/auth/current-user"],
    retry: 2,
    retryDelay: 1000,
    staleTime: 300000, // Cache por 5 minutos - dados de usuário mudam pouco
    gcTime: 600000, // Manter em cache por 10 minutos
    refetchOnWindowFocus: false,
  });

  // Buscar permissões do usuário baseado no seu perfil
  const { data: userPermissions = [], isLoading: permissionsLoading, error: permissionsError } = useQuery<Permission[]>({
    queryKey: ["/api/users", currentUser?.id, "permissions"],
    enabled: !!currentUser?.id, // Modificado para verificar ID do usuário em vez de profileId
    staleTime: 300000, // Cache por 5 minutos - permissões mudam raramente
    gcTime: 600000, // Manter em cache por 10 minutos
    refetchOnWindowFocus: false,
  });

  // Log de segurança - detectar tentativas de acesso sem permissão
  useEffect(() => {
    if (userError || permissionsError) {
      console.warn("🔐 [SECURITY] Falha ao carregar permissões do usuário:", {
        userError: userError?.message,
        permissionsError: permissionsError?.message,
        userId: currentUser?.id
      });
    }
  }, [userError, permissionsError, currentUser?.id]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, Permission>();
    userPermissions.forEach(permission => {
      map.set(permission.name, permission);
      // Também indexar por categoria:nome para facilitar verificações
      map.set(`${permission.category}:${permission.name}`, permission);
    });
    return map;
  }, [userPermissions]);

  const hasPermission = (permissionName: string): boolean => {
    if (!currentUser || !permissionName) return false;
    return permissionMap.has(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    if (!currentUser || !permissionNames || permissionNames.length === 0) return false;
    return permissionNames.some(name => hasPermission(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    if (!currentUser || !permissionNames || permissionNames.length === 0) return false;
    return permissionNames.every(name => hasPermission(name));
  };

  // Nova função para verificar se usuário é administrador
  const isAdmin = (): boolean => {
    if (!currentUser || !currentUser.role) return false;
    const role = currentUser.role.toLowerCase();
    return role.includes('admin') || 
           role.includes('administrador') ||
           role.includes('dono');
  };

  // Nova função para logs de segurança
  const logSecurityAttempt = (action: string, resource: string, success: boolean) => {
    if (!success) {
      console.warn(`🚫 [SECURITY] Tentativa de acesso negada:`, {
        user: currentUser?.name,
        userId: currentUser?.id,
        action,
        resource,
        timestamp: new Date().toISOString()
      });
    }
  };

  const hasPermissionInCategory = (category: string): boolean => {
    return userPermissions.some(permission => permission.category === category);
  };

  const getPermissionsInCategory = (category: string): Permission[] => {
    return userPermissions.filter(permission => permission.category === category);
  };

  return {
    currentUser,
    userPermissions,
    isLoading: userLoading || permissionsLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionInCategory,
    getPermissionsInCategory,
    isAdmin,
    logSecurityAttempt,
    // Utilitários para verificações comuns - melhorados com logs
    canCreateTasks: hasPermission("Criar Tarefas"),
    canEditTasks: hasPermission("Editar Tarefas"),
    canDeleteTasks: hasPermission("Excluir Tarefas"),
    canViewTasks: hasPermission("Visualizar Tarefas"),
    canManageColumns: hasAnyPermission(["Criar Colunas", "Editar Colunas", "Excluir Colunas"]),
    canManageTeams: hasPermission("Gerenciar Times"),
    canManageUsers: hasAnyPermission(["Criar Usuários", "Editar Usuários", "Excluir Usuários"]),
    canManageProfiles: hasAnyPermission(["Criar Perfis", "Editar Perfis", "Excluir Perfis"]),
    canViewAnalytics: hasPermission("Visualizar Analytics"),
    canExportData: hasPermission("Exportar Dados"),
    // Nova funcionalidade - verificar permissões com logs
    checkPermissionWithLog: (permission: string, resource: string = "Unknown") => {
      const hasAccess = hasPermission(permission);
      logSecurityAttempt(permission, resource, hasAccess);
      return hasAccess;
    },
  };
}