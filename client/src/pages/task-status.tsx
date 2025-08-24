import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

interface TaskStatus {
  id: string;
  name: string;
  displayName: string;
  color: string;
  isDefault: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StatusFormData {
  name: string;
  displayName: string;
  color: string;
  isDefault: string;
  position: number;
}

export default function TaskStatusPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    name: "",
    displayName: "",
    color: "#6b7280",
    isDefault: "false",
    position: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: statuses = [], isLoading } = useQuery<TaskStatus[]>({
    queryKey: ["/api/task-statuses"],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<StatusFormData, "position">) => 
      apiRequest("POST", "/api/task-statuses", {
        ...data,
        position: statuses.length
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Status criado",
        description: "O status da tarefa foi criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar status da tarefa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StatusFormData> }) =>
      apiRequest("PATCH", `/api/task-statuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Status atualizado",
        description: "O status da tarefa foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da tarefa.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/task-statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-statuses"] });
      toast({
        title: "Status excluído",
        description: "O status da tarefa foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir status da tarefa.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      color: "#6b7280",
      isDefault: "false",
      position: 0,
    });
    setEditingStatus(null);
  };

  const openEditDialog = (status: TaskStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      displayName: status.displayName,
      color: status.color,
      isDefault: status.isDefault,
      position: status.position,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este status? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Status das Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie os diferentes status disponíveis para as tarefas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-create-status">
              <Plus className="h-4 w-4 mr-2" />
              Novo Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? "Editar Status" : "Novo Status"}
              </DialogTitle>
              <DialogDescription>
                {editingStatus
                  ? "Edite as informações do status da tarefa."
                  : "Adicione um novo status para as tarefas."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Nome (identificador)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: em-andamento"
                    required
                    data-testid="input-status-name"
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Nome para Exibição</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="ex: Em Andamento"
                    required
                    data-testid="input-status-display-name"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                      data-testid="input-status-color"
                    />
                    <Badge style={{ backgroundColor: formData.color, color: "#fff" }}>
                      {formData.displayName || "Preview"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault === "true"}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, isDefault: checked ? "true" : "false" })
                    }
                    data-testid="switch-status-default"
                  />
                  <Label htmlFor="isDefault">Status padrão para novas tarefas</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-status"
                >
                  {editingStatus ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Status Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statuses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum status cadastrado. Clique em "Novo Status" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Exibição</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-mono text-sm">{status.name}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: status.color, color: "#fff" }}>
                        {status.displayName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: status.color }}
                      />
                    </TableCell>
                    <TableCell>
                      {status.isDefault === "true" ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>{status.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(status)}
                          data-testid={`button-edit-status-${status.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(status.id)}
                          data-testid={`button-delete-status-${status.id}`}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}