import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Trash2, Filter, Clock, FileText, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SUCCESS_MESSAGES } from "@/constants/successMessages";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  details?: any;
  // Novos campos para ações do usuário
  actionType?: 'user_action' | 'system' | 'api';
  userId?: string;
  userName?: string;
  action?: string;
  status?: 'success' | 'error' | 'pending';
  errorDetails?: any;
  duration?: number;
}

interface LogsResponse {
  logs: SystemLog[];
  total: number;
  levels: string[];
}

interface SystemLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemLogsDialog({ open, onOpenChange }: SystemLogsDialogProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("user_action");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLogDetail, setSelectedLogDetail] = useState<SystemLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logsData, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ["/api/system/logs", selectedLevel, selectedType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLevel !== "all") {
        params.append("level", selectedLevel);
      }
      if (selectedType !== "all") {
        params.append("type", selectedType);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      params.append("limit", "100");
      
      const response = await fetch(`/api/system/logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    enabled: open, // Só fazer query quando dialog está aberto
    refetchInterval: autoRefresh ? 30000 : false, // Reduzido: 30s em vez de 10s
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/system/logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/logs"] });
      toast({
        title: "Logs limpos",
        description: "Todos os logs do sistema foram removidos.",
      });
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.SYSTEM_LOGS.LOAD_FAILED,
        variant: "destructive",
      });
    },
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionTypeColor = (type?: string) => {
    switch (type) {
      case 'user_action':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'system':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'api':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      case 'debug': return '⚪';
      default: return '⚪';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatMessage = (message: string) => {
    // Remove emojis de debug para apresentação mais limpa
    return message.replace(/[🚀✅❌🔄⚠️🔵🟡🔴⚪]/g, '').trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs do Sistema
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Visualize logs do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controles */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Campo de Busca */}
            <div className="flex items-center gap-2 min-w-[300px]">
              <Search className="w-4 h-4" />
              <Input
                id="logs-search"
                name="logs-search"
                placeholder="Buscar por usuário, ação ou mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Nível:</span>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger id="logs-level-filter" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Avisos</SelectItem>
                  <SelectItem value="error">Erros</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tipo:</span>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="logs-type-filter" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔍 Todos os Tipos</SelectItem>
                  <SelectItem value="user_action">👤 Ações do Usuário</SelectItem>
                  <SelectItem value="system">⚙️ Sistema</SelectItem>
                  <SelectItem value="api">🔗 API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>

            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              onClick={() => clearLogsMutation.mutate()}
              variant="destructive"
              size="sm"
              disabled={clearLogsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Logs
            </Button>

            {logsData && (
              <Badge variant="outline" className="ml-auto">
                {logsData.logs.length} de {logsData.total} logs
              </Badge>
            )}
          </div>

          <Separator />

          {/* Lista de Logs */}
          <ScrollArea className="h-96 w-full rounded-md border">
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                </div>
              ) : logsData?.logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {selectedLevel === "all" ? "Nenhum log encontrado" : `Nenhum log de nível "${selectedLevel}" encontrado`}
                </div>
              ) : (
                logsData?.logs.map((log) => (
                  <Card 
                    key={log.id} 
                    className={`border-l-4 ${
                      log.actionType === 'user_action' ? 'border-l-purple-500' : 
                      log.actionType === 'system' ? 'border-l-blue-500' : 
                      'border-l-gray-500'
                    } ${log.status === 'error' && log.errorDetails ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                    onClick={() => {
                      if (log.status === 'error' && log.errorDetails) {
                        setSelectedLogDetail(log);
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <span className="text-lg">{getLevelEmoji(log.level)}</span>
                          
                          {/* Tipo de Ação */}
                          {log.actionType && (
                            <Badge className={getActionTypeColor(log.actionType)}>
                              {log.actionType === 'user_action' ? 'USUÁRIO' : 
                               log.actionType === 'system' ? 'SISTEMA' : 'API'}
                            </Badge>
                          )}
                          
                          {/* Status da Ação */}
                          {log.status && (
                            <Badge className={getStatusColor(log.status)}>
                              {log.status === 'success' ? '✓ SUCESSO' : 
                               log.status === 'error' ? '✗ ERRO' : '⏳ PENDENTE'}
                            </Badge>
                          )}
                          
                          {/* Nível do Log */}
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          
                          {/* Duração */}
                          {log.duration && (
                            <Badge variant="outline" className="text-xs">
                              {log.duration}ms
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Usuário e Ação */}
                      {log.userName && log.action && (
                        <div className="mb-2 p-2 bg-purple-50 rounded">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-purple-800">
                              👤 {log.userName}
                            </span>
                            <span className="text-sm text-purple-600">
                              {log.action}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-700 font-mono break-words">
                        {formatMessage(log.message)}
                      </p>
                      
                      {/* Detalhes do Sistema */}
                      {log.details && typeof log.details === 'object' && !log.errorDetails && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Detalhes:</strong>
                          <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {/* Indicador de Erro Clicável */}
                      {log.status === 'error' && log.errorDetails && (
                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-sm text-red-600 font-medium">
                            ❌ Erro detectado - Clique para ver detalhes
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Estatísticas */}
          {logsData && (
            <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-4">
                <span>Total: {logsData.total}</span>
                <span>Exibindo: {logsData.logs.length}</span>
              </div>
              {autoRefresh && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Atualizando automaticamente
                </span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* Dialog de Detalhes do Erro */}
      <Dialog open={!!selectedLogDetail} onOpenChange={() => setSelectedLogDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔴 Detalhes do Erro
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o erro encontrado no sistema.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLogDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Usuário:</strong> {selectedLogDetail.userName || 'Sistema'}
                </div>
                <div>
                  <strong>Ação:</strong> {selectedLogDetail.action || 'N/A'}
                </div>
                <div>
                  <strong>Horário:</strong> {formatTimestamp(selectedLogDetail.timestamp)}
                </div>
                <div>
                  <strong>Duração:</strong> {selectedLogDetail.duration}ms
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Mensagem de Erro:</h4>
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-red-800 font-mono text-sm">
                    {selectedLogDetail.message}
                  </p>
                </div>
              </div>
              
              {selectedLogDetail.errorDetails && (
                <div>
                  <h4 className="font-medium mb-2">Detalhes Técnicos:</h4>
                  <ScrollArea className="h-64 w-full rounded-md border">
                    <div className="p-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedLogDetail.errorDetails, null, 2)}
                      </pre>
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setSelectedLogDetail(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}