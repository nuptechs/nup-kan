import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  // 🔧 CALLBACK ESTÁVEL PARA QUERY FUNCTION
  const queryFn = useCallback(async () => {
    console.log('🔍 [useAuth] Fazendo request para current-user...');
    
    const response = await fetch("/api/auth/current-user", {
      credentials: "include",
      cache: "no-cache", // Evitar cache do browser
    });
    
    console.log('🔍 [useAuth] Response status:', response.status);
    
    // 🔧 401 não é erro - significa usuário não autenticado
    if (response.status === 401) {
      console.log('🔍 [useAuth] Usuário não autenticado (401)');
      return { isAuthenticated: false, user: null };
    }
    
    if (!response.ok) {
      console.error('🔍 [useAuth] Erro na resposta:', response.status, response.statusText);
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('🔍 [useAuth] Dados recebidos:', data);
    
    return data;
  }, []);

  const { data: authResponse, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/current-user"],
    queryFn,
    retry: (failureCount, error) => {
      // Não tentar novamente para erros 401
      if (error?.message?.includes('401')) return false;
      return failureCount < 2; // Apenas 2 tentativas
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (reduzido)
    gcTime: 5 * 60 * 1000, // 5 minutos (reduzido)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // 🔧 MEMOIZAR CONVERSÃO PARA EVITAR RECRIAÇÕES DESNECESSÁRIAS
  const user: User | null = useMemo(() => {
    if (!authResponse || authResponse.error || !authResponse.isAuthenticated) {
      return null;
    }

    return {
      id: authResponse.userId || authResponse.id,
      name: authResponse.userName || authResponse.name,
      email: authResponse.userEmail || authResponse.email,
      role: authResponse.profileName || authResponse.role || 'Usuário',
      avatar: authResponse.avatar,
      profileId: authResponse.profileId,
      password: null,
      status: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }, [authResponse]);

  const isAuthenticated = useMemo(() => {
    return !!user && !!authResponse?.isAuthenticated;
  }, [user, authResponse?.isAuthenticated]);

  console.log('🔍 [useAuth] Estado final:', {
    hasResponse: !!authResponse,
    hasUser: !!user,
    isAuthenticated,
    isLoading,
    hasError: !!error
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
  };
}