import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useEffect, useState } from "react";
import type { User } from "@shared/schema";
import { AuthService } from "@/services/authService";

export function useAuth() {
  // 🚀 VERIFICAR AUTENTICAÇÃO LOCAL - REATIVO A MUDANÇAS
  const [authVersion, setAuthVersion] = useState(0);
  
  // Ouvir mudanças de autenticação
  useEffect(() => {
    const cleanup = AuthService.onAuthChange(() => {
      setAuthVersion(prev => prev + 1);
    });
    
    return cleanup;
  }, []);

  const isLocallyAuthenticated = useMemo(() => {
    return AuthService.isAuthenticated();
  }, [authVersion]); // Re-avalia quando authVersion muda

  // 🔧 CALLBACK ESTÁVEL PARA QUERY FUNCTION
  const queryFn = useCallback(async () => {
    console.log('🔍 [useAuth-JWT] Fazendo request para current-user...');
    
    // Se não tem token local, não fazer request
    if (!AuthService.getAccessToken()) {
      console.log('🔍 [useAuth-JWT] Sem token local');
      return { isAuthenticated: false, user: null };
    }
    
    const authHeaders = AuthService.getAuthHeader();
    
    const response = await fetch("/api/auth/current-user", {
      credentials: "include",
      cache: "no-cache",
      headers: {
        ...authHeaders
      }
    });
    
    console.log('🔍 [useAuth-JWT] Response status:', response.status);
    
    // 🔧 401 significa token inválido ou expirado
    if (response.status === 401) {
      console.log('🔍 [useAuth-JWT] Token inválido/expirado (401)');
      AuthService.logout(); // Limpar tokens inválidos
      return { isAuthenticated: false, user: null };
    }
    
    if (!response.ok) {
      console.error('🔍 [useAuth-JWT] Erro na resposta:', response.status, response.statusText);
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('🔍 [useAuth-JWT] Dados recebidos:', data);
    
    return data;
  }, []);

  const { data: authResponse, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/current-user", authVersion], // Usar authVersion na chave
    queryFn,
    retry: (failureCount, error) => {
      // Não tentar novamente para erros 401
      if (error?.message?.includes('401')) return false;
      return failureCount < 1; // Apenas 1 tentativa para JWT
    },
    staleTime: 0, // Sempre considerar stale para forçar re-fetch quando necessário
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isLocallyAuthenticated, // Só fazer query se tem token
  });

  // 🚀 AUTO-REFRESH DE TOKEN
  useEffect(() => {
    if (!isLocallyAuthenticated) return;

    const checkTokenExpiration = () => {
      if (AuthService.isTokenExpiringSoon()) {
        console.log('🔄 [useAuth-JWT] Token expirando, tentando renovar...');
        AuthService.refreshAccessToken().catch(() => {
          console.log('❌ [useAuth-JWT] Falha ao renovar token');
          AuthService.logout();
          window.location.href = '/login';
        });
      }
    };

    // Verificar a cada minuto
    const interval = setInterval(checkTokenExpiration, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isLocallyAuthenticated]);

  // 🔧 MEMOIZAR CONVERSÃO PARA FORMATO USER
  const user: User | null = useMemo(() => {
    // Se não está autenticado localmente, retornar null
    if (!isLocallyAuthenticated) {
      return null;
    }

    // Se tem dados do servidor, usar eles
    if (authResponse && authResponse.isAuthenticated) {
      return {
        id: authResponse.userId || authResponse.id,
        name: authResponse.userName || authResponse.name,
        email: authResponse.userEmail || authResponse.email,
        avatar: authResponse.avatar || null,
        profileId: authResponse.profileId || null,
        password: null,
        status: null,
        firstLogin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        // ✅ INCLUIR PERMISSÕES NO OBJETO USER (como propriedade extra)
        permissions: authResponse.permissions
      } as User & { permissions?: string[] };
    }

    // Fallback: dados do localStorage
    const localUserData = AuthService.getUserData();
    if (localUserData) {
      return {
        id: localUserData.id,
        name: localUserData.name,
        email: localUserData.email,
        avatar: localUserData.avatar || null,
        profileId: localUserData.profileId || null,
        password: null,
        status: null,
        firstLogin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return null;
  }, [authResponse, isLocallyAuthenticated]);

  const isAuthenticated = useMemo(() => {
    return isLocallyAuthenticated && !!user;
  }, [user, isLocallyAuthenticated]);

  console.log('🔍 [useAuth-JWT] Estado final:', {
    hasResponse: !!authResponse,
    hasUser: !!user,
    isAuthenticated,
    isLoading,
    hasError: !!error,
    hasLocalToken: !!AuthService.getAccessToken()
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
  };
}