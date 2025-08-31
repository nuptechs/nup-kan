import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Type, Hash, Calendar as CalendarIconLucide, List, ToggleLeft, Link, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean" | "url" | "email";
  required: string;
  options?: string[];
  placeholder?: string;
  validation?: string;
}

interface TaskCustomValue {
  id: string;
  taskId: string;
  customFieldId: string;
  value: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  fieldOptions?: string[];
  fieldRequired: string;
}

interface TaskCustomFieldsProps {
  taskId: string;
  boardId: string;
}

const FIELD_TYPE_ICONS = {
  text: Type,
  number: Hash,
  date: CalendarIconLucide,
  select: List,
  boolean: ToggleLeft,
  url: Link,
  email: Mail,
};

export default function TaskCustomFields({ taskId, boardId }: TaskCustomFieldsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Buscar campos personalizados do board
  const { data: customFields = [], isLoading: fieldsLoading } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields", boardId],
    enabled: !!boardId,
  });

  // Buscar valores existentes da task
  const { data: existingValues = [], isLoading: valuesLoading } = useQuery<TaskCustomValue[]>({
    queryKey: [`/api/tasks/${taskId}/custom-values`],
    enabled: !!taskId,
  });

  // Carregar valores existentes no estado local
  useEffect(() => {
    if (existingValues.length > 0) {
      const valueMap = existingValues.reduce((acc, value) => {
        acc[value.customFieldId] = value.value || '';
        return acc;
      }, {} as Record<string, string>);
      setFieldValues(valueMap);
    }
  }, [existingValues]);

  // Mutation para criar/atualizar valores de campos
  const saveValueMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const existingValue = existingValues.find(v => v.customFieldId === fieldId);
      
      if (existingValue) {
        // Atualizar valor existente
        return apiRequest("PATCH", `/api/tasks/${taskId}/custom-values/${existingValue.id}`, {
          value: value === 'none' ? '' : (value || ''),
        });
      } else {
        // Criar novo valor
        return apiRequest("POST", `/api/tasks/${taskId}/custom-values`, {
          customFieldId: fieldId,
          value: value === 'none' ? '' : (value || ''),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/custom-values`] });
    },
    onError: (error) => {
      console.error('Error saving custom field value:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar valor do campo personalizado",
        variant: "destructive",
      });
    },
  });

  const handleValueChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleFieldBlur = (fieldId: string, value: string) => {
    // Auto-salvar quando o campo perde foco
    const currentValue = existingValues.find(v => v.customFieldId === fieldId)?.value || '';
    const normalizedValue = value === 'none' ? '' : value;
    if (normalizedValue !== currentValue) {
      saveValueMutation.mutate({ fieldId, value });
    }
  };

  const renderFieldInput = (field: CustomField) => {
    const storedValue = fieldValues[field.id] || (existingValues.find(v => v.customFieldId === field.id)?.value || '');
    // Para campos select, converter string vazia para 'none' para evitar erro do SelectItem
    const value = field.type === 'select' && storedValue === '' ? 'none' : storedValue;
    const Icon = FIELD_TYPE_ICONS[field.type] || Type;
    const isRequired = field.required === "true";

    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <Label htmlFor={`edit-field-${field.name}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <Icon className="w-4 h-4" />
              {field.label}
              {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`edit-field-${field.name}`}
              name={`edit-field-${field.name}`}
              value={value}
              placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              onBlur={(e) => handleFieldBlur(field.id, e.target.value)}
              className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
              data-testid={`input-${field.name}`}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <Label htmlFor={`edit-field-${field.name}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <Icon className="w-4 h-4" />
              {field.label}
              {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`edit-field-${field.name}`}
              name={`edit-field-${field.name}`}
              type="number"
              value={value}
              placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              onBlur={(e) => handleFieldBlur(field.id, e.target.value)}
              className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
              data-testid={`input-${field.name}`}
            />
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <Icon className="w-4 h-4" />
              {field.label}
              {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors",
                    !value && "text-muted-foreground"
                  )}
                  data-testid={`button-date-${field.name}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), "PPP", { locale: ptBR }) : `Selecionar ${field.label.toLowerCase()}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => {
                    const dateValue = date ? date.toISOString().split('T')[0] : '';
                    handleValueChange(field.id, dateValue);
                    handleFieldBlur(field.id, dateValue);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <Icon className="w-4 h-4" />
              {field.label}
              {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={value}
              onValueChange={(newValue) => {
                handleValueChange(field.id, newValue);
                handleFieldBlur(field.id, newValue);
              }}
            >
              <SelectTrigger
                className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
                data-testid={`select-${field.name}`}
              >
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {field.label}
                {isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Switch
                checked={value === 'true'}
                onCheckedChange={(checked) => {
                  const newValue = checked ? 'true' : 'false';
                  handleValueChange(field.id, newValue);
                  handleFieldBlur(field.id, newValue);
                }}
                data-testid={`switch-${field.name}`}
              />
            </div>
          </div>
        );

      case 'url':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <Icon className="w-4 h-4" />
              {field.label}
              {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`edit-field-${field.name}`}
              name={`edit-field-${field.name}`}
              type="url"
              value={value}
              placeholder={field.placeholder || "https://..."}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              onBlur={(e) => handleFieldBlur(field.id, e.target.value)}
              className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
              data-testid={`input-${field.name}`}
            />
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2" data-testid={`field-${field.name}`}>
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <Icon className="w-4 h-4" />
              {field.label}
              {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`edit-field-${field.name}`}
              name={`edit-field-${field.name}`}
              type="email"
              value={value}
              placeholder={field.placeholder || "email@exemplo.com"}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              onBlur={(e) => handleFieldBlur(field.id, e.target.value)}
              className="border-blue-200 focus:border-blue-400 focus:ring-blue-100 bg-blue-50/30 hover:bg-blue-50/50 transition-colors"
              data-testid={`input-${field.name}`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (fieldsLoading || valuesLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-500">Carregando campos personalizados...</div>
      </div>
    );
  }

  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="task-custom-fields">
      <h4 className="text-sm font-medium text-slate-700 mb-3">Campos Personalizados</h4>
      <div className="space-y-3">
        {customFields.map((field) => (
          <div key={field.id}>
            {renderFieldInput(field)}
          </div>
        ))}
        
        {saveValueMutation.isPending && (
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Salvando...
          </div>
        )}
      </div>
    </div>
  );
}