import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Users2, 
  Shield, 
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  ArrowRight,
  User,
  Settings,
  Minus
} from "lucide-react";
import { TeamManagementDialog } from "@/components/kanban/team-management-dialog";
import type { User as UserType, Team, Profile, Permission, UserTeam, TeamProfile, ProfilePermission } from "@shared/schema";
import { insertUserSchema, insertTeamSchema, insertProfileSchema } from "@shared/schema";

type Section = "users" | "teams" | "profiles" | "permissions" | null;

export default function PermissionsHub() {
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dados
  const { data: users = [] } = useQuery<UserType[]>({ queryKey: ["/api/users"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: profiles = [] } = useQuery<Profile[]>({ queryKey: ["/api/profiles"] });
  const { data: permissions = [] } = useQuery<Permission[]>({ queryKey: ["/api/permissions"] });
  const { data: userTeams = [] } = useQuery<UserTeam[]>({ queryKey: ["/api/user-teams"] });
  const { data: teamProfiles = [] } = useQuery<TeamProfile[]>({ queryKey: ["/api/team-profiles"] });
  const { data: profilePermissions = [] } = useQuery<ProfilePermission[]>({ queryKey: ["/api/profile-permissions"] });

  // Para edição de times - obter membros atuais
  const getCurrentTeamMembers = (teamId: string) => {
    return userTeams
      .filter(ut => ut.teamId === teamId)
      .map(ut => users.find(u => u.id === ut.userId))
      .filter(Boolean) as UserType[];
  };

  const getAvailableUsers = (teamId?: string) => {
    if (!teamId) return users; // Para criação de novo time
    const currentMemberIds = getCurrentTeamMembers(teamId).map(u => u.id);
    return users.filter(u => !currentMemberIds.includes(u.id));
  };

  // Helper function para garantir exibição de pelo menos 20 caracteres
  const truncateProfileName = (name: string, maxLength: number = 20) => {
    // Sempre mostra pelo menos 20 caracteres
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Helper function para truncar nome do usuário garantindo pelo menos 20 chars
  const truncateUserName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Forms
  const userForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { name: "", email: "", role: "" }
  });

  const teamForm = useForm({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: { name: "", description: "", color: "#3b82f6" }
  });

  const profileForm = useForm({
    resolver: zodResolver(insertProfileSchema),
    defaultValues: { name: "", description: "", color: "#3b82f6" }
  });

  // Mutations
  const createUser = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      userForm.reset();
      toast({ title: "Usuário criado" });
    }
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingId(null);
      userForm.reset();
      toast({ title: "Usuário atualizado" });
    }
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário excluído" });
    }
  });

  const createTeam = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      teamForm.reset();
      toast({ title: "Time criado" });
    }
  });

  const updateTeam = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingId(null);
      teamForm.reset();
      toast({ title: "Time atualizado" });
    }
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Time excluído" });
    }
  });

  const createProfile = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      profileForm.reset();
      toast({ title: "Perfil criado" });
    }
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/profiles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setEditingId(null);
      profileForm.reset();
      toast({ title: "Perfil atualizado" });
    }
  });

  const deleteProfile = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Perfil excluído" });
    }
  });

  const linkUserToProfile = useMutation({
    mutationFn: ({ userId, profileId }: { userId: string; profileId: string }) => 
      apiRequest("PATCH", `/api/users/${userId}`, { profileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário vinculado ao perfil" });
    }
  });

  const unlinkUserFromProfile = useMutation({
    mutationFn: (userId: string) => 
      apiRequest("PATCH", `/api/users/${userId}`, { profileId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Vínculo removido" });
    }
  });

  const linkTeamToProfile = useMutation({
    mutationFn: ({ teamId, profileId }: { teamId: string; profileId: string }) => 
      apiRequest("POST", "/api/team-profiles", { teamId, profileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-profiles"] });
      toast({ title: "Time vinculado ao perfil" });
    }
  });

  const unlinkTeamFromProfile = useMutation({
    mutationFn: (linkId: string) => 
      apiRequest("DELETE", `/api/team-profiles/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-profiles"] });
      toast({ title: "Vínculo removido" });
    }
  });

  const addUserToTeam = useMutation({
    mutationFn: ({ userId, teamId, role = "member" }: { userId: string; teamId: string; role?: string }) => 
      apiRequest("POST", `/api/users/${userId}/teams/${teamId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-teams"] });
      toast({ title: "Usuário adicionado ao time" });
    }
  });

  const removeUserFromTeam = useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId: string }) => 
      apiRequest("DELETE", `/api/users/${userId}/teams/${teamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-teams"] });
      toast({ title: "Usuário removido do time" });
    }
  });

  const linkPermissionToProfile = useMutation({
    mutationFn: ({ permissionId, profileId }: { permissionId: string; profileId: string }) => 
      apiRequest("POST", `/api/profiles/${profileId}/permissions`, { permissionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      // Toast removido - será mostrado apenas no final do processo
    }
  });

  const unlinkPermissionFromProfile = useMutation({
    mutationFn: ({ permissionId, profileId }: { permissionId: string; profileId: string }) => 
      apiRequest("DELETE", `/api/profiles/${profileId}/permissions/${permissionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Permissão removida do perfil" });
    }
  });

  // Handlers
  const handleEdit = (type: string, item: any) => {
    setEditingId(item.id);
    if (type === 'user') {
      userForm.reset({ name: item.name, email: item.email, role: item.role || "" });
    } else if (type === 'team') {
      teamForm.reset({ name: item.name, description: item.description || "", color: item.color });
    } else if (type === 'profile') {
      profileForm.reset({ name: item.name, description: item.description || "", color: item.color });
    }
  };

  const handleDelete = (type: string, item: any) => {
    if (window.confirm(`Excluir ${item.name}?`)) {
      if (type === 'user') deleteUser.mutate(item.id);
      else if (type === 'team') deleteTeam.mutate(item.id);
      else if (type === 'profile') deleteProfile.mutate(item.id);
    }
  };

  // Dashboard principal
  if (!activeSection) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Sistema de Permissões</h1>
          <p className="text-muted-foreground">Gerencie usuários, times e perfis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card onClick={() => setActiveSection("users")} className="cursor-pointer hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span>Usuários</span>
                </div>
                <Badge variant="secondary">{users.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Criar, editar e gerenciar usuários do sistema
              </p>
            </CardContent>
          </Card>

          <Card onClick={() => setActiveSection("teams")} className="cursor-pointer hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  <Users2 className="w-5 h-5 text-green-500" />
                  <span>Times</span>
                </div>
                <Badge variant="secondary">{teams.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Agrupar usuários em times organizados
              </p>
            </CardContent>
          </Card>

          <Card onClick={() => setActiveSection("profiles")} className="cursor-pointer hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <span>Perfis</span>
                </div>
                <Badge variant="secondary">{profiles.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Definir conjuntos de funcionalidades
              </p>
            </CardContent>
          </Card>

          <Card onClick={() => setActiveSection("permissions")} className="cursor-pointer hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-orange-500" />
                  <span>Vínculos</span>
                </div>
                <Badge variant="secondary">Config</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Conectar perfis a usuários e times
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Seção de Usuários
  if (activeSection === "users") {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveSection(null)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-xl font-bold">Usuários</h2>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Usuário</DialogTitle>
                <DialogDescription>Adicione um novo usuário ao sistema</DialogDescription>
              </DialogHeader>
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit((data) => createUser.mutate(data))} className="space-y-4">
                  <FormField
                    control={userForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createUser.isPending}>
                      {createUser.isPending ? "Criando..." : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{user.name}</p>
                      {user.profileId && (() => {
                        const userProfile = profiles.find(p => p.id === user.profileId);
                        return userProfile ? (
                          <span 
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: userProfile.color }}
                            title={`Perfil: ${userProfile.name}`}
                          />
                        ) : null;
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.profileId && (() => {
                      const userProfile = profiles.find(p => p.id === user.profileId);
                      return userProfile ? (
                        <p className="text-xs text-gray-500">Perfil: {userProfile.name}</p>
                      ) : null;
                    })()}
                  </div>
                  {user.role && <Badge variant="outline">{user.role}</Badge>}
                </div>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit('user', user)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>Altere as informações do usuário</DialogDescription>
                      </DialogHeader>
                      <Form {...userForm}>
                        <form onSubmit={userForm.handleSubmit((data) => updateUser.mutate({ id: user.id, ...data }))} className="space-y-4">
                          <FormField
                            control={userForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cargo</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={updateUser.isPending}>
                              {updateUser.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete('user', user)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Seção de Times
  if (activeSection === "teams") {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveSection(null)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold">Times</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTeamManagementOpen(true)}
                className="p-1 opacity-60 hover:opacity-100 transition-opacity"
                title="Gerenciar Times e Membros"
              >
                <Settings className="w-3 h-3 text-gray-600" />
              </Button>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Time
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Time</DialogTitle>
                <DialogDescription>Crie um agrupamento de usuários</DialogDescription>
              </DialogHeader>
              <Form {...teamForm}>
                <form onSubmit={teamForm.handleSubmit(async (data) => {
                  const response = await createTeam.mutateAsync(data);
                  const team = await response.json();
                  // Adicionar usuários selecionados ao time
                  for (const userId of selectedUsers) {
                    await addUserToTeam.mutateAsync({ userId, teamId: team.id, role: "member" });
                  }
                  setSelectedUsers([]);
                })} className="space-y-4">
                  <FormField
                    control={teamForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Interface de Duas Colunas para Seleção de Membros */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Membros do Time</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedUsers.length === users.length) {
                            setSelectedUsers([]);
                          } else {
                            setSelectedUsers(users.map(u => u.id));
                          }
                        }}
                      >
                        {selectedUsers.length === users.length ? "Desmarcar Todos" : "Selecionar Todos"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Coluna Esquerda - Membros Selecionados */}
                      <div className="space-y-2">
                        <Label className="text-green-600 font-semibold flex items-center justify-between">
                          Membros Selecionados
                          <Badge variant="secondary">{selectedUsers.length}</Badge>
                        </Label>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto min-h-[120px]">
                          {selectedUsers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4 text-sm">
                              Nenhum membro selecionado
                            </p>
                          ) : (
                            users.filter(u => selectedUsers.includes(u.id)).map((user) => (
                              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                <div className="flex items-center space-x-2 flex-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <div>
                                    <p className="text-sm font-medium text-green-700">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedUsers(prev => prev.filter(id => id !== user.id))}
                                >
                                  <Minus className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Coluna Direita - Membros Disponíveis */}
                      <div className="space-y-2">
                        <Label className="text-blue-600 font-semibold flex items-center justify-between">
                          Membros Disponíveis
                          <Badge variant="secondary">{users.filter(u => !selectedUsers.includes(u.id)).length}</Badge>
                        </Label>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto min-h-[120px]">
                          {users.filter(u => !selectedUsers.includes(u.id)).length === 0 ? (
                            <p className="text-center text-muted-foreground py-4 text-sm">
                              Todos os usuários selecionados
                            </p>
                          ) : (
                            users.filter(u => !selectedUsers.includes(u.id)).map((user) => (
                              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                <div className="flex items-center space-x-2 flex-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <div>
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedUsers(prev => [...prev, user.id])}
                                >
                                  <Plus className="w-3 h-3 text-green-500" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createTeam.isPending || addUserToTeam.isPending}>
                      {(createTeam.isPending || addUserToTeam.isPending) ? "Criando..." : "Criar Time"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <p className="font-medium">{team.name}</p>
                    {team.description && (
                      <p className="text-sm text-muted-foreground">{team.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingTeam(team);
                          // Inicializar com membros atuais do time
                          const currentMembers = getCurrentTeamMembers(team.id);
                          setSelectedUsers(currentMembers.map(m => m.id));
                          handleEdit('team', team);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Editar Time</DialogTitle>
                        <DialogDescription>Altere as informações e membros do time</DialogDescription>
                      </DialogHeader>
                      <Form {...teamForm}>
                        <form onSubmit={teamForm.handleSubmit(async (data) => {
                          // Atualizar dados do time
                          await updateTeam.mutateAsync({ id: team.id, ...data });
                          
                          // Gerenciar membros
                          const currentMembers = getCurrentTeamMembers(team.id);
                          const currentMemberIds = currentMembers.map(m => m.id);
                          
                          // Remover membros que não estão mais selecionados
                          for (const memberId of currentMemberIds) {
                            if (!selectedUsers.includes(memberId)) {
                              await removeUserFromTeam.mutateAsync({ userId: memberId, teamId: team.id });
                            }
                          }
                          
                          // Adicionar novos membros selecionados
                          for (const userId of selectedUsers) {
                            if (!currentMemberIds.includes(userId)) {
                              await addUserToTeam.mutateAsync({ userId, teamId: team.id, role: "member" });
                            }
                          }
                          
                          setEditingTeam(null);
                          setSelectedUsers([]);
                        })} className="space-y-4">
                          <FormField
                            control={teamForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={teamForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Textarea {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Interface de Duas Colunas para Edição de Membros */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <FormLabel>Gerenciar Membros</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const availableUsers = getAvailableUsers(team.id);
                                  if (selectedUsers.length === (getCurrentTeamMembers(team.id).length + availableUsers.length)) {
                                    setSelectedUsers([]);
                                  } else {
                                    setSelectedUsers([...getCurrentTeamMembers(team.id).map(m => m.id), ...availableUsers.map(u => u.id)]);
                                  }
                                }}
                              >
                                Selecionar/Desmarcar Todos
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Coluna Esquerda - Membros Selecionados */}
                              <div className="space-y-2">
                                <Label className="text-green-600 font-semibold flex items-center justify-between">
                                  Membros do Time
                                  <Badge variant="secondary">{selectedUsers.length}</Badge>
                                </Label>
                                <div className="border rounded-md p-3 max-h-48 overflow-y-auto min-h-[120px]">
                                  {selectedUsers.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4 text-sm">
                                      Nenhum membro no time
                                    </p>
                                  ) : (
                                    users.filter(u => selectedUsers.includes(u.id)).map((user) => (
                                      <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                        <div className="flex items-center space-x-2 flex-1">
                                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                          <div>
                                            <p className="text-sm font-medium text-green-700">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedUsers(prev => prev.filter(id => id !== user.id))}
                                        >
                                          <Minus className="w-3 h-3 text-red-500" />
                                        </Button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Coluna Direita - Membros Disponíveis */}
                              <div className="space-y-2">
                                <Label className="text-blue-600 font-semibold flex items-center justify-between">
                                  Usuários Disponíveis
                                  <Badge variant="secondary">{users.filter(u => !selectedUsers.includes(u.id)).length}</Badge>
                                </Label>
                                <div className="border rounded-md p-3 max-h-48 overflow-y-auto min-h-[120px]">
                                  {users.filter(u => !selectedUsers.includes(u.id)).length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4 text-sm">
                                      Todos os usuários estão no time
                                    </p>
                                  ) : (
                                    users.filter(u => !selectedUsers.includes(u.id)).map((user) => (
                                      <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                        <div className="flex items-center space-x-2 flex-1">
                                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                          <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedUsers(prev => [...prev, user.id])}
                                        >
                                          <Plus className="w-3 h-3 text-green-500" />
                                        </Button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button type="submit" disabled={updateTeam.isPending || addUserToTeam.isPending || removeUserFromTeam.isPending}>
                              {(updateTeam.isPending || addUserToTeam.isPending || removeUserFromTeam.isPending) ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete('team', team)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Team Management Dialog */}
        <TeamManagementDialog
          open={isTeamManagementOpen}
          onOpenChange={setIsTeamManagementOpen}
        />
      </div>
    );
  }

  // Seção de Perfis
  if (activeSection === "profiles") {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveSection(null)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-xl font-bold">Perfis</h2>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Perfil</DialogTitle>
                <DialogDescription>Defina um conjunto de funcionalidades do sistema</DialogDescription>
              </DialogHeader>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(async (data) => {
                  const response = await createProfile.mutateAsync(data);
                  const profile = await response.json();
                  
                  // Vincular permissões selecionadas ao perfil
                  if (selectedPermissions.length > 0) {
                    for (const permissionId of selectedPermissions) {
                      await linkPermissionToProfile.mutateAsync({ permissionId, profileId: profile.id });
                    }
                    toast({ title: `Perfil criado com ${selectedPermissions.length} permiss${selectedPermissions.length > 1 ? 'ões' : 'ão'}` });
                  }
                  
                  setSelectedPermissions([]);
                })} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Permissões do Perfil</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedPermissions.length === permissions.length) {
                            setSelectedPermissions([]);
                          } else {
                            setSelectedPermissions(permissions.map(p => p.id));
                          }
                        }}
                      >
                        {selectedPermissions.length === permissions.length ? "Desmarcar Todas" : "Selecionar Todas"}
                      </Button>
                    </div>
                    <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions(prev => [...prev, permission.id]);
                              } else {
                                setSelectedPermissions(prev => prev.filter(id => id !== permission.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{permission.name}</p>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                            <Badge variant="outline" className="mt-1">
                              {permission.category}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedPermissions.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedPermissions.length} permissão{selectedPermissions.length > 1 ? 'ões' : ''} selecionada{selectedPermissions.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createProfile.isPending || linkPermissionToProfile.isPending}
                    >
                      {(createProfile.isPending || linkPermissionToProfile.isPending) ? "Criando..." : "Criar Perfil"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: profile.color }}
                  />
                  <div>
                    <p className="font-medium" title={profile.name}>{truncateProfileName(profile.name)}</p>
                    {profile.description && (
                      <p className="text-sm text-muted-foreground">{profile.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit('profile', profile)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                        <DialogDescription>Altere as informações do perfil e gerencie suas permissões</DialogDescription>
                      </DialogHeader>
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(async (data) => {
                          await updateProfile.mutateAsync({ id: profile.id, ...data });
                          
                          // Vincular permissões selecionadas ao perfil (se houver mudanças)
                          if (selectedPermissions.length > 0) {
                            for (const permissionId of selectedPermissions) {
                              await linkPermissionToProfile.mutateAsync({ permissionId, profileId: profile.id });
                            }
                            toast({ title: `${selectedPermissions.length} permiss${selectedPermissions.length > 1 ? 'ões adicionadas' : 'ão adicionada'} ao perfil` });
                          }
                          
                          setSelectedPermissions([]);
                        })} className="space-y-4">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Textarea {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {(() => {
                            const currentPermissions = profilePermissions
                              .filter((pp: ProfilePermission) => pp.profileId === profile.id)
                              .map((pp: ProfilePermission) => permissions.find((p: Permission) => p.id === pp.permissionId))
                              .filter(Boolean) as Permission[];
                            
                            const availablePermissions = permissions.filter((p: Permission) => 
                              !currentPermissions.some((cp: Permission) => cp && cp.id === p.id)
                            );

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Permissões Atuais */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-green-600">Permissões Ativas</FormLabel>
                                    <Badge variant="secondary">{currentPermissions.length}</Badge>
                                  </div>
                                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                                    {currentPermissions.map((permission: Permission) => (
                                      <div key={permission.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-green-700">{permission.name}</p>
                                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                                          <Badge variant="outline" className="mt-1">
                                            {permission.category}
                                          </Badge>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            if (window.confirm(`Remover permissão ${permission.name}?`)) {
                                              await unlinkPermissionFromProfile.mutateAsync({ 
                                                permissionId: permission.id, 
                                                profileId: profile.id 
                                              });
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      </div>
                                    ))}
                                    {currentPermissions.length === 0 && (
                                      <p className="text-center text-muted-foreground py-4">
                                        Nenhuma permissão ativa
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Permissões Disponíveis */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-blue-600">Disponíveis para Adicionar</FormLabel>
                                    <div className="flex space-x-2">
                                      <Badge variant="secondary">{availablePermissions.length}</Badge>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (selectedPermissions.length === availablePermissions.length) {
                                            setSelectedPermissions([]);
                                          } else {
                                            setSelectedPermissions(availablePermissions.map(p => p.id));
                                          }
                                        }}
                                      >
                                        {selectedPermissions.length === availablePermissions.length ? "Desmarcar" : "Todas"}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                                    {availablePermissions.map((permission: Permission) => (
                                      <div key={permission.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                                        <Checkbox
                                          checked={selectedPermissions.includes(permission.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedPermissions(prev => [...prev, permission.id]);
                                            } else {
                                              setSelectedPermissions(prev => prev.filter(id => id !== permission.id));
                                            }
                                          }}
                                        />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{permission.name}</p>
                                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                                          <Badge variant="outline" className="mt-1">
                                            {permission.category}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                    {availablePermissions.length === 0 && (
                                      <p className="text-center text-muted-foreground py-4">
                                        Todas as permissões já foram atribuídas
                                      </p>
                                    )}
                                  </div>
                                  {selectedPermissions.length > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                      {selectedPermissions.length} permissão{selectedPermissions.length > 1 ? 'ões' : ''} para adicionar
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          <DialogFooter>
                            <Button type="submit" disabled={updateProfile.isPending || linkPermissionToProfile.isPending}>
                              {(updateProfile.isPending || linkPermissionToProfile.isPending) ? "Salvando..." : "Salvar"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete('profile', profile)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Seção de Vínculos  
  const usersWithProfiles = users.filter(user => user.profileId);
  const usersWithoutProfiles = users.filter(user => !user.profileId);
  const teamsWithProfiles = teamProfiles.map(tp => ({
    ...tp,
    team: teams.find(t => t.id === tp.teamId),
    profile: profiles.find(p => p.id === tp.profileId)
  })).filter(item => item.team && item.profile);
  const teamsWithoutProfiles = teams.filter(team => 
    !teamProfiles.some(tp => tp.teamId === team.id)
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setActiveSection(null)}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-xl font-bold">Vínculos de Permissões</h2>
        <p className="text-muted-foreground">Conecte perfis a usuários e times</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Usuários com Perfis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Usuários com Perfis</span>
              <Badge variant="secondary">{usersWithProfiles.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersWithProfiles.map((user) => {
              const profile = profiles.find(p => p.id === user.profileId);
              
              return (
                <div key={user.id} className="p-2 border rounded space-y-2">
                  {/* Linha 1: Ícone + Nome + Perfil */}
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-sm font-medium flex-shrink-0" title={user.name}>
                      {truncateUserName(user.name, 20)}
                    </p>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    {profile && (
                      <Badge variant="outline" style={{ borderColor: profile.color }} className="text-xs flex-shrink-0" title={profile.name}>
                        {truncateProfileName(profile.name, 20)}
                      </Badge>
                    )}
                  </div>
                  {/* Linha 2: Email + Botões */}
                  <div className="flex items-center justify-between pl-6">
                    <p className="text-xs text-muted-foreground flex-1 min-w-0 mr-2" title={user.email}>
                      {user.email}
                    </p>
                    <div className="flex space-x-2 flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Perfil do Usuário</DialogTitle>
                            <DialogDescription>Altere o perfil de {user.name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            {profiles.map((newProfile) => (
                              <Button
                                key={newProfile.id}
                                variant={newProfile.id === profile?.id ? "default" : "outline"}
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                  if (newProfile.id !== profile?.id) {
                                    linkUserToProfile.mutate({ userId: user.id, profileId: newProfile.id });
                                  }
                                }}
                              >
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: newProfile.color }}
                                />
                                {truncateProfileName(newProfile.name, 25)}
                                {newProfile.id === profile?.id && (
                                  <Badge className="ml-2 text-xs">Atual</Badge>
                                )}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Remover perfil do usuário ${user.name}?`)) {
                            unlinkUserFromProfile.mutate(user.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {usersWithProfiles.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum usuário com perfil vinculado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Times com Perfis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Times com Perfis</span>
              <Badge variant="secondary">{teamsWithProfiles.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamsWithProfiles.map((item) => (
              <div key={item.id} className="p-2 border rounded space-y-2">
                {/* Linha 1: Ícone + Nome do Time + Perfil */}
                <div className="flex items-center space-x-2">
                  <Users2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm font-medium flex-shrink-0" title={item.team?.name}>
                    {truncateUserName(item.team?.name || "", 20)}
                  </p>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  {item.profile && (
                    <Badge variant="outline" style={{ borderColor: item.profile.color }} className="text-xs flex-shrink-0" title={item.profile.name}>
                      {truncateProfileName(item.profile.name, 20)}
                    </Badge>
                  )}
                </div>
                {/* Linha 2: Descrição + Botões */}
                <div className="flex items-center justify-between pl-6">
                  <p className="text-xs text-muted-foreground flex-1 min-w-0 mr-2" title={item.team?.description || ""}>
                    {item.team?.description}
                  </p>
                  <div className="flex space-x-2 flex-shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Perfil do Time</DialogTitle>
                          <DialogDescription>Altere o perfil de {item.team?.name}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          {profiles.map((newProfile) => (
                            <Button
                              key={newProfile.id}
                              variant={newProfile.id === item.profile?.id ? "default" : "outline"}
                              className="w-full justify-start text-sm"
                              onClick={() => {
                                if (newProfile.id !== item.profile?.id) {
                                  linkTeamToProfile.mutate({ teamId: item.teamId, profileId: newProfile.id });
                                }
                              }}
                            >
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: newProfile.color }}
                              />
                              {truncateProfileName(newProfile.name, 25)}
                              {newProfile.id === item.profile?.id && (
                                <Badge className="ml-2 text-xs">Atual</Badge>
                              )}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Remover perfil do time ${item.team?.name}?`)) {
                          unlinkTeamFromProfile.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {teamsWithProfiles.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum time com perfil vinculado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vincular Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Vincular Usuários a Perfis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersWithoutProfiles.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2 flex-1 min-w-0 mr-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate" title={user.email}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vincular Perfil ao Usuário</DialogTitle>
                      <DialogDescription>Selecione um perfil para {user.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      {profiles.map((profile) => (
                        <Button
                          key={profile.id}
                          variant="outline"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            linkUserToProfile.mutate({ userId: user.id, profileId: profile.id });
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: profile.color }}
                          />
                          {truncateProfileName(profile.name, 25)}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
            {usersWithoutProfiles.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Todos os usuários já possuem perfis
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vincular Times */}
        <Card>
          <CardHeader>
            <CardTitle>Vincular Times a Perfis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamsWithoutProfiles.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2 flex-1 min-w-0 mr-2">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground truncate" title={team.description || ""}>
                      {team.description}
                    </p>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vincular Perfil ao Time</DialogTitle>
                      <DialogDescription>Selecione um perfil para {team.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      {profiles.map((profile) => (
                        <Button
                          key={profile.id}
                          variant="outline"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            linkTeamToProfile.mutate({ teamId: team.id, profileId: profile.id });
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: profile.color }}
                          />
                          {truncateProfileName(profile.name, 25)}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
            {teamsWithoutProfiles.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Todos os times já possuem perfis
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}