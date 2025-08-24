import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Componente que demonstra as melhorias de segurança implementadas
 */
export function SecurityEnhancedComponent() {
  const { 
    currentUser, 
    userPermissions, 
    hasPermission, 
    isAdmin, 
    checkPermissionWithLog,
    isLoading 
  } = usePermissions();
  
  const { toast } = useToast();

  const handleSecureAction = (action: string, requiredPermission: string) => {
    const hasAccess = checkPermissionWithLog(requiredPermission, `SecurityDemo:${action}`);
    
    if (hasAccess) {
      toast({
        title: "✅ Acesso Autorizado",
        description: `Você tem permissão para: ${action}`,
      });
    } else {
      toast({
        title: "🚫 Acesso Negado",
        description: `Você não tem permissão para: ${action}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Shield className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando informações de segurança...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Status do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            <span>Status de Segurança</span>
            {isAdmin() && (
              <Badge variant="destructive" className="ml-auto">
                <Shield className="w-3 h-3 mr-1" />
                ADMIN
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Informações de autenticação e permissões do usuário atual
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <UserCheck className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-semibold">{currentUser?.name || "Anônimo"}</div>
            <div className="text-xs text-muted-foreground">Usuário Ativo</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Shield className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-semibold">{userPermissions.length}</div>
            <div className="text-xs text-muted-foreground">Permissões Ativas</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Lock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-lg font-semibold">{currentUser?.role || "N/A"}</div>
            <div className="text-xs text-muted-foreground">Função</div>
          </div>
        </CardContent>
      </Card>

      {/* Demonstração de Controles de Permissão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Teste de Permissões</span>
          </CardTitle>
          <CardDescription>
            Teste diferentes ações para ver como o sistema valida permissões
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Botões de teste - sempre visíveis para demonstrar a validação */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSecureAction("Criar Tarefas", "Criar Tasks")}
              className="flex items-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>Criar Tarefa</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSecureAction("Editar Usuários", "Editar Users")}
              className="flex items-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Editar Usuário</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSecureAction("Ver Analytics", "Visualizar Analytics")}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Analytics</span>
            </Button>
          </div>

          {/* Componentes que só aparecem com permissão */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Elementos Condicionais (só aparecem com permissão):</h4>
            
            <PermissionGuard 
              permission="Gerenciar Times"
              fallback={
                <div className="p-3 border border-dashed border-gray-300 rounded-lg text-center">
                  <Lock className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-muted-foreground">Gerenciar Times: Acesso Negado</p>
                </div>
              }
            >
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Painel de Gerenciamento de Times
                  </p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  Você tem acesso a esta funcionalidade!
                </p>
              </div>
            </PermissionGuard>

            <PermissionGuard 
              permission="Gerenciar Perfis"
              fallback={
                <div className="p-3 border border-dashed border-gray-300 rounded-lg text-center">
                  <Lock className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-muted-foreground">Gerenciar Perfis: Acesso Negado</p>
                </div>
              }
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Configurações de Perfis
                  </p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Acesso autorizado ao sistema de perfis!
                </p>
              </div>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Permissões do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <span>Suas Permissões</span>
          </CardTitle>
          <CardDescription>
            Lista completa das permissões ativas para seu usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userPermissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {userPermissions.map((permission) => (
                <Badge 
                  key={permission.id} 
                  variant="secondary" 
                  className="justify-start p-2 text-xs"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {permission.name}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-muted-foreground">
                Nenhuma permissão encontrada para este usuário
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}