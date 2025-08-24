import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "@shared/schema";
import type { TeamMember } from "@shared/schema";
import { TagSelector } from "./tag-selector";
import { MultiUserSelector } from "./multi-user-selector";
import { z } from "zod";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
}

const formSchema = insertTaskSchema.extend({
  tags: z.array(z.string()).default([]),
  assigneeIds: z.array(z.string()).default([]),
  customFields: z.record(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function AddTaskDialog({ isOpen, onClose, boardId }: AddTaskDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  // Get columns for this board to set the default status
  const columnsEndpoint = boardId ? `/api/boards/${boardId}/columns` : "/api/columns";
  const { data: columns = [] } = useQuery<any[]>({
    queryKey: [columnsEndpoint],
  });

  // Get custom fields for this board
  const customFieldsEndpoint = boardId ? `/api/custom-fields?boardId=${boardId}` : "/api/custom-fields";
  const { data: customFields = [] } = useQuery<any[]>({
    queryKey: [customFieldsEndpoint],
    enabled: !!boardId,
  });

  // Get the first column's status for default value
  const getDefaultStatus = () => {
    if (columns.length === 0) return "backlog";
    const firstColumn = columns.sort((a, b) => a.position - b.position)[0];
    
    // Convert column title to status format
    const statusMap: Record<string, string> = {
      "Backlog": "backlog",
      "To Do": "todo", 
      "In Progress": "inprogress",
      "Review": "review",
      "Done": "done"
    };
    
    return statusMap[firstColumn.title] || firstColumn.title.toLowerCase().replace(/\s+/g, '');
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: getDefaultStatus(),
      priority: "medium",
      assigneeId: "",
      progress: 0,
      tags: [],
      assigneeIds: [],
      boardId: boardId || "",
      customFields: {},
    },
  });

  // Reset form with updated default status when columns change
  useEffect(() => {
    if (columns.length > 0) {
      form.reset({
        title: "",
        description: "",
        status: getDefaultStatus(),
        priority: "medium",
        assigneeId: "",
        progress: 0,
        tags: [],
        assigneeIds: [],
        boardId: boardId || "",
        customFields: {},
      });
    }
  }, [columns, form, boardId]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { assigneeIds, ...restTaskData } = data;
      
      // Create the task first
      const response = await apiRequest("POST", "/api/tasks", restTaskData);
      const task = await response.json();
      
      // Add assignees if any were selected
      if (assigneeIds && assigneeIds.length > 0) {
        await apiRequest("PUT", `/api/tasks/${task.id}/assignees`, {
          userIds: assigneeIds,
        });
      }
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      // Invalidate board-specific queries
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/tasks`] });
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      }
      // Invalidate assignees queries for new task
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] z-[9999]" data-testid="add-task-dialog">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Adicionar Nova Tarefa</DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para criar uma nova tarefa no sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      data-testid="input-title"
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
                      {...field}
                      value={field.value || ""}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
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
                    <FormLabel>Coluna</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Selecione a coluna" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="inprogress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <MultiUserSelector
              selectedUserIds={form.watch("assigneeIds")}
              onUserSelectionChange={(userIds) => {
                form.setValue("assigneeIds", userIds);
              }}
            />

            <TagSelector
              selectedTags={form.watch("tags")}
              onTagsChange={(tags) => form.setValue("tags", tags)}
            />

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Campos Personalizados</h4>
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`customFields.${field.name}`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>
                              {field.label}
                              {field.required === "true" && <span className="text-red-500 ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              {field.type === "text" && (
                                <Input
                                  {...formField}
                                  placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                                  data-testid={`input-custom-${field.name}`}
                                />
                              )}
                              {field.type === "textarea" && (
                                <Textarea
                                  {...formField}
                                  placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                                  data-testid={`textarea-custom-${field.name}`}
                                />
                              )}
                              {field.type === "select" && field.options && field.options.length > 0 && (
                                <Select onValueChange={formField.onChange} value={formField.value || ""}>
                                  <SelectTrigger data-testid={`select-custom-${field.name}`}>
                                    <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options.map((option: string) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {field.type === "number" && (
                                <Input
                                  {...formField}
                                  type="number"
                                  placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                                  data-testid={`input-number-custom-${field.name}`}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="bg-indigo-500 hover:bg-indigo-600"
                data-testid="button-create-task"
              >
                {createTaskMutation.isPending ? "Criando..." : "Criar Tarefa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
