import { useState, useEffect } from "react";
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
import { 
  LogIn, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome muito longo"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter ao menos: 1 letra minúscula, 1 maiúscula e 1 número"),
  confirmPassword: z.string().min(1, "Confirmação de senha obrigatória"),
  captcha: z.string().min(1, "Complete o captcha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface CaptchaQuestion {
  question: string;
  answer: number;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaQuestion | null>(null);

  // Generate new captcha question
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let question: string;
    let answer: number;
    
    switch (operation) {
      case '+':
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
        break;
      case '-':
        question = `${Math.max(num1, num2)} - ${Math.min(num1, num2)}`;
        answer = Math.max(num1, num2) - Math.min(num1, num2);
        break;
      case '*':
        const smallNum1 = Math.floor(Math.random() * 5) + 1;
        const smallNum2 = Math.floor(Math.random() * 5) + 1;
        question = `${smallNum1} × ${smallNum2}`;
        answer = smallNum1 * smallNum2;
        break;
      default:
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
    }
    
    setCaptcha({ question, answer });
  };

  // Generate captcha on mount and when switching to register
  useEffect(() => {
    if (isRegisterMode) {
      generateCaptcha();
    }
  }, [isRegisterMode]);

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
      confirmPassword: "",
      captcha: "",
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
        title: "🎉 Login realizado!",
        description: `Bem-vindo(a) de volta, ${user.name}!`,
      });
      setLocation("/boards");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      // Validate captcha
      if (!captcha || parseInt(data.captcha) !== captcha.answer) {
        throw new Error("Captcha incorreto. Tente novamente.");
      }

      // Remove captcha from data sent to server
      const { captcha: _, confirmPassword: __, ...registerData } = data;
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "🎉 Conta criada com sucesso!",
        description: `Bem-vindo(a), ${user.name}! Sua conta foi configurada.`,
      });
      setLocation("/settings");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro no cadastro",
        description: error.message || "Falha ao criar conta",
        variant: "destructive",
      });
      // Generate new captcha on error
      generateCaptcha();
      registerForm.setValue("captcha", "");
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
    
    // Reset forms and states
    loginForm.reset();
    registerForm.reset();
    setShowPassword(false);
    setShowConfirmPassword(false);
    
    if (newMode) {
      generateCaptcha();
    }
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 6) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score < 2) return { label: "Fraca", color: "text-red-500", width: "w-1/4" };
    if (score < 4) return { label: "Média", color: "text-yellow-500", width: "w-2/4" };
    if (score < 5) return { label: "Forte", color: "text-green-500", width: "w-3/4" };
    return { label: "Muito Forte", color: "text-emerald-500", width: "w-full" };
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-4">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/80 border border-white/20">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {isRegisterMode ? "Criar Conta" : "Bem-vindo"}
            </CardTitle>
            
            <CardDescription className="text-lg text-gray-600">
              {isRegisterMode 
                ? "Junte-se à nossa plataforma de gestão de projetos" 
                : "Entre na sua conta para continuar"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isRegisterMode ? (
              /* Login Form */
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Mail className="h-4 w-4 text-indigo-500" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="h-12 text-base border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
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
                        <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Lock className="h-4 w-4 text-indigo-500" />
                          Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-12 text-base border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 pr-10"
                              {...field}
                              data-testid="input-login-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="h-5 w-5" />
                        Entrar
                      </div>
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              /* Register Form */
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <User className="h-4 w-4 text-indigo-500" />
                          Nome Completo
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="João Silva"
                            className="h-12 text-base border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                            {...field}
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
                        <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Mail className="h-4 w-4 text-indigo-500" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="joao@empresa.com"
                            className="h-12 text-base border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                            {...field}
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
                        <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Lock className="h-4 w-4 text-indigo-500" />
                          Senha
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="h-12 text-base border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 pr-10"
                                {...field}
                                data-testid="input-register-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {field.value && (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500">Força da senha:</span>
                                  <span className={`font-medium ${getPasswordStrength(field.value).color}`}>
                                    {getPasswordStrength(field.value).label}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className={`h-1 rounded-full transition-all duration-300 ${getPasswordStrength(field.value).width} ${
                                      getPasswordStrength(field.value).label === "Fraca" ? "bg-red-500" :
                                      getPasswordStrength(field.value).label === "Média" ? "bg-yellow-500" : 
                                      "bg-green-500"
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <CheckCircle className="h-4 w-4 text-indigo-500" />
                          Confirmar Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-12 text-base border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 pr-10"
                              {...field}
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {captcha && (
                    <FormField
                      control={registerForm.control}
                      name="captcha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Shield className="h-4 w-4 text-indigo-500" />
                            Verificação de Segurança
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-100">
                                <div className="flex items-center justify-center space-x-2">
                                  <span className="text-lg font-mono font-bold text-gray-700">
                                    {captcha.question} = ?
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Input
                                  type="text"
                                  placeholder="Sua resposta"
                                  className="flex-1 h-12 text-base text-center border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
                                  {...field}
                                  data-testid="input-captcha"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={generateCaptcha}
                                  className="px-3 h-12 border-2 border-gray-200 hover:border-indigo-500 transition-all duration-200"
                                  title="Gerar nova pergunta"
                                >
                                  🔄
                                </Button>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Criando conta...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Criar Conta
                      </div>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* Toggle Button */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-500">ou</span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={toggleMode}
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="w-full h-12 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
              data-testid="button-toggle-mode"
            >
              {isRegisterMode ? (
                <span>Já tem uma conta? <strong>Faça login</strong></span>
              ) : (
                <span>Não tem conta? <strong>Cadastre-se</strong></span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 uP - Kan. Sistema de gestão de projetos premium.</p>
        </div>
      </div>
    </div>
  );
}