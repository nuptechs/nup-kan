import { ReactNode, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  // 🔧 GARANTIR ORDEM CONSISTENTE DE HOOKS
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading, error, isAuthenticated } = useAuth();

  // 🔧 MEMOIZAR ESTADO PARA EVITAR RECALCULOS DESNECESSÁRIOS
  const authState = useMemo(() => ({
    isLoading,
    hasUser: !!currentUser,
    isAuthenticated: isAuthenticated && !!currentUser,
    needsAuth: requireAuth,
  }), [isLoading, currentUser, isAuthenticated, requireAuth]);

  // 🔧 MELHORAR LÓGICA DE REDIRECIONAMENTO
  useEffect(() => {
    // Não fazer nada se ainda estiver carregando
    if (authState.isLoading) return;

    // Debug do estado atual
    console.log('🔍 [ProtectedRoute] Estado:', {
      requireAuth,
      hasUser: authState.hasUser,
      isAuthenticated: authState.isAuthenticated,
      currentPath: window.location.pathname
    });

    // Se requer autenticação mas usuário não está autenticado
    if (authState.needsAuth && !authState.isAuthenticated) {
      console.log('🔄 [ProtectedRoute] Redirecionando para login - usuário não autenticado');
      setLocation("/login");
      return;
    }

    // Se não requer autenticação mas usuário está autenticado (página de login)
    if (!authState.needsAuth && authState.isAuthenticated) {
      console.log('🔄 [ProtectedRoute] Redirecionando para boards - usuário já autenticado');
      setLocation("/boards");
      return;
    }
  }, [authState, setLocation]);

  // 🔧 SEMPRE EXECUTAR TODOS OS HOOKS PRIMEIRO
  // Mostrar loading enquanto verifica autenticação
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-xs text-muted-foreground">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  // Se requer auth mas não está autenticado, não mostrar nada (vai redirecionar)
  if (authState.needsAuth && !authState.isAuthenticated) {
    return null;
  }

  // Se não requer auth mas está autenticado, não mostrar nada (vai redirecionar)
  if (!authState.needsAuth && authState.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}