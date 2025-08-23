import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield,
  Search,
  Settings,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Profile, Permission, ProfilePermission, InsertProfile, UpdateProfile } from "@shared/schema";
import { insertProfileSchema, updateProfileSchema } from "@shared/schema";

export function ProfilesSection() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [managingProfileId, setManagingProfileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar dados
  const { data: profiles = [], isLoading } = useQuery<Profile[]>({ queryKey: ["/api/profiles"] });
  const { data: permissions = [] } = useQuery<Permission[]>({ queryKey: ["/api/permissions"] });
  const { data: profilePermissions = [] } = useQuery<ProfilePermission[]>({ queryKey: ["/api/profile-permissions"] });

  // Forms
  const createForm = useForm<InsertProfile>({
    resolver: zodResolver(insertProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
      isDefault: "false"
    }
  });

  const editForm = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema)
  });

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: async (data: InsertProfile) => {
      return apiRequest("/api/profiles", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Sucesso",
        description: "Perfil criado com sucesso"
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateProfile & { id: string }) => {
      return apiRequest(`/api/profiles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setEditingProfile(null);
      editForm.reset();
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso"
      });
    }
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/profiles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({
        title: "Sucesso",
        description: "Perfil excluído com sucesso"
      });
    }
  });

  const updateProfilePermissionsMutation = useMutation({
    mutationFn: async ({ profileId, permissionIds }: { profileId: string; permissionIds: string[] }) => {
      return apiRequest(`/api/profiles/${profileId}/permissions`, {
        method: "POST",
        body: JSON.stringify({ permissionIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-permissions"] });
      setManagingProfileId(null);
      setSelectedPermissions([]);
      toast({
        title: "Sucesso",
        description: "Permissões do perfil atualizadas"
      });
    }
  });

  // Handlers
  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    editForm.reset({
      name: profile.name,
      description: profile.description || "",
      color: profile.color,
      isDefault: profile.isDefault
    });
  };

  const handleDelete = (profile: Profile) => {
    if (window.confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
      deleteProfileMutation.mutate(profile.id);
    }
  };

  const handleManagePermissions = (profile: Profile) => {
    setManagingProfileId(profile.id);
    const currentPermissions = getProfilePermissions(profile.id).map(p => p.id);
    setSelectedPermissions(currentPermissions);
  };

  const onCreateSubmit = (data: InsertProfile) => {
    createProfileMutation.mutate(data);
  };

  const onEditSubmit = (data: UpdateProfile) => {
    if (editingProfile) {
      updateProfileMutation.mutate({ ...data, id: editingProfile.id });
    }
  };

  const handleSavePermissions = () => {
    if (managingProfileId) {
      updateProfilePermissionsMutation.mutate({
        profileId: managingProfileId,
        permissionIds: selectedPermissions
      });
    }
  };

  // Utilitários
  const getProfilePermissions = (profileId: string) => {
    const profilePermissionIds = profilePermissions
      .filter(pp => pp.profileId === profileId)
      .map(pp => pp.permissionId);
    return permissions.filter(p => profilePermissionIds.includes(p.id));
  };

  const groupPermissionsByCategory = () => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const categoryLabels: Record<string, string> = {
    tasks: "Tarefas",
    columns: "Colunas", 
    teams: "Times",
    users: "Usuários",
    profiles: "Perfis",
    analytics: "Analytics"
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.description && profile.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div>Carregando perfis...</div>;
  }

  const managingProfile = managingProfileId ? profiles.find(p => p.id === managingProfileId) : null;
  const permissionsByCategory = groupPermissionsByCategory();

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Perfis</h2>
          <p className="text-muted-foreground">
            Total: {profiles.length} perfis
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-profile">
              <Plus className="w-4 h-4 mr-2" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Perfil</DialogTitle>
              <DialogDescription>
                Crie um agrupamento de funcionalidades
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Perfil</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Administrador, Editor, Visualizador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva as responsabilidades deste perfil..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Perfil</FormLabel>
                      <FormControl>
                        <Input type="color" className="h-10 w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createProfileMutation.isPending}>
                    {createProfileMutation.isPending ? "Criando..." : "Criar Perfil"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => {
          const profilePerms = getProfilePermissions(profile.id);
          return (
            <Card key={profile.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: profile.color }}
                    />
                    <div>
                      <CardTitle className="text-base">{profile.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {profilePerms.length} funcionalidade(s)
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManagePermissions(profile)}
                      data-testid={`button-manage-permissions-${profile.id}`}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(profile)}
                      data-testid={`button-edit-profile-${profile.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(profile)}
                      data-testid={`button-delete-profile-${profile.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.description && (
                    <p className="text-sm text-muted-foreground">{profile.description}</p>
                  )}
                  
                  {profile.isDefault === "true" && (
                    <Badge variant="secondary" className="text-xs">
                      Perfil Padrão
                    </Badge>
                  )}
                  
                  {profilePerms.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Funcionalidades</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profilePerms.slice(0, 3).map((perm) => (
                          <Badge key={perm.id} variant="secondary" className="text-xs">
                            {perm.name}
                          </Badge>
                        ))}
                        {profilePerms.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{profilePerms.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Altere as informações do perfil
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Perfil</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Administrador, Editor, Visualizador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva as responsabilidades deste perfil..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do Perfil</FormLabel>
                    <FormControl>
                      <Input type="color" className="h-10 w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerenciamento de Permissões */}
      <Dialog open={!!managingProfileId} onOpenChange={() => setManagingProfileId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Funcionalidades: {managingProfile?.name}</DialogTitle>
            <DialogDescription>
              Selecione as funcionalidades que este perfil pode acessar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
              <div key={category}>
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>{categoryLabels[category] || category}</span>
                  <Badge variant="outline" className="text-xs">
                    {categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length} de {categoryPermissions.length}
                  </Badge>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, permission.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={permission.id} className="text-sm font-medium cursor-pointer">
                          {permission.name}
                        </Label>
                        {permission.description && (
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        )}
                      </div>
                      {selectedPermissions.includes(permission.id) && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSavePermissions}
              disabled={updateProfilePermissionsMutation.isPending}
            >
              {updateProfilePermissionsMutation.isPending ? "Salvando..." : "Salvar Funcionalidades"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}