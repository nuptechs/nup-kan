import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Users2, Trash2, Edit3, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTeamSchema, type Team, type InsertTeam, type User, type UpdateUser } from "@shared/schema";

const colors = [
  { value: "#3b82f6", label: "Azul", color: "#3b82f6" },
  { value: "#8b5cf6", label: "Roxo", color: "#8b5cf6" },
  { value: "#10b981", label: "Verde", color: "#10b981" },
  { value: "#f59e0b", label: "Laranja", color: "#f59e0b" },
  { value: "#ef4444", label: "Vermelho", color: "#ef4444" },
  { value: "#06b6d4", label: "Ciano", color: "#06b6d4" },
  { value: "#84cc16", label: "Verde Claro", color: "#84cc16" },
  { value: "#f97316", label: "Laranja Escuro", color: "#f97316" },
];

export function TeamManagementDialog() {
  const [open, setOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<InsertTeam>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: InsertTeam) => {
      const response = await apiRequest("POST", "/api/teams", teamData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      form.reset();
      setEditingTeam(null);
      toast({
        title: "Time criado",
        description: "O time foi criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o time.",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertTeam }) => {
      const response = await apiRequest("PATCH", `/api/teams/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      form.reset();
      setEditingTeam(null);
      toast({
        title: "Time atualizado",
        description: "O time foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o time.",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/teams/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Time excluído",
        description: "O time foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o time.",
        variant: "destructive",
      });
    },
  });

  const assignUserToTeamMutation = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string | null }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, { teamId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário atribuído",
        description: "O usuário foi atribuído ao time com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o usuário ao time.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTeam) => {
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const startEdit = (team: Team) => {
    setEditingTeam(team);
    form.setValue("name", team.name);
    form.setValue("description", team.description || "");
    form.setValue("color", team.color);
  };

  const cancelEdit = () => {
    setEditingTeam(null);
    form.reset();
  };

  const getTeamMembers = (teamId: string) => {
    return users.filter(user => user.teamId === teamId);
  };

  const getUnassignedUsers = () => {
    return users.filter(user => !user.teamId);
  };

  const selectedTeam = selectedTeamId ? teams.find(t => t.id === selectedTeamId) : null;
  const selectedTeamMembers = selectedTeam ? getTeamMembers(selectedTeam.id) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          data-testid="button-manage-teams"
        >
          <Users2 className="w-4 h-4 mr-2" />
          Gerenciar Times
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-team-management">
        <DialogHeader>
          <DialogTitle>Gerenciar Times</DialogTitle>
          <DialogDescription>
            Crie, edite e organize times para melhor colaboração em seus projetos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teams">Times</TabsTrigger>
            <TabsTrigger value="assign">Atribuir Membros</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-6">
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
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(team)}
                              data-testid={`button-edit-team-${team.id}`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTeamMutation.mutate(team.id)}
                              data-testid={`button-delete-team-${team.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center space-x-2">
                          <Users2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {getTeamMembers(team.id).length} membros
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {editingTeam ? "Editar Time" : "Criar Novo Time"}
                </h3>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Time</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome do time..."
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
                              placeholder="Descrição do time..."
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
          </TabsContent>

          <TabsContent value="assign" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Seleção de Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selecionar Time</h3>
                <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
                  <SelectTrigger data-testid="select-team">
                    <SelectValue placeholder="Selecione um time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: team.color }}
                          />
                          <span>{team.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTeam && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: selectedTeam.color }}
                        />
                        <span>{selectedTeam.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Membros atuais:</span>
                          <Badge variant="outline">{selectedTeamMembers.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {selectedTeamMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{member.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => assignUserToTeamMutation.mutate({ userId: member.id, teamId: null })}
                                data-testid={`button-remove-member-${member.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Usuários Não Atribuídos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Usuários Disponíveis</h3>
                  <Badge variant="outline">{getUnassignedUsers().length} disponíveis</Badge>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getUnassignedUsers().map((user) => (
                    <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>{user.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!selectedTeamId || assignUserToTeamMutation.isPending}
                            onClick={() => 
                              selectedTeamId && 
                              assignUserToTeamMutation.mutate({ userId: user.id, teamId: selectedTeamId })
                            }
                            data-testid={`button-assign-user-${user.id}`}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}