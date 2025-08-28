import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema, insertPermissionSchema, type Profile, type Permission, type ProfilePermission, type TeamProfile } from "@shared/schema";
import type { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Trash2, UserCog, Shield, Users, CheckCircle, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type InsertProfile = z.infer<typeof insertProfileSchema>;
type InsertPermission = z.infer<typeof insertPermissionSchema>;

interface ProfileManagementDialogProps {
  children: React.ReactNode;
}

export function ProfileManagementDialog({ children }: ProfileManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: profilePermissions = [], isLoading: profilePermissionsLoading } = useQuery<ProfilePermission[]>({
    queryKey: ["/api/profiles", selectedProfile?.id, "permissions"],
    enabled: !!selectedProfile,
  });

  // Forms
  const profileForm = useForm<InsertProfile>({
    resolver: zodResolver(insertProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
      isDefault: "false",
    },
  });

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: async (data: InsertProfile) => {
      const response = await apiRequest("POST", "/api/profiles", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidações imediatas e aguardar
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/permissions-data"] })
      ]).then(() => {
        toast({
          title: "Sucesso",
          description: "Perfil criado com sucesso!",
        });
        setIsCreatingProfile(false);
        profileForm.reset();
        setOpen(false); // Fecha o modal automaticamente
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProfile> }) => {
      const response = await apiRequest("PATCH", `/api/profiles/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidações imediatas e aguardar
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/permissions-data"] })
      ]).then(() => {
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!",
        });
        setEditingProfile(null);
        setOpen(false); // Fecha o modal automaticamente
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/profiles/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setSelectedProfile(null);
      toast({
        title: "Sucesso",
        description: "Perfil excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: async ({ profileId, permissionId }: { profileId: string; permissionId: string }) => {
      const response = await apiRequest("POST", `/api/profiles/${profileId}/permissions/${permissionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", selectedProfile?.id, "permissions"] });
      toast({
        title: "Sucesso",
        description: "Permissão adicionada ao perfil!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar permissão. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ profileId, permissionId }: { profileId: string; permissionId: string }) => {
      const response = await apiRequest("DELETE", `/api/profiles/${profileId}/permissions/${permissionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", selectedProfile?.id, "permissions"] });
      toast({
        title: "Sucesso",
        description: "Permissão removida do perfil!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover permissão. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: InsertProfile) => {
    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, data });
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setIsCreatingProfile(true);
    profileForm.reset({
      name: profile.name,
      description: profile.description || "",
      color: profile.color,
      isDefault: profile.isDefault,
    });
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (window.confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
      deleteProfileMutation.mutate(profile.id);
    }
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedProfile) return;

    const hasPermission = profilePermissions.some(pp => pp.permissionId === permissionId);
    
    if (hasPermission) {
      removePermissionMutation.mutate({ 
        profileId: selectedProfile.id, 
        permissionId 
      });
    } else {
      addPermissionMutation.mutate({ 
        profileId: selectedProfile.id, 
        permissionId 
      });
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels: Record<string, string> = {
    tasks: "Tarefas",
    columns: "Colunas",
    teams: "Times",
    users: "Usuários",
    profiles: "Perfis",
    analytics: "Analytics",
  };

  useEffect(() => {
    if (!open) {
      setSelectedProfile(null);
      setEditingProfile(null);
      setIsCreatingProfile(false);
      profileForm.reset();
    }
  }, [open, profileForm]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="profile-management-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Perfis
          </DialogTitle>
          <DialogDescription id="profile-management-description" className="text-xs text-muted-foreground">
            Gerencie perfis e permissões.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Perfis
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Lista de Perfis</h3>
              <Button
                onClick={() => {
                  setIsCreatingProfile(true);
                  setEditingProfile(null);
                  profileForm.reset();
                }}
                className="flex items-center gap-2"
                data-testid="button-create-profile"
              >
                <Plus className="h-4 w-4" />
                Novo Perfil
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Lista de Perfis</h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {profilesLoading ? (
                      <div className="text-sm text-muted-foreground">Carregando perfis...</div>
                    ) : (
                      profiles.map((profile) => (
                        <div
                          key={profile.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedProfile?.id === profile.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedProfile(profile)}
                          data-testid={`card-profile-${profile.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: profile.color }}
                              />
                              <span className="font-medium">{profile.name}</span>
                              {profile.isDefault === "true" && (
                                <Badge variant="secondary" className="text-xs">
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProfile(profile);
                                }}
                                data-testid={`button-edit-profile-${profile.id}`}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProfile(profile);
                                }}
                                data-testid={`button-delete-profile-${profile.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {profile.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {profile.description}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                {isCreatingProfile ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {editingProfile ? "Editar Perfil" : "Criar Novo Perfil"}
                    </h4>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Perfil</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Administrador" {...field} data-testid="input-profile-name" />
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
                                <Textarea 
                                  placeholder="Descreva as responsabilidades deste perfil..."
                                  className="resize-none"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-profile-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor</FormLabel>
                              <FormControl>
                                <Input type="color" {...field} data-testid="input-profile-color" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
                            data-testid="button-save-profile"
                          >
                            {editingProfile ? "Atualizar" : "Criar"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsCreatingProfile(false);
                              setEditingProfile(null);
                              profileForm.reset();
                            }}
                            data-testid="button-cancel-profile"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                ) : selectedProfile ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedProfile.color }}
                      />
                      <span className="font-medium">{selectedProfile.name}</span>
                    </div>
                    
                    {/* Interface Responsiva para Permissões */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna Esquerda - Permissões Ativas */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-base text-green-600">Permissões Ativas</h4>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-sm px-3 py-1">
                            {profilePermissions.length}
                          </Badge>
                        </div>
                        <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50/50">
                          {profilePermissionsLoading ? (
                            <div className="text-sm text-muted-foreground">Carregando...</div>
                          ) : profilePermissions.length > 0 ? (
                            profilePermissions.map((pp) => {
                              const permission = permissions.find(p => p.id === pp.permissionId);
                              if (!permission) return null;
                              return (
                                <div key={permission.id} className="flex items-start justify-between p-3 hover:bg-white/80 rounded-lg border border-green-200 bg-green-50/30 mb-2">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-green-700 break-words">{permission.name}</p>
                                      {permission.description && (
                                        <p className="text-xs text-muted-foreground mt-1 break-words">{permission.description}</p>
                                      )}
                                      <p className="text-xs text-green-600 mt-1">tasks</p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePermission(permission.id)}
                                    data-testid={`button-remove-permission-${permission.id}`}
                                    className="ml-2 flex-shrink-0"
                                    title="Remover permissão"
                                  >
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-center text-muted-foreground py-4">Nenhuma permissão ativa</p>
                          )}
                        </div>
                      </div>

                      {/* Coluna Direita - Disponíveis para Adicionar */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-base text-blue-600">Disponíveis para Adicionar</h4>
                          <div className="flex items-center">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                              {permissions.filter(p => !profilePermissions.some(pp => pp.permissionId === p.id)).length}
                            </Badge>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50/50">
                          {profilePermissionsLoading ? (
                            <div className="text-sm text-muted-foreground">Carregando...</div>
                          ) : (
                            permissions
                              .filter(p => !profilePermissions.some(pp => pp.permissionId === p.id))
                              .map((permission) => (
                                <div key={permission.id} className="flex items-start justify-between p-3 hover:bg-white/80 rounded-lg border border-blue-200 bg-blue-50/30 mb-2">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <XCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-blue-700 break-words">{permission.name}</p>
                                      {permission.description && (
                                        <p className="text-xs text-muted-foreground mt-1 break-words">{permission.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePermission(permission.id)}
                                    data-testid={`button-add-permission-${permission.id}`}
                                    className="ml-2 flex-shrink-0"
                                    title="Adicionar permissão"
                                  >
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  </Button>
                                </div>
                              ))
                          )}
                          {permissions.filter(p => !profilePermissions.some(pp => pp.permissionId === p.id)).length === 0 && !profilePermissionsLoading && (
                            <p className="text-center text-muted-foreground py-4">Todas as permissões já estão ativas</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    Selecione um perfil para ver suas permissões
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Permissões do Sistema</h3>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-4">
                {permissionsLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando permissões...</div>
                ) : (
                  Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {categoryLabels[category] || category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((permission) => (
                          <div
                            key={permission.id}
                            className="p-3 rounded-lg border"
                            data-testid={`card-permission-${permission.id}`}
                          >
                            <div className="font-medium text-sm">{permission.name}</div>
                            {permission.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {permission.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}