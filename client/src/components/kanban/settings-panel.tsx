import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Download, X, Columns, Users, Tags, Users2, UserCog, Mail, Shield, History, Grid, Database, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ColumnManagementDialog } from "./column-management-dialog";
import { TagManagementDialog } from "./tag-management-dialog";
import { EmailSettingsDialog } from "./email-settings-dialog";
import { AdvancedExportDialog } from "@/components/export/AdvancedExportDialog";
import { ExportHistoryDialog } from "@/components/export/ExportHistoryDialog";
import { SystemLogsDialog } from "@/components/system-logs-dialog";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import type { Column, Team } from "@shared/schema";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
}

export function SettingsPanel({ isOpen, onClose, boardId }: SettingsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { canManageColumns, canManageUsers, canManageTeams, canManageProfiles, canViewAnalytics, canExportData } = usePermissions();
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isAdvancedExportOpen, setIsAdvancedExportOpen] = useState(false);
  const [isExportHistoryOpen, setIsExportHistoryOpen] = useState(false);
  const [isSystemLogsOpen, setIsSystemLogsOpen] = useState(false);

  const { data: columns = [] } = useQuery<Column[]>({
    queryKey: ["/api/columns"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics", boardId],
    queryFn: async () => {
      const url = boardId 
        ? `/api/analytics?boardId=${boardId}`
        : '/api/analytics';
      const response = await fetch(url);
      return response.json();
    }
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnId, wipLimit }: { columnId: string; wipLimit: number | null }) => {
      const response = await apiRequest("PATCH", `/api/columns/${columnId}`, { wipLimit });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      toast({
        title: "Sucesso",
        description: "Limite WIP atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar limite WIP. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleWipLimitChange = (columnId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    setWipLimits(prev => ({ ...prev, [columnId]: numValue }));
    
    // Update immediately
    updateColumnMutation.mutate({
      columnId,
      wipLimit: numValue,
    });
  };

  const handleExportData = () => {
    setIsAdvancedExportOpen(true);
    onClose();
  };

  const handleExportComplete = () => {
    // Invalidate queries to refresh any data that might have changed
    queryClient.invalidateQueries();
  };


  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 sm:max-w-none flex flex-col" data-testid="settings-panel">
        <SheetHeader>
          <SheetTitle>
            Configurações
          </SheetTitle>
          <SheetDescription>
            Configure as opções do sistema e gerencie seus dados.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-hide max-h-[calc(100vh-120px)]">
          {/* Export Data Section - Top Priority */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="export-heading">📊 Exportação</h3>
            <div className="space-y-2">
              <Button
                onClick={handleExportData}
                className="w-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium"
                data-testid="button-export-data"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Dados (Excel, PDF, CSV, JSON)
              </Button>
              {user && (
                <Button
                  onClick={() => {
                    setIsExportHistoryOpen(true);
                    onClose();
                  }}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-export-history"
                >
                  <History className="w-4 h-4 mr-2" />
                  Histórico de Exportações
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Unified Management Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">⚙️ Sistema</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Navigate to Boards Page */}
              <Button
                onClick={() => {
                  setLocation('/');
                  onClose();
                }}
                className="w-full justify-start bg-green-600 hover:bg-green-700"
                data-testid="button-view-boards"
              >
                <Grid className="w-4 h-4 mr-2" />
                Ver Todos os Boards
              </Button>
              
              {/* Consolidated Management Button */}
              <Button
                onClick={() => {
                  setLocation('/admin/permissions');
                  onClose();
                }}
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                data-testid="button-manage-all"
              >
                <Shield className="w-4 h-4 mr-2" />
                Gerenciar Usuários, Times e Perfis
              </Button>
              
              <PermissionGuard permissions={["Criar Colunas", "Editar Colunas", "Excluir Colunas"]}>
                <Button
                  onClick={() => {
                    setIsColumnManagementOpen(true);
                    onClose();
                  }}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-manage-columns"
                >
                  <Columns className="w-4 h-4 mr-2" />
                  Gerenciar Colunas
                </Button>
              </PermissionGuard>
              
              
              <Button
                onClick={() => {
                  setIsTagManagementOpen(true);
                  onClose();
                }}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-manage-tags"
              >
                <Tags className="w-4 h-4 mr-2" />
                Gerenciar Tags
              </Button>
              
              <Button
                onClick={() => {
                  setIsSystemLogsOpen(true);
                  onClose();
                }}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-system-logs"
              >
                <FileText className="w-4 h-4 mr-2" />
                Logs do Sistema
              </Button>

              {/* Auxiliary Data Section */}
              <div className="pt-2 border-t">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Dados Auxiliares
                </Label>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setLocation("/admin/task-status");
                      onClose();
                    }}
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-manage-status"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Status das Tarefas
                  </Button>
                  <Button
                    onClick={() => {
                      setLocation("/admin/task-priority");
                      onClose();
                    }}
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-manage-priorities"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Prioridades das Tarefas
                  </Button>
                  <Button
                    onClick={() => {
                      setLocation("/admin/custom-fields");
                      onClose();
                    }}
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-manage-custom-fields"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Campos Personalizados
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  setIsEmailSettingsOpen(true);
                  onClose();
                }}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-email-settings"
              >
                <Mail className="w-4 h-4 mr-2" />
                Configurações de Email
              </Button>
            </div>
          </div>

          <Separator />

          {/* WIP Limits */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="wip-limits-heading">Limites WIP</h3>
            <div className="space-y-3">
              {columns
                .filter(column => column.wipLimit !== null)
                .map((column) => (
                  <div key={column.id} className="flex items-center justify-between">
                    <Label htmlFor={`wip-${column.id}`} className="text-sm text-gray-700">
                      {column.title}
                    </Label>
                    <Input
                      id={`wip-${column.id}`}
                      type="number"
                      min="1"
                      max="20"
                      defaultValue={column.wipLimit || 1}
                      onChange={(e) => handleWipLimitChange(column.id, e.target.value)}
                      className="w-16 text-sm"
                      data-testid={`input-wip-${column.id}`}
                    />
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          {/* Teams */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="teams-heading">Times</h3>
            <div className="space-y-3">
              {teams.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhum time cadastrado
                </div>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium" data-testid={`team-icon-${team.id}`}>
                        {team.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" data-testid={`team-name-${team.id}`}>
                        {team.name}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`team-description-${team.id}`}>
                        {team.description || 'Sem descrição'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-gray-500" data-testid={`team-status-${team.id}`}>
                        Ativo
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Automation */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="automation-heading">🤖 Automação</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-assign" className="text-sm text-gray-700">
                  Auto-assign por prioridade
                </Label>
                <Switch id="auto-assign" defaultChecked data-testid="switch-auto-assign" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="wip-notifications" className="text-sm text-gray-700">
                  Notificações de WIP
                </Label>
                <Switch id="wip-notifications" defaultChecked data-testid="switch-wip-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="realtime-metrics" className="text-sm text-gray-700">
                  Métricas em tempo real
                </Label>
                <Switch id="realtime-metrics" data-testid="switch-realtime-metrics" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Analytics */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="analytics-heading">📈 Análises do Sistema</h3>
            
            {/* Main metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-800" data-testid="analytics-daily-throughput">
                  {(analytics as any)?.dailyThroughput || 0}
                </p>
                <p className="text-xs text-blue-600">Cards/Dia</p>
                <p className="text-[10px] text-blue-500 mt-1">Movimentados hoje</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg text-center">
                <p className="text-xl font-bold text-orange-800" data-testid="analytics-weekly-throughput">
                  {(analytics as any)?.weeklyThroughput || 0}
                </p>
                <p className="text-xs text-orange-600">Cards/Semana</p>
                <p className="text-[10px] text-orange-500 mt-1">Últimos 7 dias</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg text-center">
                <p className="text-xl font-bold text-green-800" data-testid="analytics-monthly-throughput">
                  {(analytics as any)?.monthlyThroughput || 0}
                </p>
                <p className="text-xs text-green-600">Cards/Mês</p>
                <p className="text-[10px] text-green-500 mt-1">Movimentados este mês</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg text-center">
                <p className="text-xl font-bold text-purple-800" data-testid="analytics-cycle-time">
                  {(analytics as any)?.averageCycleTime || 0}d
                </p>
                <p className="text-xs text-purple-600">Tempo de Ciclo</p>
                {((analytics as any)?.averageCycleTime || 0) === 0 && (analytics as any)?.totalTasks > 0 && (
                  <p className="text-[10px] text-purple-500 mt-1">Sem dados históricos</p>
                )}
              </div>
            </div>


            {/* Alert indicators */}
            {((analytics as any)?.blockers > 0 || (analytics as any)?.wipViolations > 0) && (
              <div className="space-y-2">
                {(analytics as any)?.blockers > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-700" data-testid="analytics-blockers">
                      {(analytics as any).blockers} bloqueio{(analytics as any).blockers !== 1 ? 's' : ''} ativo{(analytics as any).blockers !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {(analytics as any)?.wipViolations > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-yellow-700" data-testid="analytics-wip-violations">
                      {(analytics as any).wipViolations} violação{(analytics as any).wipViolations !== 1 ? 'ões' : ''} de limite WIP
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Real Column Distribution */}
            {(analytics as any)?.actualStatusDistribution && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Distribuição por Coluna:</p>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {Object.entries((analytics as any).actualStatusDistribution || {}).map(([columnId, data]: [string, any]) => (
                    <div key={columnId} className="flex justify-between items-center p-1 rounded bg-gray-50">
                      <span className="text-gray-700 truncate flex-1 mr-2" title={data.name}>
                        {data.name}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{data.count}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          data.category === 'done' ? 'bg-green-500' :
                          data.category === 'inprogress' ? 'bg-yellow-500' :
                          data.category === 'review' ? 'bg-purple-500' :
                          data.category === 'todo' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: Legacy status distribution */}
            {!(analytics as any)?.actualStatusDistribution && (analytics as any)?.statusDistribution && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Distribuição por Status:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Backlog:</span>
                    <span className="font-semibold">{(analytics as any).statusDistribution.backlog || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Todo:</span>
                    <span className="font-semibold">{(analytics as any).statusDistribution.todo || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Progresso:</span>
                    <span className="font-semibold">{(analytics as any).statusDistribution.inprogress || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Review:</span>
                    <span className="font-semibold">{(analytics as any).statusDistribution.review || 0}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-green-600">Concluído:</span>
                    <span className="font-semibold">{(analytics as any).statusDistribution.done || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Priority distribution */}
            {(analytics as any)?.priorityDistribution && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Distribuição por Prioridade:</p>
                <div className="flex justify-between text-xs">
                  <span className="text-red-600">
                    Alta: <span className="font-semibold">{(analytics as any).priorityDistribution.high || 0}</span>
                  </span>
                  <span className="text-yellow-600">
                    Média: <span className="font-semibold">{(analytics as any).priorityDistribution.medium || 0}</span>
                  </span>
                  <span className="text-green-600">
                    Baixa: <span className="font-semibold">{(analytics as any).priorityDistribution.low || 0}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export buttons moved to top */}
      </SheetContent>

      {/* Management Dialogs */}
      {boardId && (
        <ColumnManagementDialog
          isOpen={isColumnManagementOpen}
          onClose={() => setIsColumnManagementOpen(false)}
          boardId={boardId}
        />
      )}
      
      
      <TagManagementDialog
        isOpen={isTagManagementOpen}
        onClose={() => setIsTagManagementOpen(false)}
      />
      
      <EmailSettingsDialog 
        open={isEmailSettingsOpen} 
        onOpenChange={setIsEmailSettingsOpen}
      />
      
      <SystemLogsDialog 
        open={isSystemLogsOpen} 
        onOpenChange={setIsSystemLogsOpen}
      />

      {/* Export Dialogs */}
      <AdvancedExportDialog
        open={isAdvancedExportOpen}
        onOpenChange={setIsAdvancedExportOpen}
        onExportComplete={handleExportComplete}
      />
      
      {user && (
        <ExportHistoryDialog
          open={isExportHistoryOpen}
          onOpenChange={setIsExportHistoryOpen}
          userId={user.id}
        />
      )}
    </Sheet>
  );
}
