import { useState } from "react";
import { Plus, Grid, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Board } from "@shared/schema";

const boardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  color: z.string().default("#3b82f6"),
});

type BoardFormData = z.infer<typeof boardSchema>;

export default function BoardSelection() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const { data: currentUser } = useQuery<{ id: string; name: string; email: string }>({
    queryKey: ["/api/users/me"],
  });

  const form = useForm<BoardFormData>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
    },
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: BoardFormData) => {
      return await apiRequest("/api/boards", "POST", {
        ...data,
        createdById: currentUser?.id || "system",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Board criado",
        description: "Novo board Kanban criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar board. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const colorOptions = [
    { value: "#3b82f6", label: "Azul", class: "bg-blue-500" },
    { value: "#10b981", label: "Verde", class: "bg-green-500" },
    { value: "#f59e0b", label: "Laranja", class: "bg-orange-500" },
    { value: "#ef4444", label: "Vermelho", class: "bg-red-500" },
    { value: "#8b5cf6", label: "Roxo", class: "bg-purple-500" },
    { value: "#06b6d4", label: "Ciano", class: "bg-cyan-500" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Grid className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                uP - Kan
              </h1>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-board"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Board
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Seus Boards Kanban
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Selecione um board para gerenciar suas tarefas ou crie um novo para organizar projetos diferentes.
          </p>
        </div>

        {/* Boards Grid */}
        {boards && boards.length === 0 ? (
          <div className="text-center py-12">
            <Grid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum board encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crie seu primeiro board Kanban para começar a organizar suas tarefas.
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-first-board"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards?.map((board) => (
              <Card
                key={board.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                data-testid={`card-board-${board.id}`}
              >
                <Link href={`/kanban/${board.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: board.color }}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {board.name}
                      </h3>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-status-${board.id}`}>
                      {board.isActive === "true" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  
                  {board.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Criado em {new Date(board.createdAt || new Date()).toLocaleDateString("pt-BR")}
                    </span>
                    <Settings className="w-4 h-4" />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-board">
          <DialogHeader>
            <DialogTitle>Criar Novo Board</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createBoardMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Board</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Desenvolvimento Mobile"
                        {...field}
                        data-testid="input-board-name"
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
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o propósito deste board..."
                        rows={3}
                        {...field}
                        data-testid="textarea-board-description"
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
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`w-8 h-8 rounded-full ${color.class} ${
                              field.value === color.value
                                ? "ring-2 ring-offset-2 ring-blue-500"
                                : "hover:scale-110"
                            } transition-all`}
                            title={color.label}
                            data-testid={`button-color-${color.value}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createBoardMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-submit-create"
                >
                  {createBoardMutation.isPending ? "Criando..." : "Criar Board"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}