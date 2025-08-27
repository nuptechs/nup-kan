import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: authResponse, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/current-user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/current-user", {
        credentials: "include",
      });
      
      // 🔧 401 não é erro - significa usuário não autenticado
      if (response.status === 401) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 10 * 60 * 1000, // 10 minutos na memória
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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