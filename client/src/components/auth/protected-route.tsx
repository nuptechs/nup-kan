import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; // ✅ Usar hook centralizado

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  // ✅ USAR HOOK CENTRALIZADO - Evita request duplicado
  const { user: currentUser, isLoading, error } = useAuth();

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (isLoading) return;

    // Se auth é obrigatória mas usuário não está autenticado, redirecionar para login
    if (requireAuth && !currentUser) {
      setLocation("/login");
      return;
    }

    // Se usuário está autenticado mas tentando acessar página de login, redirecionar para boards
    if (!requireAuth && currentUser) {
      setLocation("/boards");
      return;
    }
  }, [isLoading, currentUser, requireAuth, setLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-xs text-muted-foreground">
            Verificando...
          </p>
        </div>
      </div>
    );
  }

  // Se auth é obrigatória mas usuário não está autenticado, não mostrar nada enquanto redireciona
  if (requireAuth && !currentUser) {
    return null;
  }

  // Se usuário está autenticado mas tentando acessar página de login, não mostrar nada enquanto redireciona
  if (!requireAuth && currentUser) {
    return null;
  }

  return <>{children}</>;
}