import React, { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { SettingsPanel } from "@/components/kanban/settings-panel";
import { UserProfileIndicator } from "@/components/user-profile-indicator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Users, Clock, TrendingUp, Shield, User, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePermissions } from "@/hooks/usePermissions";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Slogan N_1755824338969.png";
import type { Board } from "@shared/schema";

interface KanbanPageProps {
  params: { boardId: string };
}

const boardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  color: z.string().default("#3b82f6"),
});

type BoardFormData = z.infer<typeof boardSchema>;

export default function KanbanPage({ params }: KanbanPageProps) {
  const { boardId } = params;
  const [, navigate] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { canManageProfiles } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load board data
  const { data: board, isLoading: isLoadingBoard } = useQuery<Board>({
    queryKey: ["/api/boards", boardId],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
  });

  // Form for editing board
  const form = useForm<BoardFormData>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      name: board?.name || "",
      description: board?.description || "",
      color: board?.color || "#3b82f6",
    },
  });

  // Reset form when board data changes using useEffect
  React.useEffect(() => {
    if (board && !isLoadingBoard) {
      form.reset({
        name: board.name,
        description: board.description || "",
        color: board.color,
      });
    }
  }, [board, isLoadingBoard, form]);

  // Edit board mutation
  const editBoardMutation = useMutation({
    mutationFn: async (data: BoardFormData) => {
      return await apiRequest(`/api/boards/${boardId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setIsEditOpen(false);
      toast({
        title: "Board atualizado",
        description: "As informações do board foram atualizadas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar board. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/boards/${boardId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Board excluído",
        description: "O board foi excluído com sucesso!",
      });
      navigate("/"); // Redirect to board selection
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir board. Tente novamente.",
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

  // Show loading state while board data is loading
  if (isLoadingBoard) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando board...</p>
        </div>
      </div>
    );
  }

  // Show error if board not found
  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Board não encontrado</h2>
          <p className="text-gray-600 mb-4">O board solicitado não existe ou foi removido.</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Boards
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-bg-main relative" data-testid="kanban-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between" data-testid="header">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              data-testid="button-back-to-boards"
              title="Voltar aos Boards"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <img 
              src={logoImage} 
              alt="Logo uP"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">
              {board.name}
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span data-testid="team-count">{(teamMembers as any)?.length || 0} membros</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          
          {/* Admin Permissions Button */}
          {canManageProfiles && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/admin/permissions"}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              data-testid="button-admin-permissions"
              title="Gerenciar Permissões"
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}

          {/* User Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/settings"}
            className="p-2 text-gray-400 hover:text-gray-600"
            data-testid="button-user-settings"
            title="Configurações do Usuário"
          >
            <User className="w-4 h-4" />
          </Button>

          {/* Edit Board Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="p-2 text-gray-400 hover:text-blue-600"
            data-testid="button-edit-board"
            title="Editar Board"
          >
            <Edit className="w-4 h-4" />
          </Button>

          {/* Delete Board Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="p-2 text-gray-400 hover:text-red-600"
            data-testid="button-delete-board"
            title="Excluir Board"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          
          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Kanban Board */}
      <main className="flex-1 overflow-hidden h-full" data-testid="main-content">
        <KanbanBoard boardId={boardId} />
      </main>

      {/* User Profile Indicator - Fixed Bottom Left */}
      <div className="fixed bottom-4 left-4 z-10">
        <UserProfileIndicator />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Edit Board Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="edit-board-dialog">
          <DialogHeader>
            <DialogTitle>Editar Board</DialogTitle>
            <DialogDescription>
              Altere as informações do seu board.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => editBoardMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Board</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do board..."
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do board..."
                        className="min-h-[60px] resize-none"
                        {...field}
                        data-testid="input-board-description"
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
                    <FormLabel>Cor do Board</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-6 gap-3">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`
                              w-10 h-10 rounded-lg border-2 transition-all
                              ${color.class}
                              ${field.value === color.value 
                                ? 'border-gray-900 scale-110' 
                                : 'border-gray-300 hover:border-gray-500'
                              }
                            `}
                            title={color.label}
                            data-testid={`color-option-${color.label.toLowerCase()}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={editBoardMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editBoardMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editBoardMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Board Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="delete-board-dialog">
          <DialogHeader>
            <DialogTitle>Excluir Board</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o board "{board?.name}"? 
              Esta ação é irreversível e todas as tarefas serão perdidas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteBoardMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteBoardMutation.mutate()}
              disabled={deleteBoardMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteBoardMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
