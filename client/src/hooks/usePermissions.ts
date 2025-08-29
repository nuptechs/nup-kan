import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import type { User, Permission } from "@shared/schema";
import { useAuth } from "./useAuth"; // ✅ Usar hook centralizado

export function usePermissions() {
  // ✅ USAR DADOS CENTRALIZADOS - Evita request duplicado
  const authData = useAuth();
  const { user: currentUser, isLoading: userLoading, error: userError } = authData;


  // ✅ AGORA AS PERMISSÕES ESTÃO NO currentUser
  const userPermissionsData = (currentUser as any)?.permissions ? { permissions: (currentUser as any).permissions } : null;
  
  const permissionsLoading = false;
  const permissionsError = null;

  // Converter array de strings para array de objetos Permission
  const userPermissions: Permission[] = useMemo(() => {
    // Usar diretamente currentUser.permissions
    const permissionsArray = (currentUser as any)?.permissions;
    
    if (!permissionsArray || !Array.isArray(permissionsArray)) return [];
    
    return permissionsArray.map((permissionName: string) => ({
      id: permissionName.toLowerCase().replace(/\s+/g, '-'),
      name: permissionName,
      category: permissionName.includes('Board') ? 'boards' : 
                permissionName.includes('Task') || permissionName.includes('Tarefa') ? 'tasks' :
                permissionName.includes('User') || permissionName.includes('Usuário') ? 'users' :
                permissionName.includes('Team') || permissionName.includes('Time') ? 'teams' :
                permissionName.includes('Profile') || permissionName.includes('Perfil') ? 'profiles' :
                permissionName.includes('Permission') || permissionName.includes('Permissão') ? 'permissions' :
                permissionName.includes('Analytics') ? 'analytics' :
                permissionName.includes('Column') || permissionName.includes('Coluna') ? 'columns' :
                'general',
      description: `Permissão para ${permissionName}`,
      createdAt: new Date(),
    }));
  }, [currentUser]);

  // Log de segurança - detectar tentativas de acesso sem permissão
  useEffect(() => {
    if (userError) {
      console.warn("🔐 [SECURITY] Falha ao carregar permissões do usuário:", {
        userError: userError?.message,
        userId: currentUser?.id
      });
    }
  }, [userError, currentUser?.id]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, Permission>();
    // Garantir que userPermissions é um array antes de fazer forEach
    if (Array.isArray(userPermissions)) {
      userPermissions.forEach(permission => {
        map.set(permission.name, permission);
        // Também indexar por categoria:nome para facilitar verificações
        map.set(`${permission.category}:${permission.name}`, permission);
      });
    }
    return map;
  }, [userPermissions]);

  const hasPermission = (permissionName: string): boolean => {
    if (!currentUser || !permissionName) return false;
    
    // Verificar ambas as versões (português e inglês) para compatibilidade
    const hasPermissionResult = permissionMap.has(permissionName) || 
           permissionMap.has(permissionName.replace("Tarefas", "Tasks")) ||
           permissionMap.has(permissionName.replace("Tasks", "Tarefas"));
    
    return hasPermissionResult;
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
    if (!currentUser) return false;
    // Verificar se tem permissões de administrador
    return hasAnyPermission([
      "Gerenciar Permissões",
      "Criar Usuários", 
      "Excluir Usuários",
      "Gerenciar Times"
    ]);
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
    return Array.isArray(userPermissions) ? userPermissions.some(permission => permission.category === category) : false;
  };

  const getPermissionsInCategory = (category: string): Permission[] => {
    return Array.isArray(userPermissions) ? userPermissions.filter(permission => permission.category === category) : [];
  };

  // Memoizar verificações de permissão para melhor performance
  const permissionChecks = useMemo(() => {
    if (!currentUser || !permissionMap.size) {
      return {
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canViewTasks: false,
        canManageColumns: false,
        canManageTeams: false,
        canManageUsers: false,
        canManageProfiles: false,
        canViewAnalytics: false,
        canExportData: false,
      };
    }
    
    const result = {
      canCreateTasks: hasPermission("Criar Tarefas"),
      canEditTasks: hasPermission("Editar Tarefas"),
      canDeleteTasks: hasPermission("Excluir Tarefas"),
      canViewTasks: hasPermission("Visualizar Tarefas"),
      canManageColumns: hasAnyPermission(["Criar Colunas", "Editar Colunas", "Excluir Colunas"]),
      canManageTeams: hasPermission("Gerenciar Times"),
      canManageUsers: hasAnyPermission(["Criar Usuários", "Editar Usuários", "Excluir Usuários"]),
      canManageProfiles: hasAnyPermission(["Criar Perfis", "Editar Perfis", "Excluir Perfis", "Gerenciar Permissões"]),
      canViewAnalytics: hasPermission("Visualizar Analytics"),
      canExportData: hasPermission("Exportar Dados"),
    };
    
    return result;
  }, [permissionMap, currentUser]);

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
    ...permissionChecks,
    // Nova funcionalidade - verificar permissões com logs
    checkPermissionWithLog: (permission: string, resource: string = "Unknown") => {
      const hasAccess = hasPermission(permission);
      logSecurityAttempt(permission, resource, hasAccess);
      return hasAccess;
    },
  };
}