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

  // Buscar permissões do usuário baseado no seu perfil - usando endpoint correto que funciona
  const { data: userPermissionsData, isLoading: permissionsLoading, error: permissionsError } = useQuery<{permissions: string[]}>({
    queryKey: ["/api/users", currentUser?.id, "permissions"],
    enabled: !!currentUser?.id,
    staleTime: 300000, // Cache por 5 minutos - permissões mudam raramente
    gcTime: 600000, // Manter em cache por 10 minutos
    refetchOnWindowFocus: false,
    retry: 3, // Aumentar tentativas
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Converter array de strings para array de objetos Permission
  const userPermissions: Permission[] = React.useMemo(() => {
    if (!userPermissionsData?.permissions) return [];
    
    return userPermissionsData.permissions.map(permissionName => ({
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
  }, [userPermissionsData]);

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
           permissionMap.has(permissionName.replace("Boards", "Boards")) || 
           permissionMap.has(permissionName.replace("Tarefas", "Tasks")) ||
           permissionMap.has(permissionName.replace("Tasks", "Tarefas"));
    
    // Debug log para verificar permissões
    if (permissionName && permissionName.includes("Criar")) {
      console.log(`🔍 [PERMISSIONS] Verificando permissão "${permissionName}": ${hasPermissionResult}`, {
        userPermissions: Array.isArray(userPermissions) ? userPermissions.map(p => p.name) : [],
        currentUser: currentUser?.name
      });
    }
    
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
    return Array.isArray(userPermissions) ? userPermissions.some(permission => permission.category === category) : false;
  };

  const getPermissionsInCategory = (category: string): Permission[] => {
    return Array.isArray(userPermissions) ? userPermissions.filter(permission => permission.category === category) : [];
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