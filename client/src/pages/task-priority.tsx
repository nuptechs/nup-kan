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
import { Flag, Edit, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

interface TaskPriority {
  id: string;
  name: string;
  displayName: string;
  color: string;
  isDefault: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PriorityFormData {
  name: string;
  displayName: string;
  color: string;
  isDefault: string;
  level: number;
}

export default function TaskPriorityPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<TaskPriority | null>(null);
  const [formData, setFormData] = useState<PriorityFormData>({
    name: "",
    displayName: "",
    color: "#f59e0b",
    isDefault: "false",
    level: 1,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: priorities = [], isLoading } = useQuery<TaskPriority[]>({
    queryKey: ["/api/task-priorities"],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: PriorityFormData) => 
      apiRequest("/api/task-priorities", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-priorities"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Prioridade criada",
        description: "A prioridade da tarefa foi criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar prioridade da tarefa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PriorityFormData> }) =>
      apiRequest(`/api/task-priorities/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-priorities"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Prioridade atualizada",
        description: "A prioridade da tarefa foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar prioridade da tarefa.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/task-priorities/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-priorities"] });
      toast({
        title: "Prioridade excluída",
        description: "A prioridade da tarefa foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir prioridade da tarefa.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      color: "#f59e0b",
      isDefault: "false",
      level: 1,
    });
    setEditingPriority(null);
  };

  const openEditDialog = (priority: TaskPriority) => {
    setEditingPriority(priority);
    setFormData({
      name: priority.name,
      displayName: priority.displayName,
      color: priority.color,
      isDefault: priority.isDefault,
      level: priority.level,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPriority) {
      updateMutation.mutate({ id: editingPriority.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta prioridade? Esta ação não pode ser desfeita.")) {
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
          <h1 className="text-3xl font-bold">Prioridades das Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie as diferentes prioridades disponíveis para as tarefas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-create-priority">
              <Plus className="h-4 w-4 mr-2" />
              Nova Prioridade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPriority ? "Editar Prioridade" : "Nova Prioridade"}
              </DialogTitle>
              <DialogDescription>
                {editingPriority
                  ? "Edite as informações da prioridade da tarefa."
                  : "Adicione uma nova prioridade para as tarefas."}
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
                    placeholder="ex: alta"
                    required
                    data-testid="input-priority-name"
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Nome para Exibição</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="ex: Alta"
                    required
                    data-testid="input-priority-display-name"
                  />
                </div>
                <div>
                  <Label htmlFor="level">Nível (1 = menor, 5 = maior prioridade)</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                    required
                    data-testid="input-priority-level"
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
                      data-testid="input-priority-color"
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
                    data-testid="switch-priority-default"
                  />
                  <Label htmlFor="isDefault">Prioridade padrão para novas tarefas</Label>
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
                  data-testid="button-save-priority"
                >
                  {editingPriority ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Prioridades Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhuma prioridade cadastrada. Clique em "Nova Prioridade" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Exibição</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorities.map((priority) => (
                  <TableRow key={priority.id}>
                    <TableCell className="font-mono text-sm">{priority.name}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: priority.color, color: "#fff" }}>
                        {priority.displayName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Nível {priority.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: priority.color }}
                      />
                    </TableCell>
                    <TableCell>
                      {priority.isDefault === "true" ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(priority)}
                          data-testid={`button-edit-priority-${priority.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(priority.id)}
                          data-testid={`button-delete-priority-${priority.id}`}
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