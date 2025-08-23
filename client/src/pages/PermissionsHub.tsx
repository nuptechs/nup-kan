import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import type { User as UserType, Team, Profile, Permission } from "@shared/schema";
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

  // Seção de Vínculos (placeholder)
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
      </div>
      
      <Card className="p-8 text-center">
        <CardContent>
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
          <p className="text-muted-foreground">
            Sistema de vínculos entre perfis e usuários/times será implementado aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}