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
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
