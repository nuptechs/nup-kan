import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Share2, Users2, User, Trash2, Edit, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Board, User as UserType, Team, BoardShare } from "@shared/schema";

interface BoardSharingDialogProps {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shareSchema = z.object({
  shareType: z.enum(["user", "team"]),
  shareWithId: z.string().min(1, "Selecione um usuário ou time"),
  permission: z.enum(["view", "edit", "admin"]).default("view"),
});

type ShareFormData = z.infer<typeof shareSchema>;

interface BoardShareWithDetails extends BoardShare {
  shareName?: string;
  shareEmail?: string;
  shareColor?: string;
}

export function BoardSharingDialog({ board, open, onOpenChange }: BoardSharingDialogProps) {
  const [shareType, setShareType] = useState<"user" | "team">("user");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      shareType: "user",
      shareWithId: "",
      permission: "view",
    },
  });

  // Queries
  const { data: shares = [] } = useQuery<BoardShare[]>({
    queryKey: [`/api/boards/${board.id}/shares`],
    enabled: open,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: open,
  });

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me"],
  });

  // Mutations
  const createShareMutation = useMutation({
    mutationFn: async (data: ShareFormData) => {
      const response = await apiRequest("POST", "/api/board-shares", {
        ...data,
        boardId: board.id,
        sharedByUserId: currentUser?.id || "system",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/shares`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/member-count`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/members`] });
      form.reset();
      toast({
        title: "Board compartilhado",
        description: "O board foi compartilhado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao compartilhar board. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      await apiRequest("DELETE", `/api/board-shares/${shareId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/shares`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/member-count`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/members`] });
      toast({
        title: "Compartilhamento removido",
        description: "O acesso ao board foi removido.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover compartilhamento.",
        variant: "destructive",
      });
    },
  });

  const updateShareMutation = useMutation({
    mutationFn: async ({ shareId, permission }: { shareId: string; permission: string }) => {
      await apiRequest("PATCH", `/api/board-shares/${shareId}`, { permission });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/shares`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/member-count`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${board.id}/members`] });
      toast({
        title: "Permissão atualizada",
        description: "A permissão foi alterada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ShareFormData) => {
    createShareMutation.mutate(data);
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case "view": return <Eye className="w-3 h-3" />;
      case "edit": return <Edit className="w-3 h-3" />;
      case "admin": return <Lock className="w-3 h-3" />;
      default: return <Eye className="w-3 h-3" />;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case "view": return "bg-blue-100 text-blue-800";
      case "edit": return "bg-green-100 text-green-800";
      case "admin": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getShareDetails = (share: BoardShare): BoardShareWithDetails => {
    if (share.shareType === "user") {
      const user = users.find(u => u.id === share.shareWithId);
      return {
        ...share,
        shareName: user?.name || "Usuário não encontrado",
        shareEmail: user?.email,
      };
    } else {
      const team = teams.find(t => t.id === share.shareWithId);
      return {
        ...share,
        shareName: team?.name || "Time não encontrado",
        shareColor: team?.color,
      };
    }
  };

  const availableUsers = users.filter(user => 
    !shares.some(share => share.shareType === "user" && share.shareWithId === user.id)
  );

  const availableTeams = teams.filter(team => 
    !shares.some(share => share.shareType === "team" && share.shareWithId === team.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="board-sharing-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Compartilhar Board: {board.name}
          </DialogTitle>
          <DialogDescription>
            Compartilhe este board com usuários ou times específicos e controle suas permissões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form for adding new share */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shareType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Compartilhamento</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setShareType(value as "user" | "team");
                              form.setValue("shareWithId", "");
                            }}
                          >
                            <SelectTrigger data-testid="select-share-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Usuário Individual
                                </div>
                              </SelectItem>
                              <SelectItem value="team">
                                <div className="flex items-center gap-2">
                                  <Users2 className="w-4 h-4" />
                                  Time Completo
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shareWithId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {shareType === "user" ? "Selecionar Usuário" : "Selecionar Time"}
                        </FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-share-target">
                              <SelectValue placeholder={
                                shareType === "user" 
                                  ? "Escolha um usuário..." 
                                  : "Escolha um time..."
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {shareType === "user" 
                                ? availableUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                                          {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="font-medium">{user.name}</p>
                                          <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))
                                : availableTeams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-4 h-4 rounded-full"
                                          style={{ backgroundColor: team.color }}
                                        />
                                        <span>{team.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                              }
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Permissão</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-permission">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  <div>
                                    <p className="font-medium">Visualizar</p>
                                    <p className="text-xs text-muted-foreground">Apenas ver as tarefas</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="edit">
                                <div className="flex items-center gap-2">
                                  <Edit className="w-4 h-4" />
                                  <div>
                                    <p className="font-medium">Editar</p>
                                    <p className="text-xs text-muted-foreground">Criar e editar tarefas</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-4 h-4" />
                                  <div>
                                    <p className="font-medium">Administrador</p>
                                    <p className="text-xs text-muted-foreground">Controle total do board</p>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createShareMutation.isPending}
                    className="w-full"
                    data-testid="button-share"
                  >
                    {createShareMutation.isPending ? "Compartilhando..." : "Compartilhar Board"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* List of current shares */}
          {shares.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acessos Atuais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shares.map((share) => {
                  const details = getShareDetails(share);
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`share-item-${share.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                          {share.shareType === "user" ? (
                            <User className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Users2 className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{details.shareName}</p>
                          {details.shareEmail && (
                            <p className="text-sm text-muted-foreground">{details.shareEmail}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {share.shareType === "user" ? "Usuário" : "Time"}
                            </Badge>
                            {details.shareColor && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: details.shareColor }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Select
                          value={share.permission}
                          onValueChange={(permission) => 
                            updateShareMutation.mutate({ shareId: share.id, permission })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${getPermissionColor(share.permission)}`}>
                              {getPermissionIcon(share.permission)}
                              <span className="text-xs font-medium">
                                {share.permission === "view" && "Ver"}
                                {share.permission === "edit" && "Editar"}
                                {share.permission === "admin" && "Admin"}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">Visualizar</SelectItem>
                            <SelectItem value="edit">Editar</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteShareMutation.mutate(share.id)}
                          disabled={deleteShareMutation.isPending}
                          className="text-red-600 hover:text-red-800"
                          data-testid={`button-remove-share-${share.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {shares.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Share2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Este board ainda não foi compartilhado com ninguém.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}