import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse JSON error response first
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        
        // Handle validation errors with details
        if (errorData.details && typeof errorData.details === 'string') {
          // Parse Zod validation error from details
          if (errorData.details.includes("O nome do board deve conter pelo menos 3 caracteres")) {
            throw new Error("O nome do board deve conter pelo menos 3 caracteres");
          }
          throw new Error(errorData.details);
        }
        
        // Handle regular API errors
        const errorMessage = errorData.message || errorData.error || res.statusText;
        throw new Error(errorMessage);
      } else {
        // Fallback to text response
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
    } catch (parseError) {
      // If parsing fails, use status and statusText
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // 🚀 ADICIONAR HEADERS JWT AUTOMATICAMENTE
  let headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Importação dinâmica para evitar dependência circular
  try {
    const { AuthService } = await import('@/services/authService');
    const authHeaders = AuthService.getAuthHeader();
    headers = { ...headers, ...authHeaders };
  } catch (error) {
    console.warn('Erro ao carregar AuthService:', error);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Manter para compatibilidade
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // 🚀 ADICIONAR HEADERS JWT AUTOMATICAMENTE
    let headers: Record<string, string> = {};
    
    try {
      const { AuthService } = await import('@/services/authService');
      const authHeaders = AuthService.getAuthHeader();
      headers = { ...headers, ...authHeaders };
    } catch (error) {
      console.warn('Erro ao carregar AuthService para query:', error);
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    // 🔧 Para rotas de autenticação, 401 significa "não autenticado" (não é erro)
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // Para outras rotas, 401 é erro de permissão
      throw new Error("Acesso não autorizado - faça login para continuar");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // 🔧 401s retornam null em vez de erro
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos de cache
      gcTime: 10 * 60 * 1000, // 10 minutos na memória
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
