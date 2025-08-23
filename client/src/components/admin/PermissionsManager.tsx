import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Users, User, Search, Settings2, Eye, FileText, Columns, UserCheck, Settings } from "lucide-react";
import type { Permission, Profile, User as UserType, Team } from "@shared/schema";
import { TeamManagementDialog } from "@/components/kanban/team-management-dialog";

interface PermissionsByCategory {
  [category: string]: Permission[];
}

interface PermissionsManagerProps {
  targetType: "user" | "profile" | "team";
  targetId?: string;
}

export function PermissionsManager({ targetType, targetId }: PermissionsManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
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

  // Target-specific permissions
  const { data: targetPermissions = [] } = useQuery<Permission[]>({
    queryKey: targetType === "user" ? ["/api/users", targetId, "permissions"] 
           : targetType === "profile" ? ["/api/profiles", targetId, "permissions"]
           : ["/api/teams", targetId, "permissions"],
    enabled: !!targetId,
  });

  // Permission toggle mutation
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, hasPermission }: { permissionId: string; hasPermission: boolean }) => {
      if (!targetId) throw new Error("Target ID is required");

      const url = targetType === "profile" 
        ? `/api/profiles/${targetId}/permissions`
        : targetType === "user"
        ? `/api/users/${targetId}/permissions`
        : `/api/teams/${targetId}/permissions`;

      if (hasPermission) {
        // Remove permission
        return apiRequest("DELETE", `${url}/${permissionId}`);
      } else {
        // Add permission
        return apiRequest("POST", url, { permissionId });
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      if (targetType === "profile") {
        queryClient.invalidateQueries({ queryKey: ["/api/profiles", targetId, "permissions"] });
      } else if (targetType === "user") {
        queryClient.invalidateQueries({ queryKey: ["/api/users", targetId, "permissions"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/teams", targetId, "permissions"] });
      }
      toast({
        title: "Permissão atualizada",
        description: "As permissões foram atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar permissões.",
        variant: "destructive",
      });
    },
  });

  // Assign profile mutation
  const assignProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      if (!targetId) throw new Error("Target ID is required");
      
      if (targetType === "user") {
        return apiRequest("PATCH", `/api/users/${targetId}`, { profileId });
      } else if (targetType === "team") {
        return apiRequest("POST", `/api/teams/${targetId}/profiles`, { profileId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Perfil atribuído",
        description: "O perfil foi atribuído com sucesso.",
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

  // Group permissions by category
  const permissionsByCategory = useMemo<PermissionsByCategory>(() => {
    const filtered = permissions.filter(permission =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (permission.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as PermissionsByCategory);
  }, [permissions, searchTerm]);

  // Check if permission is enabled for target
  const isPermissionEnabled = (permissionId: string) => {
    return targetPermissions.some(p => p.id === permissionId);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tasks': return <FileText className="w-4 h-4" />;
      case 'teams': return <Users className="w-4 h-4" />;
      case 'users': return <User className="w-4 h-4" />;
      case 'columns': return <Columns className="w-4 h-4" />;
      case 'profiles': return <Shield className="w-4 h-4" />;
      case 'analytics': return <Eye className="w-4 h-4" />;
      default: return <Settings2 className="w-4 h-4" />;
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tasks': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'teams': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'users': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'columns': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'profiles': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'analytics': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const renderPermissionCard = (permission: Permission) => (
    <Card key={permission.id} className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-medium text-sm">{permission.name}</h4>
              <Badge variant="outline" className={getCategoryColor(permission.category)}>
                {permission.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{permission.description || 'Sem descrição'}</p>
          </div>
          {targetId && (
            <Switch
              checked={isPermissionEnabled(permission.id)}
              onCheckedChange={(checked) => {
                togglePermissionMutation.mutate({
                  permissionId: permission.id,
                  hasPermission: !checked,
                });
              }}
              disabled={togglePermissionMutation.isPending}
              data-testid={`switch-permission-${permission.id}`}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">

      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="permissions">Permissões Detalhadas</TabsTrigger>
          <TabsTrigger value="profiles">Perfis</TabsTrigger>
          <TabsTrigger value="quick-assign">Atribuição Rápida</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar permissões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-permissions"
              />
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize">{category}</span>
                      <Badge variant="secondary">{categoryPermissions.length}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Permissões relacionadas a {category.toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {categoryPermissions.map(renderPermissionCard)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perfis Disponíveis</CardTitle>
              <CardDescription>
                Atribua perfis pré-configurados para aplicar múltiplas permissões de uma vez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map((profile) => (
                  <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: profile.color }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{profile.name}</h4>
                          <p className="text-sm text-muted-foreground">{profile.description}</p>
                        </div>
                        {targetId && (
                          <Button
                            size="sm"
                            onClick={() => assignProfileMutation.mutate(profile.id)}
                            disabled={assignProfileMutation.isPending}
                            data-testid={`button-assign-profile-${profile.id}`}
                          >
                            Atribuir
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-assign" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Usuários</span>
                </CardTitle>
                <CardDescription>
                  Gerencie permissões de usuários individuais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{user.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/admin/permissions/user/${user.id}`}
                          data-testid={`button-manage-user-${user.id}`}
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Gerenciar
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Times</span>
                </CardTitle>
                <CardDescription>
                  Gerencie permissões de times inteiros
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsTeamManagementOpen(true)}
                            data-testid={`button-edit-team-${team.id}`}
                            title="Editar Time e Membros"
                            className="border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
                          >
                            <Settings className="w-4 h-4 text-blue-600 mr-2" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/admin/permissions/team/${team.id}`}
                            data-testid={`button-manage-team-${team.id}`}
                          >
                            <Settings2 className="w-3 h-3 mr-1" />
                            Permissões
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Team Management Dialog */}
      <TeamManagementDialog
        open={isTeamManagementOpen}
        onOpenChange={setIsTeamManagementOpen}
      />
    </div>
  );
}