import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  FileText, 
  Calendar,
  Database,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface ExportRecord {
  id: string;
  userId: string;
  exportType: string;
  status: string;
  fileName: string | null;
  fileSize: number | null;
  recordsCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export function ExportHistoryDialog({ open, onOpenChange, userId }: ExportHistoryDialogProps) {
  const { data: exports = [], isLoading, refetch } = useQuery<ExportRecord[]>({
    queryKey: [`/api/exports/${userId}`],
    enabled: open && !!userId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Erro</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Em andamento</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Pendente</Badge>;
    }
  };

  const getExportTypeLabel = (type: string) => {
    switch (type) {
      case 'full':
        return 'Exportação Completa';
      case 'tasks':
        return 'Apenas Tarefas';
      case 'analytics':
        return 'Apenas Métricas';
      default:
        return 'Exportação';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 10) / 10} ${sizes[i]}`;
  };

  const formatDuration = (createdAt: string, completedAt: string | null) => {
    if (!completedAt) return 'N/A';
    const start = new Date(createdAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Exportações
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="ml-auto"
              data-testid="refresh-exports"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Carregando histórico...</span>
              </div>
            </div>
          ) : exports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Database className="w-8 h-8 mb-2" />
              <p className="text-lg font-medium">Nenhuma exportação encontrada</p>
              <p className="text-sm">Suas exportações aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exports.map((exportRecord: ExportRecord, index: number) => (
                <div key={exportRecord.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(exportRecord.status)}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {getExportTypeLabel(exportRecord.exportType)}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(exportRecord.createdAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(exportRecord.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {exportRecord.fileName && (
                      <div className="space-y-1">
                        <p className="text-gray-500">Arquivo</p>
                        <p className="font-medium truncate" title={exportRecord.fileName}>
                          {exportRecord.fileName}
                        </p>
                      </div>
                    )}

                    {exportRecord.recordsCount && (
                      <div className="space-y-1">
                        <p className="text-gray-500">Registros</p>
                        <p className="font-medium">{exportRecord.recordsCount.toLocaleString()}</p>
                      </div>
                    )}

                    {exportRecord.fileSize && (
                      <div className="space-y-1">
                        <p className="text-gray-500">Tamanho</p>
                        <p className="font-medium">{formatFileSize(exportRecord.fileSize)}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-gray-500">Duração</p>
                      <p className="font-medium">
                        {formatDuration(exportRecord.createdAt, exportRecord.completedAt)}
                      </p>
                    </div>
                  </div>

                  {exportRecord.status === 'failed' && exportRecord.errorMessage && (
                    <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-red-700">
                          <p className="font-medium">Erro:</p>
                          <p>{exportRecord.errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {index < exports.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            Mostrando {exports.length} exportação{exports.length !== 1 ? 'ões' : ''}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}