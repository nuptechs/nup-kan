import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit, Trash, Type, Hash, Calendar, List, ToggleLeft, Link, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CustomField } from "@shared/schema";

interface CustomFieldFormData {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean" | "url" | "email";
  required: "true" | "false";
  options: string[];
  boardIds: string[];
  placeholder: string;
  validation: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type, description: "Campo de texto livre" },
  { value: "number", label: "Número", icon: Hash, description: "Valores numéricos" },
  { value: "date", label: "Data", icon: Calendar, description: "Seletor de data" },
  { value: "select", label: "Seleção", icon: List, description: "Lista de opções predefinidas" },
  { value: "boolean", label: "Sim/Não", icon: ToggleLeft, description: "Verdadeiro ou falso" },
  { value: "url", label: "URL", icon: Link, description: "Link válido" },
  { value: "email", label: "Email", icon: Mail, description: "Endereço de email" },
] as const;

export default function CustomFieldsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [optionInput, setOptionInput] = useState("");
  const [formData, setFormData] = useState<CustomFieldFormData>({
    name: "",
    label: "",
    type: "text",
    required: "false",
    options: [],
    boardIds: [],
    placeholder: "",
    validation: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Queries
  const { data: fields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields"],
  });

  const { data: boards = [] } = useQuery({
    queryKey: ["/api/boards"],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<CustomFieldFormData, "position">) => 
      apiRequest("POST", "/api/custom-fields", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Campo criado",
        description: "O campo personalizado foi criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar campo personalizado.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomFieldFormData> }) =>
      apiRequest("PATCH", `/api/custom-fields/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Campo atualizado",
        description: "O campo personalizado foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar campo personalizado.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/custom-fields/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Campo excluído",
        description: "O campo personalizado foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir campo personalizado.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      type: "text",
      required: "false",
      options: [],
      boardIds: [],
      placeholder: "",
      validation: "",
    });
    setEditingField(null);
    setOptionInput("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      type: field.type as any,
      required: (field.required || "false") as "true" | "false",
      options: field.options || [],
      boardIds: field.boardIds || [],
      placeholder: field.placeholder || "",
      validation: field.validation || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.label.trim() || formData.boardIds.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, rótulo e pelo menos um board são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingField) {
      updateMutation.mutate({
        id: editingField.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (field: CustomField) => {
    if (window.confirm(`Tem certeza que deseja excluir o campo "${field.label}"?`)) {
      deleteMutation.mutate(field.id);
    }
  };

  const addOption = () => {
    if (optionInput.trim() && !formData.options.includes(optionInput.trim())) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, optionInput.trim()]
      }));
      setOptionInput("");
    }
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const getFieldTypeIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    return fieldType ? fieldType.icon : Type;
  };

  const getFieldTypeLabel = (type: string) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    return fieldType ? fieldType.label : type;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/boards')}
          className="flex items-center gap-2"
          data-testid="button-back-kanban"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Boards
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="w-full sm:w-auto">
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
              Campos Personalizados
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Crie campos personalizados.
            </CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{fields.length} campos</Badge>
            </div>
          </div>
          <Button 
            onClick={openCreateDialog}
            className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
            data-testid="button-create-field"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Campo
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando campos...</div>
          ) : fields.length === 0 ? (
            <div className="text-center py-8">
              <Type className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-muted-foreground">Nenhum campo personalizado.</p>
            </div>
          ) : (
            <>
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Boards</TableHead>
                    <TableHead>Opções</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {fields.map((field) => {
                  const Icon = getFieldTypeIcon(field.type);
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{field.label}</div>
                          <div className="text-sm text-gray-500">{field.name}</div>
                          {field.placeholder && (
                            <div className="text-xs text-gray-400">Placeholder: {field.placeholder}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {getFieldTypeLabel(field.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={field.required === "true" ? "destructive" : "secondary"}>
                          {field.required === "true" ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {field.boardIds && field.boardIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.boardIds.slice(0, 2).map((boardId, i) => {
                              const board = (boards as any[]).find((b: any) => b.id === boardId);
                              return board ? (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {board.name}
                                </Badge>
                              ) : null;
                            })}
                            {field.boardIds.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{field.boardIds.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {field.type === "select" && field.options && field.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.options.slice(0, 3).map((option, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                            {field.options.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{field.options.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(field)}
                            data-testid={`button-edit-field-${field.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(field)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-field-${field.id}`}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
            
            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-4">
              {fields.map((field) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{field.label}</h3>
                      <p className="text-sm text-gray-500">Nome: {field.name}</p>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(field)}
                        data-testid={`button-edit-${field.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(field)}
                        data-testid={`button-delete-${field.id}`}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <div className="flex items-center space-x-1">
                        {(() => {
                          const Icon = getFieldTypeIcon(field.type);
                          return <Icon className="w-4 h-4 text-gray-500" />;
                        })()}
                        <span>{getFieldTypeLabel(field.type)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Obrigatório:</span>
                      <Badge variant={field.required === "true" ? "destructive" : "secondary"}>
                        {field.required === "true" ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    
                    {field.boardIds && field.boardIds.length > 0 && (
                      <div>
                        <span className="text-gray-600 block mb-1">Boards:</span>
                        <div className="flex flex-wrap gap-1">
                          {field.boardIds.map((boardId, i) => {
                            const board = (boards as any[]).find((b: any) => b.id === boardId);
                            return board ? (
                              <Badge key={i} variant="outline" className="text-xs">
                                {board.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    {field.type === "select" && field.options && field.options.length > 0 && (
                      <div>
                        <span className="text-gray-600 block mb-1">Opções:</span>
                        <div className="flex flex-wrap gap-1">
                          {field.options.map((option, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {option}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Editar Campo" : "Criar Novo Campo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingField 
                ? "Editar campo personalizado."
                : "Criar campo personalizado."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Campo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    // Aplicar máscara: substituir espaços por underscore, converter para minúsculas
                    const maskedValue = e.target.value
                      .replace(/\s+/g, '_') // Espaços vira underscore
                      .replace(/[^a-zA-Z0-9_-]/g, '') // Remove caracteres especiais
                      .toLowerCase(); // Converte para minúsculas
                    setFormData({ ...formData, name: maskedValue });
                  }}
                  placeholder="orcamento"
                  data-testid="input-field-name"
                />
                <p className="text-xs text-gray-500">
                  Usado internamente. Espaços serão convertidos automaticamente para underscore (_)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Rótulo *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Orçamento"
                  data-testid="input-field-label"
                />
                <p className="text-xs text-gray-500">
                  Mostrado para os usuários
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo do Campo *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: any) => setFormData({ ...formData, type: value, options: value !== 'select' ? [] : formData.options })}
              >
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <div>
                            <div>{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {formData.type === "select" && (
              <div className="space-y-2">
                <Label>Opções de Seleção</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Opção"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                    data-testid="input-option"
                  />
                  <Button type="button" onClick={addOption} variant="outline">
                    Adicionar
                  </Button>
                </div>
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.options.map((option, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-red-100"
                        onClick={() => removeOption(index)}
                      >
                        {option} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Boards Aplicáveis *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione os boards:
                </p>
                {boards.map((board: any) => (
                  <div key={board.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`board-${board.id}`}
                      checked={formData.boardIds.includes(board.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            boardIds: [...prev.boardIds, board.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            boardIds: prev.boardIds.filter(id => id !== board.id)
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`board-${board.id}`} className="text-sm cursor-pointer">
                      {board.name}
                    </label>
                  </div>
                ))}
                {boards.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum board disponível</p>
                )}
              </div>
              {formData.boardIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.boardIds.map(boardId => {
                    const board = boards.find((b: any) => b.id === boardId);
                    return board ? (
                      <Badge key={boardId} variant="outline" className="text-xs">
                        {board.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder (opcional)</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="Texto de ajuda (opcional)"
                data-testid="input-placeholder"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={formData.required === "true"}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked ? "true" : "false" })}
                data-testid="switch-required"
              />
              <Label htmlFor="required">Campo obrigatório</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-field"
              >
                {editingField ? "Salvar Alterações" : "Criar Campo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}