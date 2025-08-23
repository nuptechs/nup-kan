import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users, User, Settings2, ArrowRight, Zap } from "lucide-react";
import type { Permission, Profile, User as UserType, Team } from "@shared/schema";
import { usePermissions } from "@/hooks/usePermissions";

export function PermissionsManagerCard() {
  const { canManageProfiles } = usePermissions();

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = 0;
    }
    acc[permission.category]++;
    return acc;
  }, {} as Record<string, number>);

  if (!canManageProfiles) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span>Permissões</span>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="w-3 h-3 mr-1" />
            Fluido
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure permissões de forma visual e intuitiva para usuários, times e perfis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Shield className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{permissions.length}</div>
            <div className="text-xs text-muted-foreground">Permissões</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Settings2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{profiles.length}</div>
            <div className="text-xs text-muted-foreground">Perfis</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <User className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-xs text-muted-foreground">Usuários</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Users className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">{teams.length}</div>
            <div className="text-xs text-muted-foreground">Times</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Permissões por Categoria:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(permissionsByCategory).map(([category, count]) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}: {count}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button 
            onClick={() => window.location.href = "/admin/permissions"}
            className="flex-1"
            data-testid="button-open-permissions-manager"
          >
            <Shield className="w-4 h-4 mr-2" />
            Acessar Permissões
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Interface fluida para configurar acesso a funcionalidades do sistema
        </div>
      </CardContent>
    </Card>
  );
}