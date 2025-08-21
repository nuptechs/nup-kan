import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { User, Permission } from "@shared/schema";

export function usePermissions() {
  // Buscar usuário atual (assumindo que existe uma forma de pegar o usuário logado)
  const { data: currentUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/current-user"],
    retry: false,
  });

  // Buscar permissões do usuário baseado no seu perfil
  const { data: userPermissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/users", currentUser?.id, "permissions"],
    enabled: !!currentUser?.profileId,
  });

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
    return permissionMap.has(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some(name => hasPermission(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(name => hasPermission(name));
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
    // Utilitários para verificações comuns
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
  };
}