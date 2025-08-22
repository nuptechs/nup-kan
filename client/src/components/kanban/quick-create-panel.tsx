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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, User, Users, Shield, Mail, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Profile, Permission, Team, User as UserType } from "@shared/schema";

interface QuickCreatePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCreatePanel({ isOpen, onClose }: QuickCreatePanelProps) {
  const [activeTab, setActiveTab] = useState("user");
  const [viewMode, setViewMode] = useState<"create" | "list">("create");
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

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
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
    
    if (editingUser) {
      // Modo edição - atualizar usuário existente
      updateUserMutation.mutate({
        id: editingUser.id,
        ...userForm
      });
    } else {
      // Modo criação - criar novo usuário
      createUserMutation.mutate(userForm);
    }
  };
  
  // Update mutations
  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; name: string; email: string; role: string; profileId: string }) =>
      apiRequest("PATCH", `/api/users/${data.id}`, {
        name: data.name,
        email: data.email,
        role: data.role,
        profileId: data.profileId,
      }),
    onSuccess: () => {
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      setUserForm({ name: "", email: "", role: "", profileId: "" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar usuário",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

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

  // Delete mutations
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/users/${userId}`),
    onSuccess: () => {
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir usuário",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => apiRequest("DELETE", `/api/teams/${teamId}`),
    onSuccess: () => {
      toast({
        title: "Time excluído",
        description: "O time foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir time",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) => apiRequest("DELETE", `/api/profiles/${profileId}`),
    onSuccess: () => {
      toast({
        title: "Perfil excluído",
        description: "O perfil foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir perfil",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // State for editing
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Handle delete confirmations
  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este time?")) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este perfil?")) {
      deleteProfileMutation.mutate(profileId);
    }
  };

  // Handle edit functions
  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role || "",
      profileId: user.profileId || "",
    });
    setActiveTab("user");
    setViewMode("create");
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name,
      description: team.description || "",
    });
    setActiveTab("team");
    setViewMode("create");
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setProfileForm({
      name: profile.name,
      description: profile.description || "",
      color: profile.color,
      selectedPermissions: [], // TODO: carregar permissões do perfil
    });
    setActiveTab("profile");
    setViewMode("create");
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
          {viewMode === "create" ? (
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
                        disabled={createUserMutation.isPending || updateUserMutation.isPending}
                      >
                        {editingUser 
                          ? (updateUserMutation.isPending ? "Atualizando..." : "Atualizar Usuário")
                          : (createUserMutation.isPending ? "Criando..." : "Criar Usuário")
                        }
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (editingUser) {
                            setEditingUser(null);
                            setUserForm({ name: "", email: "", role: "", profileId: "" });
                          } else {
                            setViewMode("list");
                          }
                        }}
                      >
                        {editingUser ? (
                          <>Cancelar</>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Usuários
                          </>
                        )}
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
                        onClick={() => setViewMode("list")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
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
                        onClick={() => setViewMode("list")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Perfis
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setViewMode("create")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← Voltar para Criação
                </Button>
                <h3 className="text-lg font-semibold">
                  {activeTab === "user" && "Lista de Usuários"}
                  {activeTab === "team" && "Lista de Times"}
                  {activeTab === "profile" && "Lista de Perfis"}
                </h3>
              </div>

              {/* User List */}
              {activeTab === "user" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Usuários Cadastrados</CardTitle>
                    <CardDescription>
                      {users.length} usuário{users.length !== 1 ? 's' : ''} no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => {
                          const userProfile = profiles.find(p => p.id === user.profileId);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-indigo-500 text-white text-sm">
                                      {user.avatar}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600">{user.email}</TableCell>
                              <TableCell>{user.role || "—"}</TableCell>
                              <TableCell>
                                {userProfile ? (
                                  <Badge 
                                    variant="outline"
                                    style={{ borderColor: userProfile.color, color: userProfile.color }}
                                  >
                                    {userProfile.name}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={`w-2 h-2 rounded-full ${
                                      user.status === 'online' ? 'bg-green-500' :
                                      user.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                                    }`}
                                  />
                                  <span className="text-sm capitalize">
                                    {user.status === 'online' ? 'Online' :
                                     user.status === 'busy' ? 'Ocupado' : 'Offline'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditUser(user)}
                                    data-testid={`edit-user-${user.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-red-600"
                                    onClick={() => handleDeleteUser(user.id)}
                                    data-testid={`delete-user-${user.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Team List */}
              {activeTab === "team" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Times Cadastrados</CardTitle>
                    <CardDescription>
                      {teams.length} time{teams.length !== 1 ? 's' : ''} no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Time</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team) => (
                          <TableRow key={team.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                                  style={{ backgroundColor: team.color || '#3b82f6' }}
                                >
                                  {team.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{team.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{team.description || "—"}</TableCell>
                            <TableCell className="text-gray-600">
                              {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEditTeam(team)}
                                  data-testid={`edit-team-${team.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-red-600"
                                  onClick={() => handleDeleteTeam(team.id)}
                                  data-testid={`delete-team-${team.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Profile List */}
              {activeTab === "profile" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Perfis Cadastrados</CardTitle>
                    <CardDescription>
                      {profiles.length} perfil{profiles.length !== 1 ? 'is' : ''} no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Perfil</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Permissões</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                                  style={{ backgroundColor: profile.color }}
                                >
                                  {profile.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{profile.name}</span>
                                {profile.isDefault === "true" && (
                                  <Badge variant="secondary" className="text-xs">
                                    Padrão
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{profile.description || "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  Ver permissões
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEditProfile(profile)}
                                  data-testid={`edit-profile-${profile.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-red-600"
                                  onClick={() => handleDeleteProfile(profile.id)}
                                  data-testid={`delete-profile-${profile.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}