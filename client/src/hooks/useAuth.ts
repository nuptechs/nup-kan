import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: authResponse, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/current-user"],
    retry: false,
    staleTime: 30 * 1000, // 30 segundos de cache - atualização mais rápida
    gcTime: 5 * 60 * 1000, // 5 minutos na memória
    refetchOnMount: true, // Sempre verificar ao montar
    refetchOnWindowFocus: false, // Não verificar ao focar janela
  });

  // 🔧 CONVERTER RESPOSTA DO AUTHSERVICE PARA FORMATO USER
  const user: User | null = authResponse && !authResponse.error ? {
    id: authResponse.userId || authResponse.id,
    name: authResponse.userName || authResponse.name,
    email: authResponse.userEmail || authResponse.email,
    role: authResponse.role || 'Usuário',
    avatar: authResponse.avatar,
    profileId: authResponse.profileId,
    password: null,
    status: null,
    createdAt: new Date(),
    updatedAt: new Date()
  } : null;

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user && !!authResponse?.isAuthenticated,
  };
}