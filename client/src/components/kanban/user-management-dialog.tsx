import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, type User } from "@shared/schema";
import { Plus, Edit2, Trash2, Check, X, Users, Mail, UserCircle, Activity } from "lucide-react";
import { z } from "zod";

interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertUserSchema;
type FormData = z.infer<typeof formSchema>;

const statusOptions = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "busy", label: "Ocupado", color: "bg-yellow-500" },
  { value: "offline", label: "Offline", color: "bg-gray-500" }
];

export function UserManagementDialog({ isOpen, onClose }: UserManagementDialogProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      avatar: "",
      status: "offline",
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      avatar: "",
      status: "offline",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      // Fechar modal IMEDIATAMENTE
      form.reset();
      onClose();
      
      // Invalidações e toast em paralelo (não bloqueia UI)
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/permissions-data"] })
      ]);
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Sair do modo edição IMEDIATAMENTE
      setEditingUser(null);
      editForm.reset();
      
      // Fechar modal IMEDIATAMENTE
      onClose();
      
      // Invalidações e toast em paralelo (não bloqueia UI)
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/permissions-data"] })
      ]);
      
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidações e toast em paralelo (não bloqueia UI)
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/permissions-data"] })
      ]);
      
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: FormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role || "",
      avatar: user.avatar || "",
      status: user.status || "offline",
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    editForm.reset();
  };

  const handleDelete = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const getStatusIcon = (status: string) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusConfig?.color || 'bg-gray-500'}`} />
        <span className="text-sm">{statusConfig?.label || status}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" data-testid="user-management-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gerenciar Usuários
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gerencie usuários do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário para criar novo usuário */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">Criar Novo Usuário</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome"
                            {...field}
                            data-testid="input-user-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Email"
                            {...field}
                            data-testid="input-user-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Cargo"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-user-role"
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-status">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${option.color}`} />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="w-full"
                  data-testid="button-create-user"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Lista de usuários existentes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Usuários Existentes</h3>
            
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum usuário cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    data-testid={`user-item-${user.id}`}
                  >
                    {editingUser?.id === user.id ? (
                      <Form {...editForm}>
                        <form 
                          onSubmit={editForm.handleSubmit(onEditSubmit)} 
                          className="flex items-center space-x-3 flex-1"
                        >
                          <FormField
                            control={editForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="h-8"
                                    placeholder="Nome"
                                    data-testid={`input-edit-user-name-${user.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    className="h-8"
                                    placeholder="Email"
                                    data-testid={`input-edit-user-email-${user.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem className="w-40">
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value || ""}
                                    className="h-8"
                                    placeholder="Cargo"
                                    data-testid={`input-edit-user-role-${user.id}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem className="w-32">
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-8" data-testid={`select-edit-user-status-${user.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {statusOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${option.color}`} />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <div className="flex space-x-1">
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                              disabled={updateUserMutation.isPending}
                              data-testid={`button-save-user-${user.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                              onClick={cancelEdit}
                              data-testid={`button-cancel-edit-user-${user.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <>
                        <div className="flex items-center space-x-4 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{user.name}</span>
                              {getStatusIcon(user.status || "offline")}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                              {user.role && (
                                <div className="flex items-center gap-1">
                                  <UserCircle className="w-3 h-3" />
                                  {user.role}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => startEdit(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-testid={`dialog-delete-user-${user.id}`}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário "{user.name}"? 
                                  Esta ação não pode ser desfeita e o usuário será removido de todas as tarefas atribuídas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-user-${user.id}`}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-user-${user.id}`}
                                >
                                  {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
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