import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File,
  Check, 
  X, 
  Clock,
  Settings,
  Database,
  Users,
  Tags,
  BarChart
} from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportComplete?: () => void;
}

type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json';
type ExportStatus = 'preparing' | 'collecting' | 'processing' | 'generating' | 'completed' | 'failed';

interface ExportOptions {
  format: ExportFormat;
  includeTasks: boolean;
  includeColumns: boolean;
  includeTeamMembers: boolean;
  includeTags: boolean;
  includeAnalytics: boolean;
  includeTaskHistory: boolean;
  includeUserPermissions: boolean;
  includeTeams: boolean;
  dateRange?: 'all' | 'last30' | 'last90' | 'thisYear';
}


export function AdvancedExportDialog({ open, onOpenChange, onExportComplete }: AdvancedExportDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ExportStatus>('preparing');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Preparando exportação...');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeTasks: true,
    includeColumns: true,
    includeTeamMembers: true,
    includeTags: true,
    includeAnalytics: true,
    includeTaskHistory: false,
    includeUserPermissions: false,
    includeTeams: true,
    dateRange: 'all'
  });

  // Fetch all available data
  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks"], enabled: open });
  const { data: columns = [] } = useQuery<any[]>({ queryKey: ["/api/columns"], enabled: open });
  const { data: teamMembers = [] } = useQuery<any[]>({ queryKey: ["/api/team-members"], enabled: open });
  const { data: tags = [] } = useQuery<any[]>({ queryKey: ["/api/tags"], enabled: open });
  const { data: analytics } = useQuery<any>({ queryKey: ["/api/analytics"], enabled: open });
  const { data: teams = [] } = useQuery<any[]>({ queryKey: ["/api/teams"], enabled: open });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"], enabled: open });
  const { data: user } = useQuery<any>({ queryKey: ["/api/users/me"], enabled: open });

  const exportSteps = [
    { label: 'Preparando exportação...', progress: 5 },
    { label: 'Coletando dados das tarefas...', progress: 20 },
    { label: 'Coletando dados das colunas...', progress: 35 },
    { label: 'Coletando dados da equipe...', progress: 50 },
    { label: 'Coletando tags e metadados...', progress: 65 },
    { label: 'Coletando métricas e analytics...', progress: 80 },
    { label: 'Processando e organizando dados...', progress: 90 },
    { label: 'Gerando arquivo...', progress: 95 },
    { label: 'Concluído!', progress: 100 }
  ];

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'excel': return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-600" />;
      case 'csv': return <File className="w-4 h-4 text-blue-600" />;
      case 'json': return <Database className="w-4 h-4 text-purple-600" />;
    }
  };

  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case 'excel': return 'Excel (.xlsx)';
      case 'pdf': return 'PDF (.pdf)';
      case 'csv': return 'CSV (.csv)';
      case 'json': return 'JSON (.json)';
    }
  };

  const getStatusColor = (status: ExportStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing':
      case 'generating':
      case 'collecting': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const prepareExportData = () => {
    const exportData: Record<string, any> = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'NuP-Kan System',
        format: exportOptions.format,
        version: '2.0',
        totalRecords: 0
      }
    };

    if (exportOptions.includeTasks && Array.isArray(tasks)) {
      const processedTasks = tasks.map((task: any) => {
        // Enriquecer dados da tarefa com informações das tags
        const taskTags = Array.isArray(task.tags) ? task.tags : [];
        const tagDetails = taskTags.map((tagName: string) => {
          const tagInfo = tags.find((tag: any) => tag.name === tagName);
          return tagInfo ? { name: tagInfo.name, color: tagInfo.color } : { name: tagName, color: '#gray' };
        });

        // Obter informações da coluna
        const columnInfo = columns.find((col: any) => col.id === task.status);
        const statusColor = columnInfo?.color || '#gray';

        // Calcular dias desde criação
        const createdDate = new Date(task.createdAt);
        const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          'ID': task.id,
          'Título': task.title,
          'Descrição': task.description || 'Sem descrição',
          'Status': task.status,
          'Cor do Status': statusColor,
          'Prioridade': task.priority,
          'Responsável': task.assigneeName || 'Não atribuído',
          'Avatar': task.assigneeAvatar || '',
          'Progresso %': task.progress,
          'Tags (Nomes)': taskTags.join(', '),
          'Tags (Detalhes)': tagDetails.map((tag: any) => `${tag.name} (${tag.color})`).join('; '),
          'Total de Tags': taskTags.length,
          'Data de Criação': new Date(task.createdAt).toLocaleDateString('pt-BR'),
          'Data de Atualização': new Date(task.updatedAt).toLocaleDateString('pt-BR'),
          'Dias Criados': daysSinceCreated,
          'Status Visual': task.status.toUpperCase(),
          'Prioridade Visual': task.priority.toUpperCase()
        };
      });
      exportData.tasks = processedTasks;
      exportData.metadata.totalRecords += processedTasks.length;
    }

    if (exportOptions.includeColumns && Array.isArray(columns)) {
      const processedColumns = columns.map((column: any) => ({
        id: column.id,
        title: column.title,
        position: column.position,
        wipLimit: column.wipLimit || 'Sem limite',
        color: column.color,
        taskCount: tasks.filter((task: any) => task.status === column.id).length
      }));
      exportData.columns = processedColumns;
      exportData.metadata.totalRecords += processedColumns.length;
    }

    if (exportOptions.includeTeamMembers && Array.isArray(teamMembers)) {
      const processedMembers = teamMembers.map((member: any) => ({
        id: member.id,
        name: member.name,
        role: member.role || 'Membro',
        status: member.status || 'offline',
        tasksAssigned: tasks.filter((task: any) => task.assigneeId === member.id).length
      }));
      exportData.teamMembers = processedMembers;
      exportData.metadata.totalRecords += processedMembers.length;
    }

    if (exportOptions.includeTags && Array.isArray(tags)) {
      const processedTags = tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usageCount: tasks.filter((task: any) => 
          Array.isArray(task.tags) && task.tags.includes(tag.name)
        ).length,
        createdAt: new Date(tag.createdAt).toLocaleDateString('pt-BR')
      }));
      exportData.tags = processedTags;
      exportData.metadata.totalRecords += processedTags.length;
    }

    if (exportOptions.includeTeams && Array.isArray(teams)) {
      const processedTeams = teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description || '',
        color: team.color,
        memberCount: teamMembers.filter((member: any) => member.teamId === team.id).length,
        createdAt: new Date(team.createdAt).toLocaleDateString('pt-BR')
      }));
      exportData.teams = processedTeams;
      exportData.metadata.totalRecords += processedTeams.length;
    }

    if (exportOptions.includeAnalytics && analytics) {
      exportData.analytics = {
        ...analytics,
        generatedAt: new Date().toLocaleDateString('pt-BR')
      };
    }

    return exportData;
  };

  const generateExcelFile = (data: Record<string, any>) => {
    const workbook = XLSX.utils.book_new();

    // Helper function to apply styles to headers
    const createStyledHeader = (ws: any, headerRow: number = 0) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
        if (!ws[cellAddress]) continue;
        
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4F46E5" } },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    };

    // Helper function to apply conditional formatting based on priority/status
    const applyConditionalFormatting = (ws: any, data: any[], priorityCol: number, statusCol: number) => {
      data.forEach((row, idx) => {
        const rowIdx = idx + 1; // +1 because headers are at row 0
        
        // Priority coloring
        const priorityCell = XLSX.utils.encode_cell({ r: rowIdx, c: priorityCol });
        if (ws[priorityCell]) {
          const priority = row['Prioridade']?.toLowerCase();
          let bgColor = 'FFFFFF';
          if (priority === 'high') bgColor = 'FEF2F2'; // Light red
          else if (priority === 'medium') bgColor = 'FEF3C7'; // Light yellow
          else if (priority === 'low') bgColor = 'F0FDF4'; // Light green
          
          ws[priorityCell].s = {
            fill: { fgColor: { rgb: bgColor } },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          };
        }
        
        // Status coloring
        const statusCell = XLSX.utils.encode_cell({ r: rowIdx, c: statusCol });
        if (ws[statusCell]) {
          const status = row['Status']?.toLowerCase();
          let bgColor = 'FFFFFF';
          if (status === 'done') bgColor = 'DCFCE7'; // Green
          else if (status === 'inprogress') bgColor = 'DBEAFE'; // Blue
          else if (status === 'review') bgColor = 'FEF3C7'; // Yellow
          else if (status === 'backlog') bgColor = 'F3F4F6'; // Gray
          
          ws[statusCell].s = {
            fill: { fgColor: { rgb: bgColor } },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          };
        }
      });
    };

    // Summary sheet with enhanced information
    const summaryData = [
      { 'Categoria': '📊 RESUMO GERAL', 'Valor': '', 'Detalhes': '' },
      { 'Categoria': 'Data de Exportação', 'Valor': new Date().toLocaleDateString('pt-BR'), 'Detalhes': new Date().toLocaleTimeString('pt-BR') },
      { 'Categoria': 'Total de Registros', 'Valor': data.metadata.totalRecords, 'Detalhes': 'Todos os dados exportados' },
      { 'Categoria': '', 'Valor': '', 'Detalhes': '' },
      { 'Categoria': '📋 DADOS EXPORTADOS', 'Valor': '', 'Detalhes': '' },
      { 'Categoria': 'Tarefas', 'Valor': data.tasks?.length || 0, 'Detalhes': 'Com tags, responsáveis e status' },
      { 'Categoria': 'Colunas do Kanban', 'Valor': data.columns?.length || 0, 'Detalhes': 'Com cores e limites WIP' },
      { 'Categoria': 'Membros da Equipe', 'Valor': data.teamMembers?.length || 0, 'Detalhes': 'Com cargos e status' },
      { 'Categoria': 'Tags', 'Valor': data.tags?.length || 0, 'Detalhes': 'Com cores e contadores de uso' },
      { 'Categoria': 'Times', 'Valor': data.teams?.length || 0, 'Detalhes': 'Com descrições e membros' }
    ];
    
    if (data.analytics) {
      summaryData.push(
        { 'Categoria': '', 'Valor': '', 'Detalhes': '' },
        { 'Categoria': '📈 MÉTRICAS', 'Valor': '', 'Detalhes': '' },
        { 'Categoria': 'Tempo Médio de Ciclo', 'Valor': data.analytics.averageCycleTime || 0, 'Detalhes': 'dias' },
        { 'Categoria': 'Throughput', 'Valor': data.analytics.throughput || 0, 'Detalhes': 'tarefas/semana' },
        { 'Categoria': 'Eficiência', 'Valor': `${data.analytics.efficiency || 0}%`, 'Detalhes': 'percentual' }
      );
    }

    const summaryWS = XLSX.utils.json_to_sheet(summaryData);
    createStyledHeader(summaryWS);
    summaryWS['!cols'] = [{ width: 25 }, { width: 15 }, { width: 30 }];
    XLSX.utils.book_append_sheet(workbook, summaryWS, "📊 Resumo");

    // Tasks sheet with enhanced formatting
    if (data.tasks) {
      const tasksWS = XLSX.utils.json_to_sheet(data.tasks);
      createStyledHeader(tasksWS);
      applyConditionalFormatting(tasksWS, data.tasks, 5, 3); // Priority at col 5, Status at col 3
      
      // Set column widths
      tasksWS['!cols'] = [
        { width: 10 }, // ID
        { width: 30 }, // Título
        { width: 40 }, // Descrição
        { width: 15 }, // Status
        { width: 12 }, // Cor Status
        { width: 12 }, // Prioridade
        { width: 20 }, // Responsável
        { width: 8 },  // Avatar
        { width: 10 }, // Progresso
        { width: 30 }, // Tags
        { width: 40 }, // Tags Detalhes
        { width: 8 },  // Total Tags
        { width: 12 }, // Data Criação
        { width: 12 }, // Data Atualização
        { width: 8 },  // Dias
        { width: 15 }, // Status Visual
        { width: 15 }  // Prioridade Visual
      ];
      
      XLSX.utils.book_append_sheet(workbook, tasksWS, "📋 Tarefas Completas");
    }

    // Enhanced Tags sheet
    if (data.tags) {
      const enhancedTags = data.tags.map((tag: any) => ({
        'Nome da Tag': tag.name,
        'Cor': tag.color,
        'Cor Visual': tag.color,
        'Usos': tag.usageCount,
        'Popularidade': tag.usageCount > 5 ? 'Alta' : tag.usageCount > 2 ? 'Média' : 'Baixa',
        'Data de Criação': tag.createdAt,
        'ID': tag.id
      }));
      
      const tagsWS = XLSX.utils.json_to_sheet(enhancedTags);
      createStyledHeader(tagsWS);
      tagsWS['!cols'] = [{ width: 20 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 15 }, { width: 15 }, { width: 25 }];
      XLSX.utils.book_append_sheet(workbook, tagsWS, "🏷️ Tags");
    }

    // Enhanced Columns sheet
    if (data.columns) {
      const enhancedColumns = data.columns.map((column: any) => ({
        'Nome da Coluna': column.title,
        'Posição': column.position,
        'Limite WIP': column.wipLimit,
        'Cor': column.color,
        'Tarefas na Coluna': column.taskCount,
        'Utilização': column.wipLimit ? `${Math.round((column.taskCount / column.wipLimit) * 100)}%` : 'Sem limite',
        'Status': column.taskCount >= (column.wipLimit || Infinity) ? 'No limite' : 'Normal',
        'ID': column.id
      }));
      
      const columnsWS = XLSX.utils.json_to_sheet(enhancedColumns);
      createStyledHeader(columnsWS);
      columnsWS['!cols'] = [{ width: 20 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 25 }];
      XLSX.utils.book_append_sheet(workbook, columnsWS, "📊 Colunas");
    }

    // Enhanced Team Members sheet
    if (data.teamMembers) {
      const enhancedMembers = data.teamMembers.map((member: any) => ({
        'Nome': member.name,
        'Cargo': member.role,
        'Status': member.status,
        'Tarefas Atribuídas': member.tasksAssigned,
        'Carga de Trabalho': member.tasksAssigned > 5 ? 'Alta' : member.tasksAssigned > 2 ? 'Média' : 'Baixa',
        'Disponibilidade': member.status === 'online' ? 'Disponível' : member.status === 'busy' ? 'Ocupado' : 'Offline',
        'ID': member.id
      }));
      
      const membersWS = XLSX.utils.json_to_sheet(enhancedMembers);
      createStyledHeader(membersWS);
      membersWS['!cols'] = [{ width: 20 }, { width: 15 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 25 }];
      XLSX.utils.book_append_sheet(workbook, membersWS, "👥 Equipe");
    }

    // Enhanced Teams sheet
    if (data.teams) {
      const enhancedTeams = data.teams.map((team: any) => ({
        'Nome do Time': team.name,
        'Descrição': team.description,
        'Cor': team.color,
        'Membros': team.memberCount,
        'Data de Criação': team.createdAt,
        'Tamanho': team.memberCount > 10 ? 'Grande' : team.memberCount > 5 ? 'Médio' : 'Pequeno',
        'ID': team.id
      }));
      
      const teamsWS = XLSX.utils.json_to_sheet(enhancedTeams);
      createStyledHeader(teamsWS);
      teamsWS['!cols'] = [{ width: 20 }, { width: 30 }, { width: 12 }, { width: 10 }, { width: 15 }, { width: 12 }, { width: 25 }];
      XLSX.utils.book_append_sheet(workbook, teamsWS, "🏢 Times");
    }

    // Analytics sheet
    if (data.analytics) {
      const analyticsDetailed = [
        { 'Métrica': 'Tempo Médio de Ciclo', 'Valor': data.analytics.averageCycleTime || 0, 'Unidade': 'dias', 'Descrição': 'Tempo médio para completar uma tarefa' },
        { 'Métrica': 'Throughput', 'Valor': data.analytics.throughput || 0, 'Unidade': 'tarefas/semana', 'Descrição': 'Quantidade de tarefas concluídas por semana' },
        { 'Métrica': 'Eficiência', 'Valor': data.analytics.efficiency || 0, 'Unidade': '%', 'Descrição': 'Percentual de eficiência do time' },
        { 'Métrica': 'Bloqueios', 'Valor': data.analytics.blockers || 0, 'Unidade': 'items', 'Descrição': 'Quantidade de bloqueios identificados' }
      ];
      
      const analyticsWS = XLSX.utils.json_to_sheet(analyticsDetailed);
      createStyledHeader(analyticsWS);
      analyticsWS['!cols'] = [{ width: 25 }, { width: 12 }, { width: 15 }, { width: 40 }];
      XLSX.utils.book_append_sheet(workbook, analyticsWS, "📈 Analytics");
    }

    const filename = `NuP-Kan-Export-Completo-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const generatePDFFile = (data: Record<string, any>) => {
    const pdf = new jsPDF();
    
    // Title
    pdf.setFontSize(20);
    pdf.text('NuP-Kan - Relatório de Exportação', 20, 30);
    
    pdf.setFontSize(12);
    pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
    pdf.text(`Total de registros: ${data.metadata.totalRecords}`, 20, 55);

    let yPosition = 75;

    // Tasks summary
    if (data.tasks) {
      pdf.setFontSize(14);
      pdf.text('Resumo de Tarefas', 20, yPosition);
      yPosition += 15;
      
      const tasksByStatus = data.tasks.reduce((acc: Record<string, number>, task: any) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      Object.entries(tasksByStatus).forEach(([status, count]) => {
        pdf.setFontSize(10);
        pdf.text(`${status}: ${count} tarefas`, 25, yPosition);
        yPosition += 10;
      });
      yPosition += 10;
    }

    // Analytics
    if (data.analytics) {
      pdf.setFontSize(14);
      pdf.text('Métricas', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(10);
      pdf.text(`Tempo médio de ciclo: ${data.analytics.averageCycleTime || 0} dias`, 25, yPosition);
      yPosition += 10;
      pdf.text(`Throughput: ${data.analytics.throughput || 0} tarefas/semana`, 25, yPosition);
      yPosition += 10;
      pdf.text(`Eficiência: ${data.analytics.efficiency || 0}%`, 25, yPosition);
      yPosition += 20;
    }

    // Tags summary
    if (data.tags) {
      pdf.setFontSize(14);
      pdf.text('Tags Mais Utilizadas', 20, yPosition);
      yPosition += 15;
      
      const sortedTags = data.tags
        .sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10);
      
      sortedTags.forEach((tag: any) => {
        pdf.setFontSize(10);
        pdf.text(`${tag.name}: ${tag.usageCount} usos`, 25, yPosition);
        yPosition += 10;
      });
    }

    const filename = `kanban-report-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  const generateCSVFile = (data: Record<string, any>) => {
    if (data.tasks) {
      const csv = XLSX.utils.json_to_sheet(data.tasks);
      const csvData = XLSX.utils.sheet_to_csv(csv);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
      const filename = `kanban-tasks-${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
    }
  };

  const generateJSONFile = (data: Record<string, any>) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const filename = `kanban-data-${new Date().toISOString().split('T')[0]}.json`;
    saveAs(blob, filename);
  };

  const startExport = async () => {
    let exportHistoryId: string | null = null;
    
    try {
      setStatus('preparing');
      setStartTime(new Date());
      
      // Create export history record
      if (user?.id) {
        try {
          const exportHistoryData = {
            userId: user.id,
            exportType: `${exportOptions.format}_export`,
            status: 'pending' as const,
            fileName: null,
            fileSize: null,
            recordsCount: null,
            errorMessage: null
          };
          
          const historyResponse = await apiRequest('POST', '/api/exports', exportHistoryData);
          const result = await historyResponse.json();
          exportHistoryId = result.id;
        } catch (historyError) {
          console.warn('Failed to create export history:', historyError);
          // Continue with export even if history creation fails
        }
      }
      
      // Progress through steps
      for (let i = 0; i < exportSteps.length - 1; i++) {
        const step = exportSteps[i];
        setCurrentStep(step.label);
        setProgress(step.progress);
        
        if (step.progress >= 20 && step.progress < 80) {
          setStatus('collecting');
        } else if (step.progress >= 80) {
          setStatus('processing');
        }

        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
      }

      setStatus('generating');
      setCurrentStep('Gerando arquivo...');
      setProgress(95);

      // Prepare and generate export
      const exportData = prepareExportData();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const formatExtension = {
        'excel': 'xlsx',
        'pdf': 'pdf',
        'csv': 'csv',
        'json': 'json'
      }[exportOptions.format];
      const fileName = `uP-Kan-Export-${timestamp}.${formatExtension}`;

      // Generate file based on format
      switch (exportOptions.format) {
        case 'excel':
          generateExcelFile(exportData);
          break;
        case 'pdf':
          generatePDFFile(exportData);
          break;
        case 'csv':
          generateCSVFile(exportData);
          break;
        case 'json':
          generateJSONFile(exportData);
          break;
      }

      setStatus('completed');
      setCurrentStep('Concluído!');
      setProgress(100);

      // Update export history record with success
      if (exportHistoryId) {
        try {
          await apiRequest('PATCH', `/api/exports/${exportHistoryId}`, {
            status: 'completed',
            fileName: fileName,
            fileSize: JSON.stringify(exportData).length, // Approximate size
            recordsCount: exportData.metadata.totalRecords,
            completedAt: new Date()
          });
        } catch (updateError) {
          console.warn('Failed to update export history:', updateError);
        }
      }

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${getFormatLabel(exportOptions.format)} com ${exportData.metadata.totalRecords} registros exportado com sucesso!`,
      });

      onExportComplete?.();
      
      // Invalidate export history cache to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/exports/${user?.id}`] });
      
    } catch (error) {
      console.error('Export error:', error);
      setStatus('failed');
      setCurrentStep('Erro na exportação');
      
      // Update export history record with failure
      if (exportHistoryId) {
        try {
          await apiRequest('PATCH', `/api/exports/${exportHistoryId}`, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
            completedAt: new Date()
          });
        } catch (updateError) {
          console.warn('Failed to update export history:', updateError);
        }
      }
      
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (status !== 'collecting' && status !== 'processing' && status !== 'generating') {
      onOpenChange(false);
      setTimeout(() => {
        setProgress(0);
        setStatus('preparing');
        setCurrentStep('Preparando exportação...');
        setStartTime(null);
      }, 300);
    }
  };

  const getTotalSelectedItems = () => {
    let total = 0;
    if (exportOptions.includeTasks && Array.isArray(tasks)) total += tasks.length;
    if (exportOptions.includeColumns && Array.isArray(columns)) total += columns.length;
    if (exportOptions.includeTeamMembers && Array.isArray(teamMembers)) total += teamMembers.length;
    if (exportOptions.includeTags && Array.isArray(tags)) total += tags.length;
    if (exportOptions.includeTeams && Array.isArray(teams)) total += teams.length;
    if (exportOptions.includeAnalytics) total += 1;
    return total;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportação Avançada de Dados
          </DialogTitle>
          <DialogDescription>
            Configure e exporte seus dados do kanban em diferentes formatos com opções avançadas de personalização.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {status === 'preparing' && (
            <>
              {/* Format Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Formato de Exportação
                  </CardTitle>
                  <CardDescription>
                    Escolha o formato do arquivo de exportação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={exportOptions.format}
                    onValueChange={(value: ExportFormat) => 
                      setExportOptions(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          {getFormatIcon('excel')}
                          Excel (.xlsx) - Recomendado
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          {getFormatIcon('pdf')}
                          PDF (.pdf) - Relatório
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          {getFormatIcon('csv')}
                          CSV (.csv) - Tarefas apenas
                        </div>
                      </SelectItem>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          {getFormatIcon('json')}
                          JSON (.json) - Dados completos
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Data Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados para Exportar</CardTitle>
                  <CardDescription>
                    Selecione quais informações incluir na exportação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tasks"
                        checked={exportOptions.includeTasks}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeTasks: !!checked }))
                        }
                      />
                      <Label htmlFor="tasks" className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Tarefas ({Array.isArray(tasks) ? tasks.length : 0})
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="columns"
                        checked={exportOptions.includeColumns}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeColumns: !!checked }))
                        }
                      />
                      <Label htmlFor="columns" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Colunas ({Array.isArray(columns) ? columns.length : 0})
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="members"
                        checked={exportOptions.includeTeamMembers}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeTeamMembers: !!checked }))
                        }
                      />
                      <Label htmlFor="members" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Equipe ({Array.isArray(teamMembers) ? teamMembers.length : 0})
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tags"
                        checked={exportOptions.includeTags}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeTags: !!checked }))
                        }
                      />
                      <Label htmlFor="tags" className="flex items-center gap-2">
                        <Tags className="w-4 h-4" />
                        Tags ({Array.isArray(tags) ? tags.length : 0})
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="teams"
                        checked={exportOptions.includeTeams}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeTeams: !!checked }))
                        }
                      />
                      <Label htmlFor="teams" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Times ({Array.isArray(teams) ? teams.length : 0})
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="analytics"
                        checked={exportOptions.includeAnalytics}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeAnalytics: !!checked }))
                        }
                      />
                      <Label htmlFor="analytics" className="flex items-center gap-2">
                        <BarChart className="w-4 h-4" />
                        Analytics
                      </Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Total de registros selecionados:</span>
                    <Badge variant="secondary">{getTotalSelectedItems()}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={startExport}
                  disabled={getTotalSelectedItems() === 0}
                  className="min-w-[140px]"
                >
                  Iniciar Exportação
                </Button>
              </div>
            </>
          )}

          {(status !== 'preparing') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {status === 'completed' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : status === 'failed' ? (
                    <X className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                  )}
                  <span className={getStatusColor(status)}>
                    {status === 'completed' ? 'Exportação Concluída' :
                     status === 'failed' ? 'Erro na Exportação' :
                     'Exportando Dados...'}
                  </span>
                </CardTitle>
                <CardDescription>
                  Formato: {getFormatLabel(exportOptions.format)} • {getTotalSelectedItems()} registros
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentStep}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {status === 'completed' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Arquivo exportado com sucesso! O download deve ter iniciado automaticamente.
                    </p>
                  </div>
                )}

                {status === 'failed' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ❌ Ocorreu um erro durante a exportação. Tente novamente.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  {status === 'completed' || status === 'failed' ? (
                    <>
                      {status === 'failed' && (
                        <Button variant="outline" onClick={startExport}>
                          Tentar Novamente
                        </Button>
                      )}
                      <Button onClick={handleClose}>
                        Fechar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" disabled>
                      Exportando...
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}