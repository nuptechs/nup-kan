import { CACHE_LOGS } from "@/constants/logMessages";
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
import type { User } from "@shared/schema";
import { SUCCESS_MESSAGES } from "@/constants/successMessages";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { TagSelector } from "./tag-selector";
import { MultiUserSelector } from "./multi-user-selector";
import { z } from "zod";
import { X } from "lucide-react";

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
  defaultColumnId?: string | null;
}

// Create base schema
const createFormSchema = (customFields: any[] = []) => {
  // Build dynamic custom fields validation
  const customFieldsSchema = customFields.reduce((schema, field) => {
    const fieldName = field.name;
    
    if (field.required === "true") {
      // Required field validation
      schema[fieldName] = z.string().min(1, `${field.label} é obrigatório`);
    } else {
      // Optional field
      schema[fieldName] = z.string().optional();
    }
    
    return schema;
  }, {} as Record<string, any>);

  return insertTaskSchema.extend({
    tags: z.array(z.string()).default([]),
    assigneeIds: z.array(z.string()).default([]),
    customFields: z.object(customFieldsSchema).optional(),
  });
};

// Base type for form data
type FormData = z.infer<typeof insertTaskSchema> & {
  tags: string[];
  assigneeIds: string[];
  customFields?: Record<string, string>;
};

export function AddTaskDialog({ isOpen, onClose, boardId, defaultColumnId }: AddTaskDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user's teams to fetch team members
  const { data: userTeams = [] } = useQuery<any[]>({
    queryKey: ["/api/auth/current-user"],
    select: (data: any) => data?.teams || []
  });
  
  // Get team members from user's teams
  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", userTeams.map((t: any) => t.id)],
    enabled: userTeams.length > 0,
    queryFn: async () => {
      if (userTeams.length === 0) return [];
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      return users.filter((user: any) => 
        userTeams.some((team: any) => 
          user.teams?.some((ut: any) => ut.teamId === team.id)
        )
      );
    }
  });

  // Get columns for this board to set the default status
  const columnsEndpoint = boardId ? `/api/boards/${boardId}/columns` : "/api/columns";
  const { data: columns = [] } = useQuery<any[]>({
    queryKey: [columnsEndpoint],
  });

  // Custom fields - desabilitado temporariamente (rota não implementada)
  const customFields: any[] = [];

  // Get the default status based on defaultColumnId or first column
  const getDefaultStatus = () => {
    if (defaultColumnId && columns.find(c => c.id === defaultColumnId)) {
      return defaultColumnId;
    }
    if (columns.length === 0) return "backlog";
    const firstColumn = columns.sort((a, b) => a.position - b.position)[0];
    
    // Use column ID directly as status - no more hardcoded mapping!
    return firstColumn.id;
  };

  // Create dynamic form schema based on custom fields
  const formSchema = createFormSchema(customFields);
  
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

  // Update resolver when custom fields change
  useEffect(() => {
    if (customFields.length >= 0) { // Allow for empty arrays too
      const newFormSchema = createFormSchema(customFields);
      form.clearErrors();
      // We don't need to reset the resolver as the form will handle it
    }
  }, [customFields]);

  // Reset form when dialog opens or when columns/custom fields change
  useEffect(() => {
    if (isOpen) {
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
  }, [columns, boardId, isOpen, defaultColumnId, customFields]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { assigneeIds, customFields: customFieldsData, ...restTaskData } = data;
      
      // Create the task first
      const response = await apiRequest("POST", "/api/tasks", restTaskData);
      const task = await response.json();
      
      // Add assignees if any were selected
      if (assigneeIds && assigneeIds.length > 0) {
        await apiRequest("PUT", `/api/tasks/${task.id}/assignees`, {
          userIds: assigneeIds,
        });
      }
      
      // Save custom fields if any were filled
      if (customFieldsData && Object.keys(customFieldsData).length > 0) {
        const customFieldPromises = Object.entries(customFieldsData)
          .filter(([_, value]) => value && value.toString().trim() !== '')
          .map(([fieldName, value]) => {
            const field = customFields.find((f: any) => f.name === fieldName);
            if (field) {
              return apiRequest("POST", `/api/tasks/${task.id}/custom-values`, {
                customFieldId: field.id,
                value: value.toString(),
              });
            }
          })
          .filter(Boolean);
          
        if (customFieldPromises.length > 0) {
          await Promise.all(customFieldPromises);
        }
      }
      
      return task;
    },
    onSuccess: async () => {
      // Use same endpoint logic as KanbanBoard
      const tasksEndpoint = boardId ? `/api/boards/${boardId}/tasks` : "/api/tasks";
      const columnsEndpoint = boardId ? `/api/boards/${boardId}/columns` : "/api/columns";
      
      // 🔄 FORÇAR INVALIDAÇÃO COMPLETA - Corrigir problema de cache
      await queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
      await queryClient.invalidateQueries({ queryKey: [columnsEndpoint] });
      await queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      // 🚀 FORÇAR REFETCH IMEDIATO das tasks
      await queryClient.refetchQueries({ queryKey: [tasksEndpoint] });
      
      console.log(CACHE_LOGS.INVALIDATED({ tasksEndpoint, columnsEndpoint }));
      
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: SUCCESS_MESSAGES.TASKS.CREATED,
        duration: 2500,
      });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.TASKS.CREATE_FAILED,
        variant: "destructive",
        duration: 2500,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden [&>button]:hidden p-0 flex flex-col" data-testid="add-task-dialog">
        <DialogHeader className="sr-only">
          <DialogTitle data-testid="dialog-title">Adicionar Nova Tarefa</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Preencha os campos para criar uma nova tarefa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Cabeçalho fixo com título e botões */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-slate-700">Título</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            className="text-xl font-semibold border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white px-3 py-2 rounded-md transition-colors"
                            placeholder="Digite o título da tarefa"
                            data-testid="input-header-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex gap-1">
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

            {/* Conteúdo principal com overflow */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4" style={{ maxHeight: 'calc(80vh - 4rem)' }}>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição (opcional)"
                      {...field}
                      value={field.value || ""}
                      className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors resize-none"
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
                    <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                          data-testid="select-priority"
                        >
                          <SelectValue placeholder="Prioridade" />
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
                    <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">Coluna</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                          data-testid="select-status"
                        >
                          <SelectValue placeholder="Coluna" />
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

            <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
              <MultiUserSelector
                selectedUserIds={form.watch("assigneeIds")}
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

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Campos Personalizados</h4>
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`customFields.${field.name}`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-700 mb-1.5">
                              {field.label}
                              {field.required === "true" && <span className="text-red-500 ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              <>
                                {field.type === "text" && (
                                  <Input
                                    {...formField}
                                    placeholder={field.placeholder || field.label}
                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                                    data-testid={`input-custom-${field.name}`}
                                  />
                                )}
                                {field.type === "textarea" && (
                                  <Textarea
                                    {...formField}
                                    placeholder={field.placeholder || field.label}
                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors resize-none"
                                    data-testid={`textarea-custom-${field.name}`}
                                  />
                                )}
                                {field.type === "select" && field.options && field.options.length > 0 && (
                                  <Select onValueChange={formField.onChange} value={formField.value || ""}>
                                    <SelectTrigger 
                                      className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                                      data-testid={`select-custom-${field.name}`}
                                    >
                                      <SelectValue placeholder={field.placeholder || field.label} />
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
                                    placeholder={field.placeholder || field.label}
                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                                    data-testid={`input-number-custom-${field.name}`}
                                  />
                                )}
                                {field.type === "date" && (
                                  <Input
                                    {...formField}
                                    type="date"
                                    placeholder={field.placeholder || field.label}
                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                                    data-testid={`input-date-custom-${field.name}`}
                                  />
                                )}
                                {field.type === "email" && (
                                  <Input
                                    {...formField}
                                    type="email"
                                    placeholder={field.placeholder || "email@exemplo.com"}
                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                                    data-testid={`input-email-custom-${field.name}`}
                                  />
                                )}
                                {field.type === "url" && (
                                  <Input
                                    {...formField}
                                    type="url"
                                    placeholder={field.placeholder || "https://..."}
                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                                    data-testid={`input-url-custom-${field.name}`}
                                  />
                                )}
                              </>
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
                  className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="bg-indigo-500 hover:bg-indigo-600 shadow-md hover:shadow-lg transition-all ring-2 ring-indigo-200"
                  data-testid="button-create-task"
                >
                  {createTaskMutation.isPending ? "Criando..." : "Criar Tarefa"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
