import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertColumnSchema, type Column } from "@shared/schema";
import { Plus, Edit2, Trash2, Check, X, Columns, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { z } from "zod";

interface ColumnManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  editingColumn?: Column | null;
}

const formSchema = insertColumnSchema;
type FormData = z.infer<typeof formSchema>;

export function ColumnManagementDialog({ isOpen, onClose, boardId, editingColumn: externalEditingColumn }: ColumnManagementDialogProps) {
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: columns = [], isLoading } = useQuery<Column[]>({
    queryKey: [`/api/boards/${boardId}/columns`],
    enabled: !!boardId,
  });
  

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      boardId: boardId,
      position: 0,
      wipLimit: null,
      color: "#3b82f6",
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      position: 0,
      wipLimit: null,
      color: "#3b82f6",
    },
  });

  // Quando uma coluna externa for passada para edição, configure o formulário
  useEffect(() => {
    if (externalEditingColumn && isOpen) {
      setEditingColumn(externalEditingColumn);
      editForm.reset({
        title: externalEditingColumn.title,
        position: externalEditingColumn.position,
        wipLimit: externalEditingColumn.wipLimit,
        color: externalEditingColumn.color,
        boardId: externalEditingColumn.boardId,
      });
    } else if (!isOpen) {
      setEditingColumn(null);
      editForm.reset();
    }
  }, [externalEditingColumn, isOpen, editForm]);

  const createColumnMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const columnData = {
        ...data,
        boardId,
        position: columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 0,
      };
      return await apiRequest("POST", "/api/columns", columnData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      toast({
        title: "Sucesso",
        description: "Coluna criada com sucesso!",
        duration: 3000,
      });
      form.reset();
      onClose(); // Fecha a modal automaticamente
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar coluna. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      return await apiRequest("PATCH", `/api/columns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      toast({
        title: "Sucesso",
        description: "Coluna atualizada com sucesso!",
        duration: 3000,
      });
      setEditingColumn(null);
      editForm.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar coluna. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const response = await apiRequest("DELETE", `/api/columns/${columnId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso! As tarefas foram movidas para o Backlog.",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir coluna. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const reorderColumnMutation = useMutation({
    mutationFn: async (reorderedColumns: { id: string; position: number }[]) => {
      return await apiRequest("POST", "/api/columns/reorder", { columns: reorderedColumns });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/columns`] });
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao reordenar colunas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: FormData) => {
    createColumnMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (editingColumn) {
      updateColumnMutation.mutate({ id: editingColumn.id, data });
    }
  };

  const startEdit = (column: Column) => {
    setEditingColumn(column);
    editForm.reset({
      title: column.title,
      position: column.position,
      wipLimit: column.wipLimit,
      color: column.color,
    });
  };

  const cancelEdit = () => {
    setEditingColumn(null);
    editForm.reset();
  };

  const handleDelete = (columnId: string) => {
    deleteColumnMutation.mutate(columnId);
  };

  const moveColumn = (columnId: string, direction: 'up' | 'down') => {
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const currentIndex = sortedColumns.findIndex(c => c.id === columnId);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedColumns.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reorderedColumns = [...sortedColumns];
    [reorderedColumns[currentIndex], reorderedColumns[newIndex]] = 
    [reorderedColumns[newIndex], reorderedColumns[currentIndex]];

    const updates = reorderedColumns.map((col, index) => ({
      id: col.id,
      position: index,
    }));

    reorderColumnMutation.mutate(updates);
  };

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" data-testid="column-management-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Columns className="w-5 h-5" />
            Colunas
          </DialogTitle>
          <DialogDescription>
            Crie, edite, exclua ou reordene as colunas do seu quadro Kanban.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário para criar nova coluna */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">Nova Coluna</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da Coluna</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Em Análise, Testing, etc."
                            {...field}
                            data-testid="input-column-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <Input
                            type="color"
                            {...field}
                            className="h-10 w-full"
                            data-testid="input-column-color"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wipLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite WIP (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Ex: 3"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-column-wip-limit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createColumnMutation.isPending}
                  className="w-full"
                  data-testid="button-create-column"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createColumnMutation.isPending ? "Criando..." : "Criar Coluna"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Lista de colunas existentes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Colunas Existentes</h3>
            
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                Carregando colunas...
              </div>
            ) : sortedColumns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma coluna cadastrada ainda.</p>
                <p className="text-sm">Crie a primeira coluna usando o formulário acima.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedColumns.map((column, index) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    data-testid={`column-item-${column.id}`}
                  >
                    {editingColumn?.id === column.id ? (
                      <Form {...editForm}>
                        <form 
                          onSubmit={editForm.handleSubmit(onEditSubmit)} 
                          className="flex items-center space-x-3 flex-1"
                        >
                          <FormField
                            control={editForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="h-8"
                                    placeholder="Título da coluna"
                                    data-testid={`input-edit-column-title-${column.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem className="w-16">
                                <FormControl>
                                  <Input
                                    type="color"
                                    {...field}
                                    className="h-8 w-full p-1"
                                    data-testid={`input-edit-column-color-${column.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="wipLimit"
                            render={({ field }) => (
                              <FormItem className="w-20">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                    className="h-8"
                                    placeholder="WIP"
                                    data-testid={`input-edit-column-wip-${column.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex space-x-1">
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                              disabled={updateColumnMutation.isPending}
                              data-testid={`button-save-column-${column.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                              onClick={cancelEdit}
                              data-testid={`button-cancel-edit-column-${column.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <>
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: column.color }}
                            />
                            <span className="font-medium">{column.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Posição: {column.position}
                            </Badge>
                            {column.wipLimit && (
                              <Badge variant="secondary" className="text-xs">
                                WIP: {column.wipLimit}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                            onClick={() => moveColumn(column.id, 'up')}
                            disabled={index === 0 || reorderColumnMutation.isPending}
                            data-testid={`button-move-column-up-${column.id}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                            onClick={() => moveColumn(column.id, 'down')}
                            disabled={index === sortedColumns.length - 1 || reorderColumnMutation.isPending}
                            data-testid={`button-move-column-down-${column.id}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => startEdit(column)}
                            data-testid={`button-edit-column-${column.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                data-testid={`button-delete-column-${column.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-testid={`dialog-delete-column-${column.id}`}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Coluna</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a coluna "{column.title}"? 
                                  Esta ação não pode ser desfeita e todas as tarefas desta coluna 
                                  serão movidas para o Backlog.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-column-${column.id}`}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(column.id)}
                                  disabled={deleteColumnMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-column-${column.id}`}
                                >
                                  {deleteColumnMutation.isPending ? "Excluindo..." : "Excluir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}