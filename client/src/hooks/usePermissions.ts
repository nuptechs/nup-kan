import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import type { User, Permission } from "@shared/schema";
import { useAuth } from "./useAuth"; // ✅ Usar hook centralizado
import { PermissionSystemError, PermissionErrors } from "../errors/PermissionSystemError";
import { PERMISSION_LOGS } from "@/constants/logMessages";

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
        currentUser?.id || 'unknown'
      );
      console.error(PERMISSION_LOGS.CRITICAL_ERROR(permissionError.toJSON()));
    }
  }, [userError, userLoading, currentUser?.id]);

  // ✅ CORREÇÃO: Usar permissões do servidor (formato string array)
  const userPermissions: string[] = useMemo(() => {
    // 1. Estados explícitos durante carregamento
    if (userLoading) {
      return [];
    }

    // 2. Falha rápida se erro crítico
    if (userError || !currentUser) {
      return [];
    }

    // ✅ CORREÇÃO: A API retorna permissions como array de strings, não permissionObjects
    const permissionStrings = (currentUser as any)?.permissions || [];
    const permissionObjects = permissionStrings;

    // 3. Validação de integridade
    if (!Array.isArray(permissionObjects)) {
      console.error(PERMISSION_LOGS.DATA_CORRUPTED({
        userId: currentUser?.id,
        permissionObjects: typeof permissionObjects,
        permissionStrings: typeof permissionStrings,
        currentUser: !!currentUser
      }));
      return [];
    }

    // 4. Log para auditoria
    console.log(PERMISSION_LOGS.USER_PERMISSIONS(currentUser.id, permissionObjects.length));

    return permissionObjects; // Agora é array de strings
  }, [currentUser, userLoading, userError]);

  // Estados explícitos
  const isLoading = userLoading;
  const error = userError;

  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    // Garantir que userPermissions é um array antes de fazer forEach
    if (Array.isArray(userPermissions)) {
      userPermissions.forEach(permissionName => {
        // Como agora são strings, mapear diretamente
        map.set(permissionName, true);
      });
    }
    return map;
  }, [userPermissions]);

  const hasPermission = (permissionName: string): boolean => {
    if (!currentUser || !permissionName) return false;
    
    // Verificar ambas as versões (português e inglês) para compatibilidade
    const hasPermissionResult = permissionMap.get(permissionName) || 
           permissionMap.get(permissionName.replace("Tarefas", "Tasks")) ||
           permissionMap.get(permissionName.replace("Tasks", "Tarefas"));
    
    return !!hasPermissionResult;
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
      "Manage Permissions",
      "Create Users", 
      "Delete Users",
      "Manage Teams"
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
    // Para strings, verificar se alguma permissão contém a categoria
    return Array.isArray(userPermissions) ? userPermissions.some(permission => permission.includes(category)) : false;
  };

  const getPermissionsInCategory = (category: string): string[] => {
    // Para strings, filtrar permissões que contêm a categoria
    return Array.isArray(userPermissions) ? userPermissions.filter(permission => permission.includes(category)) : [];
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
      canCreateTasks: hasPermission("Create Tasks"),
      canEditTasks: hasPermission("Edit Tasks"),
      canDeleteTasks: hasPermission("Delete Tasks"),
      canViewTasks: hasPermission("View Tasks"),
      canManageColumns: hasAnyPermission(["Create Columns", "Edit Columns", "Delete Columns"]),
      canManageTeams: hasPermission("Manage Teams"),
      canManageUsers: hasAnyPermission(["Create Users", "Edit Users", "Delete Users"]),
      canManageProfiles: hasAnyPermission(["Create Profiles", "Edit Profiles", "Delete Profiles", "Manage Permissions"]),
      canViewAnalytics: hasPermission("View Analytics"),
      canExportData: hasPermission("Exportar Dados"),
    };
    
    return result;
  }, [permissionMap, currentUser]);

  // ✅ THROW ERROR PARA ESTADOS CRÍTICOS
  const throwCriticalError = (errorType: keyof typeof PermissionErrors) => {
    const userId = currentUser?.id || 'unknown';
    // @ts-ignore - Dynamic error creation
    const error = PermissionErrors[errorType](userId);
    throw error;
  };

  // ✅ VALIDAÇÃO ROBUSTA DE ESTADO
  const validateSystemState = () => {
    if (error && !isLoading) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      const permissionError = PermissionErrors.authContextCorrupted(errorInstance, currentUser?.id || 'unknown');
      throw permissionError;
    }
    
    if (!isLoading && !currentUser) {
      const permissionError = PermissionErrors.userDataMissing('unknown');
      throw permissionError;
    }
    
    if (!isLoading && !Array.isArray(userPermissions)) {
      const permissionError = PermissionErrors.permissionDataCorrupted(currentUser?.id || 'unknown');
      throw permissionError;
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