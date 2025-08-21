import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Download, X, Columns, Users, Tags, Users2, UserCog } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ColumnManagementDialog } from "./column-management-dialog";
import { UserManagementDialog } from "./user-management-dialog";
import { TagManagementDialog } from "./tag-management-dialog";
import { TeamManagementDialog } from "./team-management-dialog";
import { ProfileManagementDialog } from "./profile-management-dialog";
import type { Column, TeamMember } from "@shared/schema";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);

  const { data: columns = [] } = useQuery<Column[]>({
    queryKey: ["/api/columns"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
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
    const data = {
      columns,
      teamMembers,
      analytics,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Sucesso",
      description: "Dados exportados com sucesso!",
    });
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      online: "bg-green-500",
      busy: "bg-yellow-500",
      offline: "bg-gray-400",
    };
    return colorMap[status as keyof typeof colorMap] || "bg-gray-400";
  };

  const getStatusText = (status: string) => {
    const textMap = {
      online: "Online",
      busy: "Ocupado",
      offline: "Offline",
    };
    return textMap[status as keyof typeof textMap] || status;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 sm:max-w-none" data-testid="settings-panel">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Configurações
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              data-testid="button-close-settings"
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Management Buttons */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Gerenciamento</h3>
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => setIsColumnManagementOpen(true)}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-manage-columns"
              >
                <Columns className="w-4 h-4 mr-2" />
                Gerenciar Colunas
              </Button>
              <Button
                onClick={() => setIsUserManagementOpen(true)}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-manage-users"
              >
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Usuários
              </Button>
              <Button
                onClick={() => setIsTagManagementOpen(true)}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-manage-tags"
              >
                <Tags className="w-4 h-4 mr-2" />
                Gerenciar Tags
              </Button>
              
              <ProfileManagementDialog>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  data-testid="button-manage-profiles"
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Gerenciar Perfis
                </Button>
              </ProfileManagementDialog>
              <TeamManagementDialog />
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

          {/* Team Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="team-heading">Equipe</h3>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium" data-testid={`member-avatar-${member.id}`}>
                      {member.avatar}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900" data-testid={`member-name-${member.id}`}>
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500" data-testid={`member-role-${member.id}`}>
                      {member.role}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status || 'offline')}`}></div>
                    <span className="text-xs text-gray-500" data-testid={`member-status-${member.id}`}>
                      {getStatusText(member.status || 'offline')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Automation */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900" data-testid="automation-heading">Automação</h3>
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
            <h3 className="font-medium text-gray-900" data-testid="analytics-heading">Análises</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900" data-testid="analytics-cycle-time">
                  {(analytics as any)?.averageCycleTime || 0}
                </p>
                <p className="text-xs text-gray-500">Tempo Médio (dias)</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900" data-testid="analytics-throughput">
                  {(analytics as any)?.throughput || 0}
                </p>
                <p className="text-xs text-gray-500">Cards/Semana</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900" data-testid="analytics-efficiency">
                  {(analytics as any)?.efficiency || 0}%
                </p>
                <p className="text-xs text-gray-500">Eficiência</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900" data-testid="analytics-blockers">
                  {(analytics as any)?.blockers || 0}
                </p>
                <p className="text-xs text-gray-500">Bloqueios</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <Button
            onClick={handleExportData}
            className="w-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium"
            data-testid="button-export-data"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Dados
          </Button>
        </div>
      </SheetContent>

      {/* Management Dialogs */}
      <ColumnManagementDialog
        isOpen={isColumnManagementOpen}
        onClose={() => setIsColumnManagementOpen(false)}
      />
      <UserManagementDialog
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />
      <TagManagementDialog
        isOpen={isTagManagementOpen}
        onClose={() => setIsTagManagementOpen(false)}
      />
    </Sheet>
  );
}
