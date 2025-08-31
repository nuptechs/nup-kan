import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SUCCESS_MESSAGES } from "@/constants/successMessages";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { Mail, Key, CheckCircle, AlertCircle, Settings } from "lucide-react";

interface EmailSettingsDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmailSettingsDialog({ children, open: isOpen, onOpenChange }: EmailSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [senderDomain, setSenderDomain] = useState("replit.app");
  const { toast } = useToast();

  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ apiKey: newApiKey, domain }: { apiKey: string; domain: string }) => {
      const response = await apiRequest("POST", "/api/settings/sendgrid-key", { 
        apiKey: newApiKey, 
        senderDomain: domain 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: SUCCESS_MESSAGES.SETTINGS.EMAIL_UPDATED,
      });
      setApiKey("");
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.SETTINGS.EMAIL_UPDATE_FAILED,
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/settings/test-email", { email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: SUCCESS_MESSAGES.SETTINGS.EMAIL_TEST_SENT,
        description: "Verifique sua caixa de entrada para confirmar que o email foi recebido.",
      });
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.SETTINGS.EMAIL_TEST_FAILED,
        description: "Falha ao enviar email de teste. Verifique a configuração.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: ERROR_MESSAGES.SETTINGS.FIELD_REQUIRED,
        description: "Por favor, insira a chave API do SendGrid.",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.startsWith('SG.')) {
      toast({
        title: ERROR_MESSAGES.SETTINGS.INVALID_FORMAT,
        description: "A chave API do SendGrid deve começar com 'SG.'",
        variant: "destructive",
      });
      return;
    }

    updateApiKeyMutation.mutate({ apiKey, domain: senderDomain });
  };

  const handleTestEmail = () => {
    if (!testEmail.trim()) {
      toast({
        title: ERROR_MESSAGES.SETTINGS.FIELD_REQUIRED,
        description: "Por favor, insira um email para teste.",
        variant: "destructive",
      });
      return;
    }

    testEmailMutation.mutate(testEmail);
  };

  return (
    <Dialog open={isOpen || internalOpen} onOpenChange={onOpenChange || setInternalOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" data-testid="email-settings-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Configurações de Email
          </DialogTitle>
          <DialogDescription>
            Configure o SendGrid para envio de emails automáticos do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status atual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Status do Sistema
              </CardTitle>
              <CardDescription>
                Informações sobre a configuração atual do SendGrid
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">SendGrid API:</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Configuração Necessária
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Emails Automáticos:</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Ativados
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Configurar API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-4 h-4" />
                Atualizar Chave API
              </CardTitle>
              <CardDescription>
                Insira sua chave API do SendGrid para ativar o envio de emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Chave API do SendGrid</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-sendgrid-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  A chave API deve começar com "SG." e ter permissões de envio de email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderDomain">Domínio de Remetente</Label>
                <Input
                  id="senderDomain"
                  type="text"
                  placeholder="exemplo: replit.app ou seudominio.com"
                  value={senderDomain}
                  onChange={(e) => setSenderDomain(e.target.value)}
                  data-testid="input-sender-domain"
                />
                <p className="text-xs text-muted-foreground">
                  O domínio deve estar verificado no SendGrid. Use "replit.app" para testes ou seu domínio próprio.
                </p>
              </div>

              <Button
                onClick={handleUpdateApiKey}
                disabled={updateApiKeyMutation.isPending}
                className="w-full"
                data-testid="button-update-api-key"
              >
                {updateApiKeyMutation.isPending ? "Atualizando..." : "Atualizar Chave API"}
              </Button>
            </CardContent>
          </Card>

          {/* Teste de Email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testar Configuração</CardTitle>
              <CardDescription>
                Envie um email de teste para verificar se tudo está funcionando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Email para Teste</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="input-test-email"
                />
              </div>

              <Button
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                variant="outline"
                className="w-full"
                data-testid="button-test-email"
              >
                {testEmailMutation.isPending ? "Enviando..." : "Enviar Email de Teste"}
              </Button>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como obter sua chave API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Acesse <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">sendgrid.com</a></li>
                <li>Crie uma conta gratuita (até 100 emails/dia)</li>
                <li>Vá em Settings → API Keys</li>
                <li>Clique em "Create API Key"</li>
                <li>Selecione "Restricted Access" e ative apenas "Mail Send"</li>
                <li>Copie a chave que começa com "SG."</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}