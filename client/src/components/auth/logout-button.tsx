import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export function LogoutButton({ 
  variant = "ghost", 
  size = "default", 
  className = "",
  showIcon = true,
  showText = true
}: LogoutButtonProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsLoggingOut(true);
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no logout",
        description: error.message || "Erro ao fazer logout",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoggingOut(false);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoggingOut}
      data-testid="button-logout"
    >
      {isLoggingOut ? (
        <>
          {showIcon && <Loader2 className="h-4 w-4 animate-spin" />}
          {showText && <span className={showIcon ? "ml-2" : ""}>Saindo...</span>}
        </>
      ) : (
        <>
          {showIcon && <LogOut className="h-4 w-4" />}
          {showText && <span className={showIcon ? "ml-2" : ""}>Sair</span>}
        </>
      )}
    </Button>
  );
}