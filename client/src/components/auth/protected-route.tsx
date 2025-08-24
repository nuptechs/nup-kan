import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ["/api/auth/current-user"],
    retry: false,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data
    refetchOnMount: "always",
  });

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (isLoading) return;

    // If auth is required but user is not authenticated, redirect to login
    if (requireAuth && (error || !currentUser)) {
      setLocation("/login");
      return;
    }

    // If user is authenticated but trying to access login page, redirect to home
    if (!requireAuth && currentUser) {
      setLocation("/");
      return;
    }
  }, [isLoading, currentUser, error, requireAuth, setLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Verificando autenticação...
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