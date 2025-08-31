import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, Edit, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, type User } from "@shared/schema";
import { SUCCESS_MESSAGES } from "@/constants/successMessages";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { USER_LOGS, DEBUG_LOGS } from "@/constants/logMessages";

interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertUserSchema;
type FormData = z.infer<typeof formSchema>;

const statusOptions = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "offline", label: "Offline", color: "bg-gray-500" },
  { value: "away", label: "Ausente", color: "bg-yellow-500" },
  { value: "busy", label: "Ocupado", color: "bg-red-500" },
];

export function UserManagementDialog({ isOpen, onClose }: UserManagementDialogProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // SINGLE FORM: Reset clean when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEditingUser(null);
      form.reset({
        name: "",
        email: "",
        avatar: "",
        status: "offline",
      });
    }
  }, [isOpen]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      avatar: "",
      status: "offline",
    },
  });

  // SINGLE FORM PATTERN: Um formulário para criar E editar

  const createUserMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      
      // 1. Reset create form to clean state
      form.reset({
        name: "",
        email: "",

        avatar: "",
        status: "offline",
      });
      
      // 2. Close dialog
      onClose();
      
      // 3. Update cache
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // 4. Success message
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: SUCCESS_MESSAGES.AUTH.USER_CREATED,
      });
      
    },
    onError: (error: any) => {
      console.error(USER_LOGS.CREATE_ERROR(error));
      
      let errorMessage = "Falha ao criar usuário. Tente novamente.";
      
      if (error?.message?.includes("já está em uso") || 
          error?.message?.includes("already exists") ||
          error?.message?.includes("Email já está em uso")) {
        errorMessage = "Este email já está sendo usado por outro usuário. Escolha um email diferente.";
      }
      
      toast({
        title: "Erro na criação",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      console.log(DEBUG_LOGS.TRACE_MUTATION_START());
      console.log(DEBUG_LOGS.TRACE_ID(id));
      console.log(DEBUG_LOGS.TRACE_DATA(data));
      
      try {
        const response = await apiRequest("PATCH", `/api/users/${id}`, data);
        
        console.log(DEBUG_LOGS.TRACE_RESPONSE_STATUS(response.status));
        const result = await response.json();
        console.log(DEBUG_LOGS.TRACE_RESPONSE_JSON(result));
        
        return result;
      } catch (error) {
        console.log(DEBUG_LOGS.TRACE_ERROR(error));
        throw error;
      }
    },
    onSuccess: (data) => {
      try {
        console.log(DEBUG_LOGS.UPDATE_SUCCESS_START());
        
        // SINGLE FORM: Reset após sucesso
        console.log(DEBUG_LOGS.UPDATE_SUCCESS_CLEAR());
        setEditingUser(null);
        form.reset({
          name: "",
          email: "",
  
          avatar: "",
          status: "offline",
        });
        onClose();
        
        // 3. Invalidar cache em background
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        }, 100);
        
        // 4. Toast de sucesso
        toast({
          title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
          description: SUCCESS_MESSAGES.AUTH.USER_UPDATED,
        });
        
      } catch (error) {
        console.log(DEBUG_LOGS.TRACE_ERROR_SUCCESS(error));
      }
    },
    onError: (error) => {
      console.log(DEBUG_LOGS.TRACE_ERROR_MUTATION());
      
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
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
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/permissions-data"] })
      ]);
      
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: SUCCESS_MESSAGES.AUTH.USER_DELETED,
      });
    },
    onError: () => {
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.AUTH.USER_DELETE_FAILED,
        variant: "destructive",
      });
    },
  });

  // SINGLE FORM: Um handler para criar E editar
  const handleSubmit = (data: FormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    
    form.reset({
      name: user.name,
      email: user.email,
      avatar: user.avatar || "",
      status: user.status || "offline",
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    
    form.reset({
      name: "",
      email: "",
      avatar: "",
      status: "offline",
    });
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
          {/* Formulário ÚNICO para criar OU editar */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">
              {editingUser ? `Editar Usuário: ${editingUser.name}` : "Criar Novo Usuário"}
            </h3>
            
            {editingUser && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>Editando:</strong> {editingUser.email}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEdit}
                  className="mt-2"
                  data-testid="button-cancel-edit"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar Edição
                </Button>
              </div>
            )}
            
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
                data-testid={editingUser ? "edit-user-form" : "create-user-form"}
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome do usuário"
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
                            placeholder="email@exemplo.com"
                            type="email"
                            {...field}
                            data-testid="input-user-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "offline"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-status">
                              <SelectValue placeholder="Selecione o status" />
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  data-testid={editingUser ? "button-submit-edit-user" : "button-submit-create-user"}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) 
                    ? (editingUser ? "Atualizando..." : "Criando...")
                    : (editingUser ? "Atualizar Usuário" : "Criar Usuário")
                  }
                </Button>
              </form>
            </Form>
          </div>

          {/* Lista de usuários existentes */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Usuários Existentes</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Carregando usuários...</p>
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
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${
                      editingUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    data-testid={`user-item-${user.id}`}
                  >
                    {editingUser?.id === user.id ? (
                      <div className="flex-1 text-blue-800">
                        <p className="font-medium">
                          ✏️ Este usuário está sendo editado no formulário acima
                        </p>
                        <p className="text-sm text-blue-600">
                          Use o formulário no topo da tela para fazer as alterações
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                          {getStatusIcon(user.status || "offline")}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(user.id)}
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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