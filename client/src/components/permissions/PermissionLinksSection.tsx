import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Link,
  Search,
  User,
  Users,
  Shield,
  Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User, Team, Profile, UserTeam, TeamProfile } from "@shared/schema";

export function PermissionLinksSection() {
  const [linkType, setLinkType] = useState<"user" | "team">("user");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar dados
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: profiles = [] } = useQuery<Profile[]>({ queryKey: ["/api/profiles"] });
  const { data: userTeams = [] } = useQuery<UserTeam[]>({ queryKey: ["/api/user-teams"] });
  const { data: teamProfiles = [] } = useQuery<TeamProfile[]>({ queryKey: ["/api/team-profiles"] });

  // Mutations para vínculos usuário-perfil (através de user.profileId)
  const linkUserToProfileMutation = useMutation({
    mutationFn: async ({ userId, profileId }: { userId: string; profileId: string }) => {
      return apiRequest(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ profileId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Perfil vinculado ao usuário com sucesso"
      });
    }
  });

  const unlinkUserFromProfileMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ profileId: null })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Vínculo removido com sucesso"
      });
    }
  });

  // Mutations para vínculos time-perfil
  const linkTeamToProfileMutation = useMutation({
    mutationFn: async ({ teamId, profileId }: { teamId: string; profileId: string }) => {
      return apiRequest("/api/team-profiles", {
        method: "POST",
        body: JSON.stringify({ teamId, profileId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-profiles"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Perfil vinculado ao time com sucesso"
      });
    }
  });

  const unlinkTeamFromProfileMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return apiRequest(`/api/team-profiles/${linkId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-profiles"] });
      toast({
        title: "Sucesso",
        description: "Vínculo removido com sucesso"
      });
    }
  });

  // Handlers
  const resetForm = () => {
    setSelectedUserId("");
    setSelectedTeamId("");
    setSelectedProfileId("");
  };

  const handleCreateLink = () => {
    if (linkType === "user" && selectedUserId && selectedProfileId) {
      linkUserToProfileMutation.mutate({ userId: selectedUserId, profileId: selectedProfileId });
    } else if (linkType === "team" && selectedTeamId && selectedProfileId) {
      linkTeamToProfileMutation.mutate({ teamId: selectedTeamId, profileId: selectedProfileId });
    }
  };

  const handleUnlinkUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (window.confirm(`Tem certeza que deseja remover o perfil do usuário "${user?.name}"?`)) {
      unlinkUserFromProfileMutation.mutate(userId);
    }
  };

  const handleUnlinkTeam = (linkId: string, teamName: string) => {
    if (window.confirm(`Tem certeza que deseja remover o perfil do time "${teamName}"?`)) {
      unlinkTeamFromProfileMutation.mutate(linkId);
    }
  };

  // Utilitários
  const getUsersWithProfiles = () => {
    return users.filter(user => user.profileId).map(user => ({
      ...user,
      profile: profiles.find(p => p.id === user.profileId)
    }));
  };

  const getTeamsWithProfiles = () => {
    return teamProfiles.map(tp => ({
      ...tp,
      team: teams.find(t => t.id === tp.teamId),
      profile: profiles.find(p => p.id === tp.profileId)
    })).filter(item => item.team && item.profile);
  };

  const getAvailableUsers = () => {
    return users.filter(user => !user.profileId);
  };

  const getAvailableTeams = () => {
    const linkedTeamIds = teamProfiles.map(tp => tp.teamId);
    return teams.filter(team => !linkedTeamIds.includes(team.id));
  };

  // Filtros
  const usersWithProfiles = getUsersWithProfiles();
  const teamsWithProfiles = getTeamsWithProfiles();
  
  const filteredUserLinks = usersWithProfiles.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.profile?.name && user.profile.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === "all" || filterType === "user";
    return matchesSearch && matchesFilter;
  });

  const filteredTeamLinks = teamsWithProfiles.filter(item => {
    const matchesSearch = item.team?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.profile?.name && item.profile.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === "all" || filterType === "team";
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Vínculos de Permissões</h2>
          <p className="text-muted-foreground">
            Total: {usersWithProfiles.length + teamsWithProfiles.length} vínculos ativos
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-link">
              <Plus className="w-4 h-4 mr-2" />
              Novo Vínculo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Vínculo de Permissão</DialogTitle>
              <DialogDescription>
                Vincule um perfil a um usuário ou time
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="link-type">Tipo de Vínculo</Label>
                <Select value={linkType} onValueChange={(value: "user" | "team") => setLinkType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário → Perfil</SelectItem>
                    <SelectItem value="team">Time → Perfil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {linkType === "user" && (
                <div>
                  <Label htmlFor="user-select">Usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableUsers().map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getAvailableUsers().length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Todos os usuários já possuem perfis vinculados
                    </p>
                  )}
                </div>
              )}

              {linkType === "team" && (
                <div>
                  <Label htmlFor="team-select">Time</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um time" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTeams().map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getAvailableTeams().length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Todos os times já possuem perfis vinculados
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="profile-select">Perfil</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={handleCreateLink}
                disabled={
                  !selectedProfileId || 
                  (linkType === "user" && !selectedUserId) ||
                  (linkType === "team" && !selectedTeamId) ||
                  linkUserToProfileMutation.isPending ||
                  linkTeamToProfileMutation.isPending
                }
              >
                {(linkUserToProfileMutation.isPending || linkTeamToProfileMutation.isPending) 
                  ? "Criando..." 
                  : "Criar Vínculo"
                }
              </Button>
            </DialogFooter>
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
                  placeholder="Buscar por nome, email ou perfil..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="filter-type">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="team">Times</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vínculos de Usuários */}
      {(filterType === "all" || filterType === "user") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Vínculos Usuário → Perfil</span>
              <Badge variant="secondary">{filteredUserLinks.length}</Badge>
            </CardTitle>
            <CardDescription>
              Usuários que possuem perfis vinculados diretamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredUserLinks.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link className="w-4 h-4 text-muted-foreground" />
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: user.profile?.color }}
                        className="text-sm"
                      >
                        {user.profile?.name}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkUser(user.id)}
                    data-testid={`button-unlink-user-${user.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {filteredUserLinks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário com perfil vinculado encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vínculos de Times */}
      {(filterType === "all" || filterType === "team") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Vínculos Time → Perfil</span>
              <Badge variant="secondary">{filteredTeamLinks.length}</Badge>
            </CardTitle>
            <CardDescription>
              Times que possuem perfis vinculados (aplicados a todos os membros)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTeamLinks.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: item.team?.color + "20" }}
                    >
                      <Users className="w-4 h-4" style={{ color: item.team?.color }} />
                    </div>
                    <div>
                      <p className="font-medium">{item.team?.name}</p>
                      <p className="text-sm text-muted-foreground">{item.team?.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link className="w-4 h-4 text-muted-foreground" />
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: item.profile?.color }}
                        className="text-sm"
                      >
                        {item.profile?.name}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkTeam(item.id, item.team?.name || "")}
                    data-testid={`button-unlink-team-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {filteredTeamLinks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum time com perfil vinculado encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo dos Vínculos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Resumo dos Vínculos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{usersWithProfiles.length}</div>
              <div className="text-sm text-muted-foreground">Usuários com Perfil</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{teamsWithProfiles.length}</div>
              <div className="text-sm text-muted-foreground">Times com Perfil</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{profiles.length}</div>
              <div className="text-sm text-muted-foreground">Perfis Disponíveis</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}