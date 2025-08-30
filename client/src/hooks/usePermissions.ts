import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import type { User, Permission } from "@shared/schema";
import { useAuth } from "./useAuth"; // ✅ Usar hook centralizado
import { PermissionSystemError, PermissionErrors } from "../errors/PermissionSystemError";

export function usePermissions() {
  // ✅ USAR DADOS CENTRALIZADOS - Evita request duplicado
  const authData = useAuth();
  const { user: currentUser, isLoading: userLoading, error: userError } = authData;

  // ✅ VALIDAÇÃO DE INTEGRIDADE - Falha rápida se erro crítico
  useEffect(() => {
    if (userError && !userLoading) {
      const errorInstance = userError instanceof Error ? userError : new Error(String(userError));
      const permissionError = PermissionErrors.authContextCorrupted(
        errorInstance, 
        currentUser?.id
      );
      console.error('🚨 [PERMISSION-INTEGRITY] Erro crítico detectado:', permissionError.toJSON());
    }
  }, [userError, userLoading, currentUser?.id]);

  // ✅ CORREÇÃO: Usar permissões estruturadas do servidor
  const userPermissions: Permission[] = useMemo(() => {
    // 1. Estados explícitos durante carregamento
    if (userLoading) {
      return [];
    }

    // 2. Falha rápida se erro crítico
    if (userError || !currentUser) {
      return [];
    }

    const permissionObjects = (currentUser as any)?.permissionObjects;

    // 3. Validação de integridade
    if (!Array.isArray(permissionObjects)) {
      console.error('🚨 [PERMISSION-INTEGRITY] Dados de permissões corrompidos:', {
        userId: currentUser?.id,
        permissionObjects: typeof permissionObjects,
        currentUser: !!currentUser
      });
      return [];
    }

    // 4. Log para auditoria
    console.log(`🔐 [PERMISSIONS] Usuário ${currentUser.id} tem ${permissionObjects.length} permissões`);

    return permissionObjects;
  }, [currentUser, userLoading, userError]);

  // Estados explícitos
  const isLoading = userLoading;
  const error = userError;

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
        user: currentUser?.name || 'Unknown',
        userId: currentUser?.id || 'Unknown',
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

  // ✅ THROW ERROR PARA ESTADOS CRÍTICOS
  const throwCriticalError = (errorType: keyof typeof PermissionErrors) => {
    const error = PermissionErrors[errorType](currentUser?.id);
    throw error;
  };

  // ✅ VALIDAÇÃO ROBUSTA DE ESTADO
  const validateSystemState = () => {
    if (error && !isLoading) {
      throwCriticalError('authContextCorrupted');
    }
    
    if (!isLoading && !currentUser) {
      throwCriticalError('userDataMissing');
    }
    
    if (!isLoading && !Array.isArray(userPermissions)) {
      throwCriticalError('permissionDataCorrupted');
    }
  };

  return {
    // Estados explícitos
    isLoading,
    error,
    permissions: userPermissions,
    permissionMap,
    
    // Validação de estado
    validateSystemState,
    throwCriticalError,
    
    // Funções de verificação
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionInCategory,
    getPermissionsInCategory,
    isAdmin,
    
    // Auditoria
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