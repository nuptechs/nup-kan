import { LOGIN_LOGS } from "@/constants/logMessages";
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, User, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

// Simple Register Form Component
function RegisterFormComponent({ isLoading, onSubmit }: { 
  isLoading: boolean; 
  onSubmit: (data: RegisterFormData) => void; 
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Simple validation
    const newErrors: Record<string, string> = {};
    if (!name || name.length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    }
    if (!email || !email.includes("@")) {
      newErrors.email = "Email inválido";
    }
    if (!password || password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit data
    onSubmit({ name, email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2">
          <User className="h-4 w-4 text-gray-500" />
          Nome Completo
        </label>
        <Input
          type="text"
          placeholder="Seu nome completo"
          className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          data-testid="input-name"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2">
          <Mail className="h-4 w-4 text-gray-500" />
          Email
        </label>
        <Input
          type="email"
          placeholder="seu@email.com"
          className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          data-testid="input-register-email"
        />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2">
          <User className="h-4 w-4 text-gray-500" />
          Senha
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          data-testid="input-register-password"
        />
        {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2">
          <User className="h-4 w-4 text-gray-500" />
          Confirmar Senha
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          data-testid="input-confirm-password"
        />
        {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        disabled={isLoading}
        data-testid="button-register"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Criando conta...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Criar Conta
          </div>
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Remove complex React Hook Form for register - using simple state instead

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      const result = await response.json();
      return result;
    },
    onSuccess: async (data) => {
      
      // 🚀 SALVAR TOKENS JWT E DADOS DO USUÁRIO
      const { AuthService } = await import('@/services/authService');
      
      if (data.tokens && data.user) {
        // Nova estrutura JWT
        AuthService.setAuthData({
          user: data.user,
          tokens: data.tokens,
          isAuthenticated: true
        });
        
        toast({
          title: "Login realizado!",
          description: `Bem-vindo(a), ${data.user.name}!`,
        });
        
        // Invalidar cache e forçar recarga da página para garantir que o estado seja atualizado
        queryClient.clear();
        
        // ✅ VERIFICAR SE PRECISA TROCAR SENHA (PRIMEIRO LOGIN)
        if (data.requiresPasswordChange || data.user.firstLogin) {
          setTimeout(() => {
            window.location.href = "/change-password";
          }, 500);
        } else {
          // Login normal - ir para boards
          setTimeout(() => {
            window.location.href = "/boards";
          }, 500);
        }
      } else {
        // Fallback para estrutura antiga (sessão) 
        console.warn(LOGIN_LOGS.NO_JWT_FALLBACK());
        queryClient.setQueryData(["/api/auth/current-user"], data);
        toast({
          title: "Login realizado!",
          description: `Bem-vindo(a), ${data.name}!`,
        });
        setLocation("/boards");
      }
    },
    onError: (error: any) => {
      console.error(LOGIN_LOGS.LOGIN_ERROR(error));
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Conta criada!",
        description: `Bem-vindo(a), ${user.name}! Você pode agora gerenciar usuários.`,
      });
      setLocation("/settings");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Falha ao criar conta",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const toggleMode = () => {
    const newMode = !isRegisterMode;
    setIsRegisterMode(newMode);
    // Reset login form only
    if (!newMode) {
      loginForm.reset({
        email: "",
        password: "",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-8">
        <Card className="shadow-xl border-0 bg-white dark:bg-slate-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="tracking-tight text-2xl font-semibold flex items-center gap-2 text-center">
              {isRegisterMode ? (
                <>
                  <User className="h-6 w-6 text-green-600" />
                  Criar Conta
                </>
              ) : (
                <>
                  <LogIn className="h-6 w-6 text-blue-600" />
                  Entrar
                </>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isRegisterMode
                ? "Crie sua conta para acessar o sistema"
                : "Entre com suas credenciais para acessar o sistema"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {!isRegisterMode ? (
              // Login Form
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="h-4 w-4 text-gray-500" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400"
                            disabled={loginMutation.isPending}
                            {...field}
                            data-testid="input-login-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-4 w-4 text-gray-500" />
                          Senha
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400"
                            disabled={loginMutation.isPending}
                            {...field}
                            data-testid="input-login-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Entrar
                      </div>
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              // Simple Register Form - NO React Hook Form complexity
              <RegisterFormComponent 
                isLoading={registerMutation.isPending}
                onSubmit={onRegisterSubmit}
              />
            )}

            {/* Toggle button */}
            <div className="text-center pt-2">
              <button
                onClick={toggleMode}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                disabled={loginMutation.isPending || registerMutation.isPending}
                data-testid="button-toggle-mode"
              >
                {isRegisterMode ? (
                  <>Já tem uma conta? <span className="text-blue-600 font-medium">Faça login</span></>
                ) : (
                  <>Não tem conta? <span className="text-green-600 font-medium">Cadastre-se</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}