import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { updateTaskSchema } from "@shared/schema";
import type { Task, TeamMember, Tag } from "@shared/schema";
import { TagSelector } from "./tag-selector";
import { MultiUserSelector } from "./multi-user-selector";
import { z } from "zod";
import { Edit, Trash2, User, Calendar, Clock, Flag, X, ChevronDown, ChevronRight, History } from "lucide-react";
import { TaskTimeline } from "./task-timeline";
import TaskCustomFields from "./task-custom-fields";

interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
  isReadOnly?: boolean;
}

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const formSchema = updateTaskSchema.extend({
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  assigneeIds: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, isLoading }: DeleteConfirmationProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="dialog-delete-confirmation">
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-confirm-delete"
          >
            {isLoading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TaskDetailsDialog({ task, isOpen, onClose, boardId, isReadOnly = false }: TaskDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Reset editing state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setIsHistoryExpanded(false);
      setIsDeleteDialogOpen(false);
    }
  }, [isOpen]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  // Fetch all tags to get colors
  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Get current assignees for the task
  const { data: currentAssignees = [] } = useQuery({
    queryKey: ["/api/tasks", task?.id, "assignees"],
    enabled: !!task?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "backlog",
      priority: task?.priority || "medium",
      assigneeId: task?.assigneeId || "",
      progress: task?.progress || 0,
      tags: task?.tags || [],
      assigneeIds: [],
    },
  });

  // Reset form and editing state when task changes
  useEffect(() => {
    if (task && currentAssignees) {
      const assigneeIds = Array.isArray(currentAssignees) 
        ? currentAssignees.map((assignee: any) => assignee.user.id)
        : [];
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId || "",
        progress: task.progress || 0,
        tags: task.tags || [],
        assigneeIds: assigneeIds,
      });
      // Reset editing state when task changes
      setIsEditing(false);
    }
  }, [task, currentAssignees, form]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!task) return;
      
      const { assigneeIds, ...taskData } = data;
      
      // Update task data first
      const response = await apiRequest("PATCH", `/api/tasks/${task.id}`, taskData);
      const updatedTask = await response.json();
      
      // Update assignees if they changed
      if (assigneeIds && assigneeIds.length >= 0) {
        await apiRequest("PUT", `/api/tasks/${task.id}/assignees`, {
          userIds: assigneeIds,
        });
      }
      
      return updatedTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      // Invalidate task assignees
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "assignees"] });
      // Invalidate board-specific queries
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/tasks`] });
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });
      setIsEditing(false);
      onClose(); // Fecha o modal automaticamente após edição
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const response = await apiRequest("DELETE", `/api/tasks/${task.id}`);
      // DELETE returns 204 No Content, so no JSON to parse
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      // Invalidate board-specific queries
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/tasks`] });
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateTaskMutation.mutate(data);
  };

  const getPriorityText = (priority: string) => {
    const priorityMap = {
      high: "Alta",
      medium: "Média",
      low: "Baixa",
    };
    return priorityMap[priority as keyof typeof priorityMap] || priority;
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      backlog: "Backlog",
      todo: "To Do",
      inprogress: "Em Progresso",
      review: "Em Revisão",
      done: "Concluído",
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      high: "bg-red-100 text-red-600",
      medium: "bg-yellow-100 text-yellow-600",
      low: "bg-blue-100 text-blue-600",
    };
    return colorMap[priority as keyof typeof colorMap] || "bg-gray-100 text-gray-600";
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden [&>button]:hidden p-0" data-testid="task-details-dialog">
        {/* Cabeçalho fixo com título e botões */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              {isEditing ? (
                <>
                  <DialogTitle className="sr-only">Editar Tarefa</DialogTitle>
                  <DialogDescription className="sr-only">
                    Edite as informações da tarefa
                  </DialogDescription>
                  <Input
                    {...form.register("title")}
                    className="text-xl font-semibold border-none p-0 focus:ring-0 focus:border-none shadow-none bg-blue-50/40 hover:bg-blue-50/60 rounded-md px-2 transition-colors"
                    placeholder="Digite o título da tarefa"
                    data-testid="input-header-title"
                  />
                </>
              ) : (
                <>
                  <DialogTitle className="text-xl font-semibold text-gray-900" data-testid="dialog-title">
                    {task.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalhes da tarefa
                  </DialogDescription>
                </>
              )}
            </div>
            
            {/* Botões de ação organizados horizontalmente */}
            <div className="flex gap-1">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="w-8 h-8 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                  data-testid="button-edit-task"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                data-testid="button-delete-task"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-8 h-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                data-testid="button-close-task"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 pt-4" style={{ maxHeight: 'calc(80vh - 4rem)' }}>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Título</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o título da tarefa"
                        {...field}
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                        data-testid="input-edit-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite a descrição da tarefa"
                        {...field}
                        value={field.value || ""}
                        rows={3}
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors resize-none"
                        data-testid="input-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                            data-testid="select-edit-status"
                          >
                            <SelectValue placeholder="Selecione um status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="inprogress">Em Progresso</SelectItem>
                          <SelectItem value="review">Em Revisão</SelectItem>
                          <SelectItem value="done">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                            data-testid="select-edit-priority"
                          >
                            <SelectValue placeholder="Selecione uma prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Progresso (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          value={field.value?.toString() || "0"}
                          onChange={(e) => {
                            const value = e.target.value === "" ? 0 : parseInt(e.target.value);
                            field.onChange(isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100));
                          }}
                          className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                          data-testid="input-edit-progress"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                <MultiUserSelector
                  selectedUserIds={form.watch("assigneeIds") || []}
                  onUserSelectionChange={(userIds) => {
                    form.setValue("assigneeIds", userIds);
                  }}
                />
              </div>

              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                <TagSelector
                  selectedTags={form.watch("tags")}
                  onTagsChange={(tags) => form.setValue("tags", tags)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateTaskMutation.isPending}
                  className="bg-indigo-500 hover:bg-indigo-600 shadow-md hover:shadow-lg transition-all ring-2 ring-indigo-200"
                  data-testid="button-save-task"
                >
                  {updateTaskMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            {task.description && (
              <div>
                <p className="text-gray-600 leading-relaxed" data-testid="task-description">
                  {task.description}
                </p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors">
                  <Flag className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Prioridade:</span>
                  <Badge className={getPriorityColor(task.priority)} data-testid="task-priority">
                    {getPriorityText(task.priority)}
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors">
                  <Clock className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Status:</span>
                  <span className="font-medium text-gray-900 group-hover:text-gray-950 transition-colors" data-testid="task-status">
                    {getStatusText(task.status)}
                  </span>
                </div>

                {task.assigneeName && (
                  <div className="flex items-center space-x-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors">
                    <User className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Responsável:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                        <span className="text-white text-xs font-medium" data-testid="task-assignee-avatar">
                          {task.assigneeAvatar}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-gray-950 transition-colors" data-testid="task-assignee-name">
                        {task.assigneeName}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors">
                  <Calendar className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Criada em:</span>
                  <span className="font-medium text-gray-900 group-hover:text-gray-950 transition-colors" data-testid="task-created-date">
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors">
                  <Calendar className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Atualizada em:</span>
                  <span className="font-medium text-gray-900 group-hover:text-gray-950 transition-colors" data-testid="task-updated-date">
                    {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>

                {task.status === "inprogress" && task.progress !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors">
                      <span className="group-hover:text-gray-700 transition-colors">Progresso</span>
                      <span className="group-hover:text-gray-950 font-medium transition-colors" data-testid="task-progress-value">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-3" />
                  </div>
                )}
              </div>
            </div>

            {task.tags && task.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {allTags.filter(tag => task.tags?.includes(tag.name)).map((tag) => (
                      <Badge 
                        key={tag.id} 
                        variant="secondary" 
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          borderColor: `${tag.color}40`,
                        }}
                        data-testid={`task-tag-${tag.name}`}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Custom Fields Section */}
            {boardId && (
              <>
                <Separator />
                <TaskCustomFields taskId={task.id} boardId={boardId} />
              </>
            )}

            {/* Timeline Section */}
            <Separator />
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto hover:bg-gray-50"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                data-testid="button-toggle-history"
              >
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Histórico da Tarefa
                  </h4>
                </div>
                {isHistoryExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </Button>
              
              {isHistoryExpanded && (
                <div className="mt-3" data-testid="timeline-content">
                  <TaskTimeline taskId={task.id} />
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog - Outside the main dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteTaskMutation.mutate();
          setIsDeleteDialogOpen(false);
        }}
        isLoading={deleteTaskMutation.isPending}
      />
    </Dialog>
  );
}