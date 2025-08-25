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

    // If auth is required but user is not authenticated, redirect to login
    if (requireAuth && (error || !currentUser)) {
      setLocation("/login");
      return;
    }

    // If user is authenticated but trying to access login page, redirect to boards
    if (!requireAuth && currentUser) {
      setLocation("/boards");
      return;
    }
  }, [isLoading, currentUser, error, requireAuth, setLocation]);

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

  // If auth is required but user is not authenticated, show nothing while redirecting
  if (requireAuth && (error || !currentUser)) {
    return null;
  }

  // If user is authenticated but trying to access login page, show nothing while redirecting
  if (!requireAuth && currentUser) {
    return null;
  }

  return <>{children}</>;
}