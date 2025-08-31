import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Download, FileText, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportComplete?: () => void;
}

export function ExportProgressDialog({ open, onOpenChange, onExportComplete }: ExportProgressDialogProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'preparing' | 'exporting' | 'completed' | 'failed'>('preparing');
  const [currentStep, setCurrentStep] = useState('Preparando exportação...');
  const [exportData, setExportData] = useState<any>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const exportSteps = [
    { label: 'Preparando exportação...', progress: 10 },
    { label: 'Coletando dados das tarefas...', progress: 25 },
    { label: 'Coletando dados das colunas...', progress: 40 },
    { label: 'Coletando dados da equipe...', progress: 55 },
    { label: 'Coletando métricas de analytics...', progress: 70 },
    { label: 'Organizando dados...', progress: 85 },
    { label: 'Gerando arquivo...', progress: 95 },
    { label: 'Concluído!', progress: 100 }
  ];

  // Timer for elapsed time - OTIMIZADO para evitar vazamentos
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    // Apenas rodar timer se o dialog estiver aberto E status for ativo
    if (open && (status === 'preparing' || status === 'exporting') && startTime) {
      timer = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 500); // Reduzido de 100ms para 500ms para diminuir carga
    }
    
    // Cleanup sempre que dependências mudarem
    return () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [open, status, startTime]); // Incluir 'open' nas dependências

  const startExport = async () => {
    try {
      setStatus('preparing');
      setStartTime(new Date());
      
      // Simulate real export process with actual data fetching
      for (let i = 0; i < exportSteps.length; i++) {
        const step = exportSteps[i];
        setCurrentStep(step.label);
        setProgress(step.progress);
        
        if (step.progress < 100) {
          setStatus('exporting');
        } else {
          setStatus('completed');
        }

        // Simulate API calls and processing time
        await new Promise(resolve => setTimeout(resolve, 
          i === 0 ? 300 : // Preparation
          i === exportSteps.length - 1 ? 500 : // Final step
          400 + Math.random() * 400 // Variable processing time
        ));
      }

      // Fetch actual data for export
      const [tasks, columns, teamMembers, analytics] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/columns').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/analytics').then(r => r.json())
      ]);

      const exportedData = {
        tasks,
        columns,
        teamMembers,
        analytics,
        exportedAt: new Date().toISOString(),
        metadata: {
          totalRecords: tasks.length + columns.length + teamMembers.length,
          exportType: 'full',
          version: '1.0'
        }
      };

      setExportData(exportedData);

      // Create and download file
      const blob = new Blob([JSON.stringify(exportedData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanban-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: `Arquivo com ${exportedData.metadata.totalRecords} registros exportado com sucesso!`,
      });

      onExportComplete?.();
      
    } catch (error) {
      console.error('Export error:', error);
      setStatus('failed');
      setCurrentStep('Erro na exportação');
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (status !== 'exporting') {
      onOpenChange(false);
      // Reset state after a delay to allow dialog animation
      setTimeout(() => {
        setProgress(0);
        setStatus('preparing');
        setCurrentStep('Preparando exportação...');
        setExportData(null);
        setStartTime(null);
        setElapsedTime(0);
      }, 300);
    }
  };

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'exporting':
        return <Download className="w-5 h-5 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'exporting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Auto-start export when dialog opens
  useEffect(() => {
    if (open && status === 'preparing' && progress === 0) {
      startExport();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Exportação de Dados
          </DialogTitle>
          <DialogDescription>
            Acompanhe o progresso da exportação dos seus dados do Kanban.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor()} border`}>
              {status === 'preparing' && 'Preparando'}
              {status === 'exporting' && 'Exportando'}
              {status === 'completed' && 'Concluído'}
              {status === 'failed' && 'Erro'}
            </Badge>
            
            {(status === 'exporting' || status === 'completed') && startTime && (
              <span className="text-sm text-gray-500">
                Tempo: {formatElapsedTime(elapsedTime)}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600 text-center">
              {currentStep}
            </p>
          </div>

          {/* Export Details (shown after completion) */}
          {status === 'completed' && exportData && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FileText className="w-4 h-4" />
                <span className="font-medium">Detalhes da Exportação</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Total de registros: {exportData.metadata.totalRecords}</div>
                <div>Tarefas: {exportData.tasks.length}</div>
                <div>Colunas: {exportData.columns.length}</div>
                <div>Membros: {exportData.teamMembers.length}</div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {status === 'failed' && (
            <div className="bg-red-50 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Falha na exportação</p>
                <p>Verifique sua conexão e tente novamente.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {status === 'failed' && (
              <Button
                onClick={() => {
                  setStatus('preparing');
                  setProgress(0);
                  setCurrentStep('Preparando exportação...');
                  startExport();
                }}
                variant="outline"
                size="sm"
              >
                Tentar Novamente
              </Button>
            )}
            
            <Button
              onClick={handleClose}
              variant={status === 'exporting' ? 'outline' : 'default'}
              disabled={status === 'exporting'}
              size="sm"
            >
              {status === 'exporting' ? 'Exportando...' : 'Fechar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}