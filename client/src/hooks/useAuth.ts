import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/current-user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache - evita múltiplos requests
    gcTime: 10 * 60 * 1000, // 10 minutos na memória
    refetchOnMount: true, // Sempre verificar ao montar
    refetchOnWindowFocus: false, // Não verificar ao focar janela
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}