import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useEffect, useState } from "react";
import type { User } from "@shared/schema";
import { AuthService } from "@/services/authService";

export function useAuth() {
  // 🚀 VERIFICAR AUTENTICAÇÃO LOCAL - REATIVO A MUDANÇAS
  const [authVersion, setAuthVersion] = useState(0);
  
  // DEBUG: Identificador único para cada instância do hook
  const hookId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  console.log('🔧 [useAuth] Instância criada:', hookId);
  
  // Ouvir mudanças de autenticação
  useEffect(() => {
    const cleanup = AuthService.onAuthChange(() => {
      console.log('🔥 [useAuth-JWT] AuthService.onAuthChange DISPARADO! Hook:', hookId, 'authVersion:', authVersion);
      setAuthVersion(prev => {
        console.log('🔥 [useAuth-JWT] authVersion mudou de', prev, 'para', prev + 1);
        return prev + 1;
      });
    });
    
    return cleanup;
  }, []);

  const isLocallyAuthenticated = useMemo(() => {
    return AuthService.isAuthenticated();
  }, [authVersion]); // Re-avalia quando authVersion muda

  // 🔧 CALLBACK ESTÁVEL PARA QUERY FUNCTION
  const queryFn = useCallback(async () => {
    console.log('🔍 [useAuth-JWT] REQUISIÇÃO INICIADA - authVersion:', authVersion);
    
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
    
    
    // 🔧 401 significa token inválido ou expirado
    if (response.status === 401) {
      AuthService.logout(); // Limpar tokens inválidos
      return { isAuthenticated: false, user: null };
    }
    
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // ✅ GARANTIR QUE AS PERMISSÕES SEJAM PASSADAS
    const result = {
      ...data,
      isAuthenticated: true,
      permissions: data.permissions || []
    };
    
    
    return result;
  }, []);

  const { data: authResponse, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/current-user"], // Remover authVersion para evitar invalidações constantes
    queryFn,
    retry: (failureCount, error) => {
      // Não tentar novamente para erros 401
      if (error?.message?.includes('401')) return false;
      return failureCount < 1; // Apenas 1 tentativa para JWT
    },
    staleTime: 2 * 60 * 1000, // 2 minutos para evitar calls excessivos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isLocallyAuthenticated, // Só fazer query se tem token
  });

  // 🚀 AUTO-REFRESH DE TOKEN
  useEffect(() => {
    if (!isLocallyAuthenticated) return;

    const checkTokenExpiration = () => {
      if (AuthService.isTokenExpiringSoon()) {
        AuthService.refreshAccessToken().catch(() => {
          AuthService.logout();
          window.location.href = '/login';
        });
      }
    };

    // Verificar a cada 5 minutos para reduzir overhead
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
    
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
      
      const userWithPermissions = {
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
        permissions: authResponse.permissions || [],
        permissionObjects: authResponse.permissionObjects || [] // ✅ Adicionar permissionObjects
      };
      
      
      return userWithPermissions as any;
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


  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    authResponse, // ✅ Expor authResponse para usePermissions
  };
}