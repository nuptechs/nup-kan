import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  Search,
  UserPlus,
  UserMinus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Team, User, UserTeam, InsertTeam, UpdateTeam } from "@shared/schema";
import { insertTeamSchema, updateTeamSchema } from "@shared/schema";

export function TeamsSection() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingTeamId, setManagingTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar dados
  const { data: teams = [], isLoading } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: userTeams = [] } = useQuery<UserTeam[]>({ queryKey: ["/api/user-teams"] });

  // Forms
  const createForm = useForm<InsertTeam>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6"
    }
  });

  const editForm = useForm<UpdateTeam>({
    resolver: zodResolver(updateTeamSchema)
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: async (data: InsertTeam) => {
      return apiRequest("/api/teams", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Sucesso",
        description: "Time criado com sucesso"
      });
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateTeam & { id: string }) => {
      return apiRequest(`/api/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingTeam(null);
      editForm.reset();
      toast({
        title: "Sucesso",
        description: "Time atualizado com sucesso"
      });
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/teams/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Sucesso",
        description: "Time excluído com sucesso"
      });
    }
  });

  const addUserToTeamMutation = useMutation({
    mutationFn: async ({ userId, teamId, role = "member" }: { userId: string; teamId: string; role?: string }) => {
      return apiRequest(`/api/users/${userId}/teams/${teamId}`, {
        method: "POST",
        body: JSON.stringify({ role })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-teams"] });
      toast({
        title: "Sucesso",
        description: "Usuário adicionado ao time"
      });
    }
  });

  const removeUserFromTeamMutation = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      return apiRequest(`/api/users/${userId}/teams/${teamId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-teams"] });
      toast({
        title: "Sucesso",
        description: "Usuário removido do time"
      });
    }
  });

  // Handlers
  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    editForm.reset({
      name: team.name,
      description: team.description || "",
      color: team.color
    });
  };

  const handleDelete = (team: Team) => {
    const teamMembers = getTeamMembers(team.id);
    const warningMessage = teamMembers.length > 0 
      ? `O time "${team.name}" possui ${teamMembers.length} membro(s). Tem certeza que deseja excluí-lo?`
      : `Tem certeza que deseja excluir o time "${team.name}"?`;
      
    if (window.confirm(warningMessage)) {
      deleteTeamMutation.mutate(team.id);
    }
  };

  const onCreateSubmit = (data: InsertTeam) => {
    createTeamMutation.mutate(data);
  };

  const onEditSubmit = (data: UpdateTeam) => {
    if (editingTeam) {
      updateTeamMutation.mutate({ ...data, id: editingTeam.id });
    }
  };

  // Utilitários
  const getTeamMembers = (teamId: string) => {
    const teamUserIds = userTeams
      .filter(ut => ut.teamId === teamId)
      .map(ut => ut.userId);
    return users.filter(user => teamUserIds.includes(user.id));
  };

  const getUnassignedUsers = (teamId: string) => {
    const teamUserIds = userTeams
      .filter(ut => ut.teamId === teamId)
      .map(ut => ut.userId);
    return users.filter(user => !teamUserIds.includes(user.id));
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div>Carregando times...</div>;
  }

  const managingTeam = managingTeamId ? teams.find(t => t.id === managingTeamId) : null;
  const managingTeamMembers = managingTeamId ? getTeamMembers(managingTeamId) : [];
  const availableUsers = managingTeamId ? getUnassignedUsers(managingTeamId) : [];

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Times</h2>
          <p className="text-muted-foreground">
            Total: {teams.length} times
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-team">
              <Plus className="w-4 h-4 mr-2" />
              Novo Time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Time</DialogTitle>
              <DialogDescription>
                Crie um agrupamento de usuários
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Time</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Desenvolvimento, Design, Marketing" {...field} />
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
                          placeholder="Descreva o propósito deste time..."
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
                      <FormLabel>Cor do Time</FormLabel>
                      <FormControl>
                        <Input type="color" className="h-10 w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createTeamMutation.isPending}>
                    {createTeamMutation.isPending ? "Criando..." : "Criar Time"}
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

      {/* Lista de Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((team) => {
          const members = getTeamMembers(team.id);
          return (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {members.length} membro(s)
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManagingTeamId(team.id)}
                      data-testid={`button-manage-team-${team.id}`}
                    >
                      <Users className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(team)}
                      data-testid={`button-edit-team-${team.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(team)}
                      data-testid={`button-delete-team-${team.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team.description && (
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  )}
                  
                  {members.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Membros</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {members.slice(0, 3).map((member) => (
                          <Badge key={member.id} variant="secondary" className="text-xs">
                            {member.name}
                          </Badge>
                        ))}
                        {members.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{members.length - 3}
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
      <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Time</DialogTitle>
            <DialogDescription>
              Altere as informações do time
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Time</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Desenvolvimento, Design, Marketing" {...field} />
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
                        placeholder="Descreva o propósito deste time..."
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
                    <FormLabel>Cor do Time</FormLabel>
                    <FormControl>
                      <Input type="color" className="h-10 w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={updateTeamMutation.isPending}>
                  {updateTeamMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerenciamento de Membros */}
      <Dialog open={!!managingTeamId} onOpenChange={() => setManagingTeamId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros: {managingTeam?.name}</DialogTitle>
            <DialogDescription>
              Adicione ou remova usuários deste time
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Membros Atuais */}
            <div>
              <h4 className="font-medium mb-3">Membros Atuais ({managingTeamMembers.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {managingTeamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUserFromTeamMutation.mutate({ 
                        userId: member.id, 
                        teamId: managingTeamId! 
                      })}
                      disabled={removeUserFromTeamMutation.isPending}
                    >
                      <UserMinus className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
                {managingTeamMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro neste time
                  </p>
                )}
              </div>
            </div>
            
            {/* Usuários Disponíveis */}
            <div>
              <h4 className="font-medium mb-3">Usuários Disponíveis ({availableUsers.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addUserToTeamMutation.mutate({ 
                        userId: user.id, 
                        teamId: managingTeamId! 
                      })}
                      disabled={addUserToTeamMutation.isPending}
                    >
                      <UserPlus className="w-3 h-3 text-green-500" />
                    </Button>
                  </div>
                ))}
                {availableUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todos os usuários já estão no time
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}