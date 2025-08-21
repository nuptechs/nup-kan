import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  category?: string;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  category,
  fallback = null,
  showError = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasPermissionInCategory, isLoading } = usePermissions();

  // Mostrar loading enquanto carrega as permissões
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando permissões...</div>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (category) {
    hasAccess = hasPermissionInCategory(category);
  } else {
    // Se não especificar nenhuma permissão, permite acesso
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componente específico para botões com permissão
interface PermissionButtonProps extends PermissionGuardProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PermissionButton({
  children,
  permission,
  permissions,
  requireAll,
  category,
  disabled = false,
  className = "",
  ...props
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasPermissionInCategory } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (category) {
    hasAccess = hasPermissionInCategory(category);
  } else {
    hasAccess = true;
  }

  // Se não tem acesso, não renderiza o botão
  if (!hasAccess) {
    return null;
  }

  return children;
}