import { useParams, useLocation } from "wouter";
import { PermissionsManager } from "@/components/admin/PermissionsManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User, Team, Profile } from "@shared/schema";

export default function AdminPermissions() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const targetType = params.type as "user" | "team" | "profile";
  const targetId = params.id;

  // Get target details
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users", targetId],
    enabled: targetType === "user" && !!targetId,
  });

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams", targetId],
    enabled: targetType === "team" && !!targetId,
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profiles", targetId],
    enabled: targetType === "profile" && !!targetId,
  });

  const getTargetName = () => {
    if (targetType === "user" && user) return user.name;
    if (targetType === "team" && team) return team.name;
    if (targetType === "profile" && profile) return profile.name;
    return "Desconhecido";
  };

  const getTargetDescription = () => {
    if (targetType === "user" && user) return user.email;
    if (targetType === "team" && team) return team.description;
    if (targetType === "profile" && profile) return profile.description;
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              // SOLUÇÃO ROBUSTA: Verificar documento.referrer para histórico real
              if (document.referrer && !document.referrer.includes('/admin/permissions')) {
                // Há uma página anterior válida
                window.history.back();
              } else {
                // Sem histórico válido (refresh/acesso direto), ir para dashboard
                setLocation("/dashboard");
              }
            }}
            data-testid="button-back-permissions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permissões do Sistema</h1>
            <p className="text-muted-foreground">
              Configure permissões de forma visual e intuitiva
            </p>
          </div>
        </div>
      </div>

      {targetId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{getTargetName()}</span>
            </CardTitle>
            <CardDescription>
              Tipo: {targetType === "user" ? "Usuário" : targetType === "team" ? "Time" : "Perfil"} • {getTargetDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PermissionsManager targetType={targetType} targetId={targetId} />
          </CardContent>
        </Card>
      ) : (
        <PermissionsManager targetType={targetType} />
      )}
    </div>
  );
}