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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SUCCESS_MESSAGES } from "@/constants/successMessages";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { insertTagSchema, type Tag } from "@shared/schema";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { z } from "zod";

interface TagManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertTagSchema;
type FormData = z.infer<typeof formSchema>;

export function TagManagementDialog({ isOpen, onClose }: TagManagementDialogProps) {
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    enabled: isOpen, // Só busca quando o dialog está aberto
  });

  // ✅ PROTEÇÃO CONTRA NULL
  const safeTags = Array.isArray(tags) ? tags : [];

  // SINGLE FORM: Um único formulário para criar e editar
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#3B82F6",
    },
  });

  // Limpar estado quando o dialog fecha
  useEffect(() => {
    if (!isOpen) {
      setEditingTag(null);
      form.reset({
        name: "",
        color: "#3B82F6",
      });
    }
  }, [isOpen, form]);

  const createTagMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/tags", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: "Tag criada com sucesso!",
        duration: 2500,
      });
      if (!editingTag) {
        form.reset();
      }
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.TAGS.CREATE_FAILED,
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/tags/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: "Tag atualizada com sucesso!",
        duration: 2500,
      });
      setEditingTag(null);
      form.reset();
      onClose(); // Fecha a modal automaticamente
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.TAGS.UPDATE_FAILED,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const response = await apiRequest("DELETE", `/api/tags/${tagId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: "Tag excluída com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.TAGS.DELETE_FAILED,
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: FormData) => {
    createTagMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, data });
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    form.reset({
      name: tag.name,
      color: tag.color,
    });
  };

  const cancelEdit = () => {
    setEditingTag(null);
    form.reset({
      name: "",
      color: "#3B82F6",
    });
  };

  const handleDelete = (tagId: string) => {
    deleteTagMutation.mutate(tagId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="tag-management-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Gerenciar Tags
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gerencie tags para organizar tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário para criar nova tag */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">Criar Nova Tag</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome da Tag</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome da tag"
                            {...field}
                            data-testid="input-tag-name"
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
                          <div className="flex items-center space-x-2">
                            <Input
                              type="color"
                              {...field}
                              className="w-16 h-10 p-1 rounded"
                              data-testid="input-tag-color"
                            />
                            <Badge 
                              style={{ backgroundColor: field.value, color: '#fff' }}
                              className="text-xs"
                            >
                              Preview
                            </Badge>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createTagMutation.isPending}
                  className="w-full"
                  data-testid="button-create-tag"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createTagMutation.isPending ? "Criando..." : "Criar Tag"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Lista de tags existentes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tags Existentes</h3>
            
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                Carregando tags...
              </div>
            ) : safeTags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhuma tag criada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {safeTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    data-testid={`tag-item-${tag.id}`}
                  >
                    {editingTag?.id === tag.id ? (
                      <Form {...form}>
                        <form 
                          onSubmit={form.handleSubmit(onEditSubmit)} 
                          className="flex items-center space-x-2 flex-1"
                        >
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="h-8"
                                    data-testid={`input-edit-tag-name-${tag.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="color"
                                    {...field}
                                    className="w-10 h-8 p-1 rounded"
                                    data-testid={`input-edit-tag-color-${tag.id}`}
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
                              disabled={updateTagMutation.isPending}
                              data-testid={`button-save-tag-${tag.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                              onClick={cancelEdit}
                              data-testid={`button-cancel-edit-tag-${tag.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3">
                          <Badge
                            style={{ backgroundColor: tag.color, color: '#fff' }}
                            className="text-xs"
                            data-testid={`tag-badge-${tag.id}`}
                          >
                            {tag.name}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {tag.color}
                          </span>
                        </div>

                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => startEdit(tag)}
                            data-testid={`button-edit-tag-${tag.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                data-testid={`button-delete-tag-${tag.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-testid={`dialog-delete-tag-${tag.id}`}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a tag "{tag.name}"? 
                                  Esta ação não pode ser desfeita e a tag será removida de todas as tarefas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-tag-${tag.id}`}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(tag.id)}
                                  disabled={deleteTagMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-tag-${tag.id}`}
                                >
                                  {deleteTagMutation.isPending ? "Excluindo..." : "Excluir"}
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