import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Trash2, Filter, Clock, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  details?: any;
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logsData, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ["/api/system/logs", selectedLevel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLevel !== "all") {
        params.append("level", selectedLevel);
      }
      params.append("limit", "50");
      
      const response = await fetch(`/api/system/logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 3000 : false, // Auto-refresh a cada 3 segundos
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
        title: "Erro",
        description: "Falha ao limpar os logs.",
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
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs do Sistema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controles */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-32">
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
                <div className="text-center text-gray-500 py-8">
                  Carregando logs...
                </div>
              ) : logsData?.logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {selectedLevel === "all" ? "Nenhum log encontrado" : `Nenhum log de nível "${selectedLevel}" encontrado`}
                </div>
              ) : (
                logsData?.logs.map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{getLevelEmoji(log.level)}</span>
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          {log.context && (
                            <Badge variant="outline" className="text-xs">
                              {log.context}
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
                      <p className="text-sm text-gray-700 font-mono break-words">
                        {formatMessage(log.message)}
                      </p>
                      {log.details && typeof log.details === 'object' && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Detalhes:</strong>
                          <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
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
    </Dialog>
  );
}