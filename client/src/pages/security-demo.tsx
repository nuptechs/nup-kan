import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecurityEnhancedComponent } from "@/components/security/SecurityEnhancedComponent";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { ArrowLeft, Shield, Lock, CheckCircle, AlertTriangle } from "lucide-react";

export default function SecurityDemoPage() {
  const { currentUser, isAdmin } = usePermissions();

  const securityFeatures = [
    {
      title: "Autenticação de Sessão",
      description: "Validação de usuário logado em todas as rotas protegidas",
      status: "✅ Ativo",
      type: "success" as const,
    },
    {
      title: "Middleware de Permissões",
      description: "Verificação de permissões no backend antes de executar ações",
      status: "✅ Ativo",
      type: "success" as const,
    },
    {
      title: "Validação Frontend",
      description: "Componentes condicionais baseados em permissões do usuário",
      status: "✅ Ativo",
      type: "success" as const,
    },
    {
      title: "Cache Inteligente",
      description: "Cache de permissões com invalidação automática para performance",
      status: "✅ Ativo",
      type: "success" as const,
    },
    {
      title: "Logs de Auditoria",
      description: "Registro automático de tentativas de acesso e ações do sistema",
      status: "✅ Ativo",
      type: "success" as const,
    },
    {
      title: "Atribuição Automática",
      description: "Novas permissões são automaticamente atribuídas ao perfil admin",
      status: "✅ Ativo",
      type: "success" as const,
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              // CONSISTÊNCIA: Usar a mesma lógica robusta
              if (document.referrer && !document.referrer.includes('/security-demo')) {
                window.history.back();
              } else {
                window.location.href = '/dashboard';
              }
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Demonstração de Segurança
            </h1>
            <p className="text-muted-foreground">
              Sistema avançado de permissões e controle de acesso implementado
            </p>
          </div>
        </div>
        {isAdmin() && (
          <Badge variant="destructive" className="text-sm">
            <Shield className="w-4 h-4 mr-1" />
            Administrador
          </Badge>
        )}
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Recursos de Segurança</span>
          </CardTitle>
          <CardDescription>
            Todas as melhorias de segurança estão ativas e funcionando
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {feature.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                    <Badge 
                      variant={feature.type === 'success' ? 'default' : 'secondary'} 
                      className="text-xs mt-2"
                    >
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Security Demo */}
      <SecurityEnhancedComponent />

      {/* Admin Only Section */}
      <PermissionGuard 
        permission="Gerenciar Perfis"
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-600">Acesso Restrito</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Esta seção é visível apenas para usuários com permissões administrativas.
                </p>
              </div>
            </CardContent>
          </Card>
        }
      >
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
              <Shield className="w-5 h-5" />
              <span>Painel Administrativo</span>
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              Funcionalidades disponíveis apenas para administradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-800 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Informações do Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Usuário Admin:</span>
                    <p className="font-medium">{currentUser?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Função:</span>
                    <p className="font-medium">{currentUser?.role}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Você tem acesso total ao sistema de permissões!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Technical Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-gray-600" />
            <span>Implementação Técnica</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Frontend</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Hook usePermissions aprimorado</li>
                <li>• Componente PermissionGuard</li>
                <li>• Cache inteligente com React Query</li>
                <li>• Logs de segurança no console</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Backend</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Middleware de autenticação</li>
                <li>• Validação de permissões nas rotas</li>
                <li>• Sistema de auditoria</li>
                <li>• Atribuição automática de permissões</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}