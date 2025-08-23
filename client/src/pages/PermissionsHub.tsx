import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Users2, 
  Shield, 
  Settings, 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Link,
  BarChart3
} from "lucide-react";
import type { User, Team, Profile, Permission } from "@shared/schema";

export default function PermissionsHub() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Dados para estatísticas
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: profiles = [] } = useQuery<Profile[]>({ queryKey: ["/api/profiles"] });
  const { data: permissions = [] } = useQuery<Permission[]>({ queryKey: ["/api/permissions"] });

  // Se uma seção específica está ativa, mostrar placeholder
  if (activeSection) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveSection(null)}
            data-testid="button-back-to-hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {activeSection === 'users' && 'Usuários'}
              {activeSection === 'teams' && 'Times'}
              {activeSection === 'profiles' && 'Perfis'} 
              {activeSection === 'permissions' && 'Vínculos de Permissões'}
            </h1>
            <p className="text-muted-foreground">
              {activeSection === 'users' && 'Gerencie usuários do sistema'}
              {activeSection === 'teams' && 'Gerencie agrupamentos de usuários'}
              {activeSection === 'profiles' && 'Gerencie agrupamentos de funcionalidades'}
              {activeSection === 'permissions' && 'Vincule perfis a usuários e times'}
            </p>
          </div>
        </div>

        <Card className="p-8 text-center">
          <CardContent>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Seção em Desenvolvimento</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Esta seção está sendo implementada. Em breve você terá acesso completo ao CRUD de {activeSection}.
              </p>
              <Button 
                onClick={() => setActiveSection(null)}
                className="mt-4"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard principal
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Permissões Moderno</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, times, perfis e permissões de forma moderna e intuitiva
          </p>
        </div>
      </div>

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Usuários</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Users2 className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Times</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Shield className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-xs text-muted-foreground">Perfis</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Settings className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{permissions.length}</p>
              <p className="text-xs text-muted-foreground">Funcionalidades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Principais de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Usuários */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-500" />
              <span>1. Usuários</span>
              <Badge variant="secondary" className="ml-auto">{users.length}</Badge>
            </CardTitle>
            <CardDescription>
              Gerencie os usuários do sistema: criar, editar, excluir e consultar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Controle completo sobre contas de usuário, perfis individuais e informações básicas.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setActiveSection('users')}
                  className="flex-1"
                  data-testid="button-manage-users"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Gerenciar Usuários
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Times */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users2 className="w-6 h-6 text-green-500" />
              <span>2. Times</span>
              <Badge variant="secondary" className="ml-auto">{teams.length}</Badge>
            </CardTitle>
            <CardDescription>
              Gerencie agrupamentos de usuários: criar, editar, excluir e consultar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Organize usuários em times para facilitar o gerenciamento de permissões em grupo.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setActiveSection('teams')}
                  className="flex-1"
                  data-testid="button-manage-teams"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Gerenciar Times
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Perfis */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-purple-500" />
              <span>3. Perfis</span>
              <Badge variant="secondary" className="ml-auto">{profiles.length}</Badge>
            </CardTitle>
            <CardDescription>
              Gerencie agrupamentos de funcionalidades: criar, editar, excluir e consultar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Defina conjuntos de funcionalidades que podem ser atribuídos a usuários ou times.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setActiveSection('profiles')}
                  className="flex-1"
                  data-testid="button-manage-profiles"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Gerenciar Perfis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vínculos de Permissões */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="w-6 h-6 text-orange-500" />
              <span>4. Vínculos de Permissões</span>
              <Badge variant="secondary" className="ml-auto">Ativo</Badge>
            </CardTitle>
            <CardDescription>
              Vincule perfis a usuários e times: criar, editar, excluir e consultar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Estabeleça conexões entre perfis e usuários/times para controlar o acesso às funcionalidades.
              </p>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setActiveSection('permissions')}
                  className="flex-1"
                  data-testid="button-manage-permission-links"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Gerenciar Vínculos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Fluxo */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Nova Hierarquia de Permissões</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-medium">1. Usuários</p>
              <p className="text-sm text-muted-foreground">Crie e gerencie contas de usuário</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-medium">2. Times</p>
              <p className="text-sm text-muted-foreground">Agrupe usuários em times</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <p className="font-medium">3. Perfis</p>
              <p className="text-sm text-muted-foreground">Defina conjuntos de funcionalidades</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Link className="w-5 h-5 text-orange-600" />
              </div>
              <p className="font-medium">4. Vínculos</p>
              <p className="text-sm text-muted-foreground">Conecte perfis a usuários/times</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">✨ Sistema Redesenhado com Padrões Modernos</h4>
            <p className="text-sm text-blue-700">
              Nova interface intuitiva que segue hierarquia clara: Usuários podem ser agrupados em Times, 
              Perfis definem conjuntos de funcionalidades, e Vínculos conectam tudo de forma organizada.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}