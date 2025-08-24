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

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/current-user"], user);
      toast({
        title: "Login realizado!",
        description: `Bem-vindo(a), ${user.name}!`,
      });
      setLocation("/boards");
    },
    onError: (error: any) => {
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
    // Reset forms when switching with explicit values
    if (newMode) {
      registerForm.reset({
        name: "",
        email: "",
        password: "",
      });
    } else {
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
              // Register Form
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-4 w-4 text-gray-500" />
                          Nome Completo
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Seu nome completo"
                            className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:focus:border-green-400"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            disabled={registerMutation.isPending}
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
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
                            className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:focus:border-green-400"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            disabled={registerMutation.isPending}
                            data-testid="input-register-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
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
                            className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:focus:border-green-400"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            disabled={registerMutation.isPending}
                            data-testid="input-register-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
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
              </Form>
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