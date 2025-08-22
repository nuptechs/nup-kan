import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, User, Users, Shield, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Profile, Permission, Team } from "@shared/schema";

interface QuickCreatePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCreatePanel({ isOpen, onClose }: QuickCreatePanelProps) {
  const [activeTab, setActiveTab] = useState("user");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados para formulários
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "",
    profileId: "",
  });

  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    selectedPermissions: [] as string[],
  });

  // Queries para dados necessários
  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof userForm) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      setUserForm({ name: "", email: "", role: "", profileId: "" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: typeof teamForm) => {
      const response = await apiRequest("POST", "/api/teams", teamData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Sucesso",
        description: "Time criado com sucesso!",
      });
      setTeamForm({ name: "", description: "" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar time. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (profileData: typeof profileForm) => {
      const response = await apiRequest("POST", "/api/profiles", {
        name: profileData.name,
        description: profileData.description,
        color: profileData.color,
        isDefault: "false",
      });
      const profile = await response.json();
      
      // Atribuir permissões ao perfil
      if (profileData.selectedPermissions.length > 0) {
        const permissionPromises = profileData.selectedPermissions.map(permissionId =>
          apiRequest("POST", `/api/profiles/${profile.id}/permissions`, { permissionId })
        );
        await Promise.all(permissionPromises);
      }
      
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({
        title: "Sucesso",
        description: "Perfil criado com permissões atribuídas!",
      });
      setProfileForm({ name: "", description: "", color: "#3b82f6", selectedPermissions: [] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(userForm);
  };

  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name) {
      toast({
        title: "Campo obrigatório",
        description: "Nome do time é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    createTeamMutation.mutate(teamForm);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name) {
      toast({
        title: "Campo obrigatório",
        description: "Nome do perfil é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    createProfileMutation.mutate(profileForm);
  };

  const togglePermission = (permissionId: string) => {
    setProfileForm(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionId)
        ? prev.selectedPermissions.filter(id => id !== permissionId)
        : [...prev.selectedPermissions, permissionId]
    }));
  };

  const getPermissionsByCategory = () => {
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
    return grouped;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Gerenciamento Completo</h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Times
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Perfis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Gerenciar Usuários
                  </CardTitle>
                  <CardDescription>
                    Crie, edite ou remova usuários do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="user-name">Nome Completo *</Label>
                        <Input
                          id="user-name"
                          value={userForm.name}
                          onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Digite o nome completo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-email">Email *</Label>
                        <Input
                          id="user-email"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Digite o email"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="user-role">Função/Cargo</Label>
                        <Input
                          id="user-role"
                          value={userForm.role}
                          onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                          placeholder="Ex: Desenvolvedor, Designer..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-profile">Perfil de Acesso</Label>
                        <Select
                          value={userForm.profileId}
                          onValueChange={(value) => setUserForm(prev => ({ ...prev, profileId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: profile.color }}
                                  />
                                  {profile.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {/* TODO: Open user list/management */}}
                      >
                        Ver Usuários
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Gerenciar Times
                  </CardTitle>
                  <CardDescription>
                    Crie, edite ou remova times de colaboração
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTeamSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="team-name">Nome do Time *</Label>
                      <Input
                        id="team-name"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Desenvolvimento, Design, Marketing..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="team-description">Descrição</Label>
                      <Textarea
                        id="team-description"
                        value={teamForm.description}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva o propósito e responsabilidades do time"
                        rows={3}
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Times Existentes</h4>
                      <div className="flex flex-wrap gap-2">
                        {teams.map((team) => (
                          <Badge key={team.id} variant="secondary">
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createTeamMutation.isPending}
                      >
                        {createTeamMutation.isPending ? "Criando..." : "Criar Time"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {/* TODO: Open team list/management */}}
                      >
                        Ver Times
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Gerenciar Perfis
                  </CardTitle>
                  <CardDescription>
                    Crie, edite ou remova perfis e suas permissões
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="profile-name">Nome do Perfil *</Label>
                        <Input
                          id="profile-name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Administrador, Editor..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="profile-color">Cor do Perfil</Label>
                        <Input
                          id="profile-color"
                          type="color"
                          value={profileForm.color}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, color: e.target.value }))}
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="profile-description">Descrição</Label>
                      <Textarea
                        id="profile-description"
                        value={profileForm.description}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva as responsabilidades deste perfil"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">Permissões</Label>
                      <p className="text-sm text-gray-600 mb-4">
                        Selecione as permissões que este perfil deve ter
                      </p>
                      
                      <div className="space-y-4 max-h-80 overflow-y-auto border rounded-lg p-4">
                        {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                          <div key={category}>
                            <h4 className="font-medium text-gray-900 mb-2 capitalize">
                              {category === "tasks" && "Tarefas"}
                              {category === "columns" && "Colunas"}
                              {category === "users" && "Usuários"}
                              {category === "teams" && "Times"}
                              {category === "profiles" && "Perfis"}
                              {category === "analytics" && "Analytics"}
                              {category || "Outras"}
                            </h4>
                            <div className="grid grid-cols-1 gap-2 ml-4">
                              {categoryPermissions.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={permission.id}
                                    checked={profileForm.selectedPermissions.includes(permission.id)}
                                    onCheckedChange={() => togglePermission(permission.id)}
                                  />
                                  <Label htmlFor={permission.id} className="text-sm">
                                    {permission.name}
                                  </Label>
                                  {permission.description && (
                                    <span className="text-xs text-gray-500">
                                      - {permission.description}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {profileForm.selectedPermissions.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            {profileForm.selectedPermissions.length} permissões selecionadas
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createProfileMutation.isPending}
                      >
                        {createProfileMutation.isPending ? "Criando..." : "Criar Perfil"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {/* TODO: Open profile list/management */}}
                      >
                        Ver Perfis
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}