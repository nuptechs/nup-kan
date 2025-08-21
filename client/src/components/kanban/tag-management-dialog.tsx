import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Edit2, Plus, Tag as TagIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTagSchema, type Tag, type InsertTag } from "@shared/schema";
import { z } from "zod";

interface TagManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertTagSchema.extend({
  color: z.string().min(1, "Cor é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

export function TagManagementDialog({ isOpen, onClose }: TagManagementDialogProps) {
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: InsertTag) => {
      const response = await apiRequest("POST", "/api/tags", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      form.reset();
      toast({
        title: "Sucesso",
        description: "Tag criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar tag. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tag> }) => {
      const response = await apiRequest("PATCH", `/api/tags/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setEditingTag(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Tag atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar tag. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/tags/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Sucesso",
        description: "Tag removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover tag. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, data });
    } else {
      createTagMutation.mutate(data);
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTag(tag);
    form.setValue("name", tag.name);
    form.setValue("color", tag.color);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    form.reset();
  };

  const handleDelete = (tagId: string) => {
    if (confirm("Tem certeza que deseja remover esta tag?")) {
      deleteTagMutation.mutate(tagId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="tag-management-dialog">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">
            <TagIcon className="inline mr-2" size={20} />
            Gerenciar Tags
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form for creating/editing tags */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o nome da tag"
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
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-16 h-10"
                          {...field}
                          data-testid="input-tag-color"
                        />
                        <Input
                          placeholder="#3b82f6"
                          value={field.value}
                          onChange={field.onChange}
                          className="flex-1"
                          data-testid="input-tag-color-text"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createTagMutation.isPending || updateTagMutation.isPending}
                  data-testid="button-save-tag"
                >
                  <Plus size={16} className="mr-2" />
                  {editingTag ? "Atualizar" : "Criar"} Tag
                </Button>
                {editingTag && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    data-testid="button-cancel-edit"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Form>

          {/* Existing tags list */}
          <div className="space-y-3">
            <Label>Tags Existentes</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tag criada ainda
                </p>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                    data-testid={`tag-item-${tag.name}`}
                  >
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-2"
                      style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(tag)}
                        data-testid={`button-edit-tag-${tag.name}`}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                        disabled={deleteTagMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-tag-${tag.name}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}