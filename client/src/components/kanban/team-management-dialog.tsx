import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users2, Edit, Trash2, Plus, Minus, UserMinus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Team, User } from "@shared/schema";

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserTeam {
  id: string;
  userId: string;
  teamId: string;
  role: string;
}

const colors = [
  { value: "#dc2626", label: "Vermelho", color: "#dc2626" },
  { value: "#ea580c", label: "Laranja", color: "#ea580c" },
  { value: "#ca8a04", label: "Amarelo", color: "#ca8a04" },
  { value: "#16a34a", label: "Verde", color: "#16a34a" },
  { value: "#2563eb", label: "Azul", color: "#2563eb" },
  { value: "#9333ea", label: "Roxo", color: "#9333ea" },
  { value: "#c2410c", label: "Marrom", color: "#c2410c" },
  { value: "#475569", label: "Cinza", color: "#475569" },
];

const teamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  color: z.string().min(1, "Cor é obrigatória"),
});

type TeamFormData = z.infer<typeof teamSchema>;

export function TeamManagementDialog({ open, onOpenChange }: TeamManagementDialogProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#2563eb",
    },
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: userTeams = [] } = useQuery<UserTeam[]>({
    queryKey: ["/api/user-teams"],
  });

  // Obter membros do time atual em edição
  const currentTeamMembers = editingTeam 
    ? userTeams
        .filter(ut => ut.teamId === editingTeam.id)
        .map(ut => users.find(u => u.id === ut.userId))
        .filter(Boolean) as User[]
    : [];

  const currentTeamMemberIds = currentTeamMembers.map(u => u.id);

  // Usuários disponíveis 
  // Na criação: todos os usuários
  // Na edição: usuários que não estão no time atual
  const availableUsers = editingTeam 
    ? users.filter(u => !currentTeamMemberIds.includes(u.id))
    : users; // Todos os usuários disponíveis para criar time

  // Reset quando editar um time diferente
  useEffect(() => {
    if (editingTeam) {
      setSelectedUsers([]);
    }
  }, [editingTeam?.id]);

  const addUserToTeamMutation = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      await apiRequest("POST", `/api/users/${userId}/teams/${teamId}`, { role: "member" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-teams"] });
    },
  });

  const removeUserFromTeamMutation = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      await apiRequest("DELETE", `/api/users/${userId}/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-teams"] });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const response = await apiRequest("POST", "/api/teams", data);
      return response.json();
    },
    onSuccess: async (team) => {
      // Adicionar membros selecionados ao time
      for (const userId of selectedUsers) {
        await addUserToTeamMutation.mutateAsync({ userId, teamId: team.id });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Sucesso",
        description: `Time criado com ${selectedUsers.length} membros!`,
      });
      form.reset();
      setSelectedUsers([]);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar time. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/teams/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Sucesso",
        description: "Time atualizado com sucesso!",
      });
      setEditingTeam(null);
      form.reset();
      setSelectedUsers([]);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar time. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await apiRequest("DELETE", `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Sucesso",
        description: "Time excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir time. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TeamFormData) => {
    if (editingTeam) {
      updateTeamMutation.mutate({ ...data, id: editingTeam.id });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setSelectedUsers([]);
    form.reset({
      name: team.name,
      description: team.description || "",
      color: team.color,
    });
  };

  const cancelEdit = () => {
    setEditingTeam(null);
    setSelectedUsers([]);
    form.reset();
  };

  const handleDelete = (teamId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este time?")) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const addMemberToTeam = async (userId: string) => {
    if (editingTeam) {
      await addUserToTeamMutation.mutateAsync({ userId, teamId: editingTeam.id });
    }
  };

  const removeMemberFromTeam = async (userId: string) => {
    if (editingTeam) {
      await removeUserFromTeamMutation.mutateAsync({ userId, teamId: editingTeam.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto" data-testid="dialog-team-management">
        <DialogHeader>
          <DialogTitle>Gerenciar Times</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gerencie times e membros.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Times */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Times Existentes</h3>
              <Badge variant="outline">{teams.length} times</Badge>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teams.map((team) => (
                <Card key={team.id} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`team-card-${team.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: team.color }}
                        />
                        <div>
                          <CardTitle className="text-sm">{team.name}</CardTitle>
                          {team.description && (
                            <p className="text-xs text-muted-foreground">{team.description}</p>
                          )}
                          <p className="text-xs text-blue-600">
                            {userTeams.filter(ut => ut.teamId === team.id).length} membros
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(team)}
                          data-testid={`button-edit-team-${team.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(team.id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`button-delete-team-${team.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
              {teams.length === 0 && (
                <div className="text-center py-8">
                  <Users2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum time criado ainda</p>
                </div>
              )}
            </div>
          </div>

          {/* Formulário de Criação/Edição */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {editingTeam ? "Editar Time" : "Criar Novo Time"}
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Time</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome"
                          {...field}
                          data-testid="input-team-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição (opcional)"
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-team-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Time</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 gap-2">
                          {colors.map((colorOption) => (
                            <Button
                              key={colorOption.value}
                              type="button"
                              variant={field.value === colorOption.value ? "default" : "outline"}
                              size="sm"
                              className="flex items-center space-x-2"
                              onClick={() => field.onChange(colorOption.value)}
                              data-testid={`button-color-${colorOption.value}`}
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: colorOption.color }}
                              />
                              <span className="text-xs">{colorOption.label}</span>
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                    data-testid="button-save-team"
                  >
                    {editingTeam ? "Atualizar" : "Criar"} Time
                  </Button>
                  {editingTeam && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Interface de Seleção de Membros - Duas Colunas */}
        <div className="border-t pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingTeam ? "Gerenciar Membros" : "Selecionar Membros"}
            </h3>
            {!editingTeam && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedUsers.length === availableUsers.length) {
                    setSelectedUsers([]);
                  } else {
                    setSelectedUsers(availableUsers.map(u => u.id));
                  }
                }}
              >
                {selectedUsers.length === availableUsers.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Coluna Esquerda - Membros Atuais ou Selecionados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-green-600 font-semibold">
                  {editingTeam ? "Membros Atuais" : "Membros Selecionados"}
                </Label>
                <Badge variant="secondary">
                  {editingTeam ? currentTeamMembers.length : selectedUsers.length}
                </Badge>
              </div>
              <div className="border rounded-md p-3 max-h-64 overflow-y-auto">
                {editingTeam ? (
                  currentTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-sm">{member.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-green-700">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMemberFromTeam(member.id)}
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                ) : (
                  users.filter(u => selectedUsers.includes(u.id)).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-sm">{user.avatar}</AvatarFallback>
                        </Avatar>
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
                        data-testid={`button-deselect-user-${user.id}`}
                      >
                        <Minus className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
                {((editingTeam && currentTeamMembers.length === 0) || (!editingTeam && selectedUsers.length === 0)) && (
                  <p className="text-center text-muted-foreground py-4">
                    {editingTeam ? "Nenhum membro no time" : "Nenhum membro selecionado"}
                  </p>
                )}
              </div>
            </div>

            {/* Coluna Direita - Usuários Disponíveis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-blue-600 font-semibold">Usuários Disponíveis</Label>
                <Badge variant="secondary">{availableUsers.length}</Badge>
              </div>
              <div className="border rounded-md p-3 max-h-64 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <div className="flex items-center space-x-3 flex-1">
                      {!editingTeam && (
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                      )}
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-sm">{user.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-blue-700">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    {editingTeam && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addMemberToTeam(user.id)}
                        data-testid={`button-add-member-${user.id}`}
                      >
                        <UserPlus className="w-4 h-4 text-blue-500" />
                      </Button>
                    )}
                  </div>
                ))}
                {availableUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Todos os usuários já estão no time
                  </p>
                )}
              </div>
            </div>
          </div>

          {!editingTeam && selectedUsers.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              {selectedUsers.length} usuário{selectedUsers.length > 1 ? 's' : ''} selecionado{selectedUsers.length > 1 ? 's' : ''} para o novo time
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}