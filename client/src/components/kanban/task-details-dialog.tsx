import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type { Task, TeamMember } from "@shared/schema";
import { z } from "zod";
import { Edit, Trash2, User, Calendar, Clock, Flag, X } from "lucide-react";

interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = updateTaskSchema.extend({
  assigneeId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function TaskDetailsDialog({ task, isOpen, onClose }: TaskDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
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
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId || "",
        progress: task.progress || 0,
      });
    }
  }, [task, form]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!task) return;
      
      const assignee = teamMembers.find(member => member.id === data.assigneeId);
      const taskData = {
        ...data,
        assigneeName: assignee?.name || "",
        assigneeAvatar: assignee?.avatar || "",
      };
      
      const response = await apiRequest("PATCH", `/api/tasks/${task.id}`, taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });
      setIsEditing(false);
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
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="task-details-dialog">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold" data-testid="dialog-title">
              {isEditing ? "Editar Tarefa" : "Detalhes da Tarefa"}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  data-testid="button-edit-task"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-red-400 hover:text-red-600"
                    data-testid="button-delete-task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTaskMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={deleteTaskMutation.isPending}
                    >
                      {deleteTaskMutation.isPending ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
                data-testid="button-close-dialog"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o título da tarefa"
                        {...field}
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva a tarefa em detalhes"
                        rows={4}
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-priority">
                            <SelectValue placeholder="Selecione a prioridade" />
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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue placeholder="Selecione o status" />
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
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progresso (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-progress"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-assignee">
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sem responsável</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {member.avatar}
                                </span>
                              </div>
                              <span>{member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateTaskMutation.isPending}
                  className="bg-indigo-500 hover:bg-indigo-600"
                  data-testid="button-save-task"
                >
                  {updateTaskMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="task-title">
                {task.title}
              </h2>
              {task.description && (
                <p className="text-gray-600 leading-relaxed" data-testid="task-description">
                  {task.description}
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Flag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Prioridade:</span>
                  <Badge className={getPriorityColor(task.priority)} data-testid="task-priority">
                    {getPriorityText(task.priority)}
                  </Badge>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="font-medium text-gray-900" data-testid="task-status">
                    {getStatusText(task.status)}
                  </span>
                </div>

                {task.assigneeName && (
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Responsável:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium" data-testid="task-assignee-avatar">
                          {task.assigneeAvatar}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900" data-testid="task-assignee-name">
                        {task.assigneeName}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Criada em:</span>
                  <span className="font-medium text-gray-900" data-testid="task-created-date">
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Atualizada em:</span>
                  <span className="font-medium text-gray-900" data-testid="task-updated-date">
                    {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>

                {task.status === "inprogress" && task.progress !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progresso</span>
                      <span data-testid="task-progress-value">{task.progress}%</span>
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
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs" data-testid={`task-tag-${index}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}