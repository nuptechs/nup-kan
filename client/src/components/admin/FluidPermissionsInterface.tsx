import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, Users, User, Search, Settings2, Eye, FileText, 
  Columns, UserCheck, Zap, CheckCircle, XCircle, AlertCircle 
} from "lucide-react";
import type { Permission, Profile, User as UserType, Team } from "@shared/schema";

interface FluidPermissionsInterfaceProps {
  targetType: "user" | "team";
  targetId: string;
  targetName: string;
}

export function FluidPermissionsInterface({ targetType, targetId, targetName }: FluidPermissionsInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  // Target-specific data
  const { data: targetData } = useQuery({
    queryKey: targetType === "user" ? ["/api/users", targetId] : ["/api/teams", targetId],
    enabled: !!targetId,
  });

  const { data: targetPermissions = [] } = useQuery<Permission[]>({
    queryKey: targetType === "user" ? ["/api/users", targetId, "permissions"] : ["/api/teams", targetId, "permissions"],
    enabled: !!targetId,
  });

  // Profile assignment mutation
  const assignProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      if (targetType === "user") {
        return apiRequest("PATCH", `/api/users/${targetId}`, { profileId });
      } else {
        return apiRequest("POST", `/api/teams/${targetId}/profiles`, { profileId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ 
        queryKey: targetType === "user" ? ["/api/users", targetId, "permissions"] : ["/api/teams", targetId, "permissions"]
      });
      toast({
        title: "Perfil atribuído",
        description: `O perfil foi atribuído com sucesso a ${targetName}.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atribuir perfil.",
        variant: "destructive",
      });
    },
  });

  // Permission toggle mutation
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, isActive }: { permissionId: string; isActive: boolean }) => {
      const endpoint = targetType === "user" 
        ? `/api/users/${targetId}/permissions`
        : `/api/teams/${targetId}/permissions`;
      
      if (isActive) {
        // Remove permission
        return apiRequest("DELETE", `${endpoint}/${permissionId}`);
      } else {
        // Add permission
        return apiRequest("POST", endpoint, { permissionId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: targetType === "user" ? ["/api/users", targetId, "permissions"] : ["/api/teams", targetId, "permissions"]
      });
      toast({
        title: "Sucesso",
        description: "Permissão atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Permission toggle error:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar permissão. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Filter permissions by search
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [permissions, searchTerm]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    return filteredPermissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [filteredPermissions]);

  // Check if permission is active
  const isPermissionActive = (permissionId: string) => {
    return targetPermissions.some(p => p.id === permissionId);
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionId: string) => {
    const isActive = isPermissionActive(permissionId);
    togglePermissionMutation.mutate({ permissionId, isActive });
  };

  // Get category icon and color
  const getCategoryInfo = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tasks':
        return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' };
      case 'teams':
        return { icon: Users, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' };
      case 'users':
        return { icon: User, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' };
      case 'columns':
        return { icon: Columns, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' };
      case 'profiles':
        return { icon: Shield, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' };
      case 'analytics':
        return { icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950' };
      default:
        return { icon: Settings2, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-950' };
    }
  };

  // Calculate permission coverage
  const totalPermissions = permissions.length;
  const activePermissions = targetPermissions.length;
  const coveragePercentage = totalPermissions > 0 ? Math.round((activePermissions / totalPermissions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {targetType === "user" ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              <span>{targetName}</span>
            </div>
            <Badge variant="outline" className="ml-auto">
              <Zap className="w-3 h-3 mr-1" />
              Interface Fluida
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure permissões de forma visual e intuitiva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{activePermissions}</div>
              <div className="text-sm text-blue-600">Permissões Ativas</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{coveragePercentage}%</div>
              <div className="text-sm text-green-600">Cobertura</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(permissionsByCategory).length}</div>
              <div className="text-sm text-purple-600">Categorias</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Profile Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5" />
            <span>Atribuição Rápida de Perfis</span>
          </CardTitle>
          <CardDescription>
            Aplique conjuntos de permissões pré-configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: profile.color }}
                  />
                  <div>
                    <div className="font-medium text-sm">{profile.name}</div>
                    <div className="text-xs text-muted-foreground">{profile.description}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => assignProfileMutation.mutate(profile.id)}
                  disabled={assignProfileMutation.isPending}
                  data-testid={`button-assign-profile-${profile.id}`}
                >
                  Aplicar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Buscar Permissões</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-permissions"
            />
          </div>
        </CardContent>
      </Card>

      {/* Permissions by Category */}
      <div className="space-y-4">
        {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
          const { icon: CategoryIcon, color, bg } = getCategoryInfo(category);
          const activeCategoryPerms = categoryPermissions.filter(p => isPermissionActive(p.id)).length;
          
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className={`w-5 h-5 ${color}`} />
                    <span className="capitalize">{category}</span>
                    <Badge variant="secondary">{categoryPermissions.length}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {activeCategoryPerms}/{categoryPermissions.length}
                    </span>
                    {activeCategoryPerms === categoryPermissions.length ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : activeCategoryPerms > 0 ? (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {categoryPermissions.map((permission) => {
                    const isActive = isPermissionActive(permission.id);
                    
                    return (
                      <div key={permission.id} className={`p-3 rounded-lg border transition-all ${bg}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-1">{permission.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {permission.description || 'Sem descrição'}
                            </div>
                          </div>
                          <div className="ml-3">
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                              disabled={togglePermissionMutation.isPending}
                              data-testid={`switch-permission-${permission.id}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPermissions.length === 0 && searchTerm && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma permissão encontrada para "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}