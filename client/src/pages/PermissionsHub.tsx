import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  User,
  Settings
} from "lucide-react";
import type { User as UserType, Team, Profile, Permission, UserTeam, TeamProfile } from "@shared/schema";
import { insertUserSchema, insertTeamSchema, insertProfileSchema } from "@shared/schema";

type Section = "users" | "teams" | "profiles" | "permissions" | null;

export default function PermissionsHub() {
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dados
  const { data: users = [] } = useQuery<UserType[]>({ queryKey: ["/api/users"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: profiles = [] } = useQuery<Profile[]>({ queryKey: ["/api/profiles"] });
  const { data: permissions = [] } = useQuery<Permission[]>({ queryKey: ["/api/permissions"] });
  const { data: userTeams = [] } = useQuery<UserTeam[]>({ queryKey: ["/api/user-teams"] });
  const { data: teamProfiles = [] } = useQuery<TeamProfile[]>({ queryKey: ["/api/team-profiles"] });

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
    mutationFn: (data: any) => apiRequest("/api/users", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      userForm.reset();
      toast({ title: "Usuário criado" });
    }
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/users/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingId(null);
      userForm.reset();
      toast({ title: "Usuário atualizado" });
    }
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/users/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário excluído" });
    }
  });

  const createTeam = useMutation({
    mutationFn: (data: any) => apiRequest("/api/teams", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      teamForm.reset();
      toast({ title: "Time criado" });
    }
  });

  const updateTeam = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/teams/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingId(null);
      teamForm.reset();
      toast({ title: "Time atualizado" });
    }
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/teams/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Time excluído" });
    }
  });

  const createProfile = useMutation({
    mutationFn: (data: any) => apiRequest("/api/profiles", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      profileForm.reset();
      toast({ title: "Perfil criado" });
    }
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/profiles/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setEditingId(null);
      profileForm.reset();
      toast({ title: "Perfil atualizado" });
    }
  });

  const deleteProfile = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/profiles/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Perfil excluído" });
    }
  });

  const linkUserToProfile = useMutation({
    mutationFn: ({ userId, profileId }: { userId: string; profileId: string }) => 
      apiRequest(`/api/users/${userId}`, "PATCH", { profileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário vinculado ao perfil" });
    }
  });

  const unlinkUserFromProfile = useMutation({
    mutationFn: (userId: string) => 
      apiRequest(`/api/users/${userId}`, "PATCH", { profileId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Vínculo removido" });
    }
  });

  const linkTeamToProfile = useMutation({
    mutationFn: ({ teamId, profileId }: { teamId: string; profileId: string }) => 
      apiRequest("/api/team-profiles", "POST", { teamId, profileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-profiles"] });
      toast({ title: "Time vinculado ao perfil" });
    }
  });

  const unlinkTeamFromProfile = useMutation({
    mutationFn: (linkId: string) => 
      apiRequest(`/api/team-profiles/${linkId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-profiles"] });
      toast({ title: "Vínculo removido" });
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
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
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
            <h2 className="text-xl font-bold">Times</h2>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Time</DialogTitle>
                <DialogDescription>Crie um agrupamento de usuários</DialogDescription>
              </DialogHeader>
              <Form {...teamForm}>
                <form onSubmit={teamForm.handleSubmit((data) => createTeam.mutate(data))} className="space-y-4">
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
                  <DialogFooter>
                    <Button type="submit" disabled={createTeam.isPending}>
                      {createTeam.isPending ? "Criando..." : "Criar"}
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
                        onClick={() => handleEdit('team', team)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Time</DialogTitle>
                        <DialogDescription>Altere as informações do time</DialogDescription>
                      </DialogHeader>
                      <Form {...teamForm}>
                        <form onSubmit={teamForm.handleSubmit((data) => updateTeam.mutate({ id: team.id, ...data }))} className="space-y-4">
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
                          <DialogFooter>
                            <Button type="submit" disabled={updateTeam.isPending}>
                              {updateTeam.isPending ? "Salvando..." : "Salvar"}
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Perfil</DialogTitle>
                <DialogDescription>Defina um conjunto de funcionalidades</DialogDescription>
              </DialogHeader>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => createProfile.mutate(data))} className="space-y-4">
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
                  <DialogFooter>
                    <Button type="submit" disabled={createProfile.isPending}>
                      {createProfile.isPending ? "Criando..." : "Criar"}
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
                    <p className="font-medium">{profile.name}</p>
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                        <DialogDescription>Altere as informações do perfil</DialogDescription>
                      </DialogHeader>
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit((data) => updateProfile.mutate({ id: profile.id, ...data }))} className="space-y-4">
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
                          <DialogFooter>
                            <Button type="submit" disabled={updateProfile.isPending}>
                              {updateProfile.isPending ? "Salvando..." : "Salvar"}
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
                <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {profile && (
                      <Badge variant="outline" style={{ borderColor: profile.color }}>
                        {profile.name}
                      </Badge>
                    )}
                  </div>
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
              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <Users2 className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">{item.team?.name}</p>
                    <p className="text-xs text-muted-foreground">{item.team?.description}</p>
                  </div>
                  {item.profile && (
                    <Badge variant="outline" style={{ borderColor: item.profile.color }}>
                      {item.profile.name}
                    </Badge>
                  )}
                </div>
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
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
                          className="w-full justify-start"
                          onClick={() => {
                            linkUserToProfile.mutate({ userId: user.id, profileId: profile.id });
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: profile.color }}
                          />
                          {profile.name}
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
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.description}</p>
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
                          className="w-full justify-start"
                          onClick={() => {
                            linkTeamToProfile.mutate({ teamId: team.id, profileId: profile.id });
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: profile.color }}
                          />
                          {profile.name}
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