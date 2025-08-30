import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Plus, X, Tag as TagIcon, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TagManagementDialog } from "./tag-management-dialog";
import type { Tag } from "@shared/schema";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // ✅ PROTEÇÃO CONTRA NULL
  const safeTags = Array.isArray(tags) ? tags : [];

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await apiRequest("POST", "/api/tags", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setNewTagName("");
      setNewTagColor("#3b82f6");
      setIsCreating(false);
      toast({
        title: "Sucesso",
        description: "Tag criada com sucesso!",
        duration: 2500,
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

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    onTagsChange(selectedTags.filter(t => t !== tagName));
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate({
        name: newTagName.trim(),
        color: newTagColor,
      });
    }
  };

  const selectedTagsData = safeTags.filter(tag => selectedTags.includes(tag.name));

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-1">
        {selectedTagsData.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="flex items-center gap-1"
            style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
            data-testid={`selected-tag-${tag.name}`}
          >
            <TagIcon size={12} />
            {tag.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag.name)}
              data-testid={`remove-tag-${tag.name}`}
            >
              <X size={12} />
            </Button>
          </Badge>
        ))}
      </div>

      {/* Tag Selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            data-testid="open-tag-selector"
          >
            <TagIcon size={16} className="mr-2" />
            Adicionar tags...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar tags..." />
            <CommandEmpty>
              {isCreating ? (
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="tag-name">Nome da tag</Label>
                    <Input
                      id="tag-name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nome da nova tag"
                      data-testid="input-new-tag-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag-color">Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tag-color"
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-16 h-8"
                        data-testid="input-new-tag-color"
                      />
                      <span className="text-sm text-muted-foreground self-center">
                        {newTagColor}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || createTagMutation.isPending}
                      data-testid="button-create-tag"
                    >
                      Criar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreating(false)}
                      data-testid="button-cancel-create-tag"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setIsCreating(true)}
                    data-testid="button-start-create-tag"
                  >
                    <Plus size={16} className="mr-2" />
                    Criar nova tag
                  </Button>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {safeTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleToggleTag(tag.name)}
                  className="flex items-center justify-between"
                  data-testid={`tag-option-${tag.name}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </div>
                  {selectedTags.includes(tag.name) && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </CommandItem>
              ))}
              {!isCreating && (
                <div className="p-2 border-t space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setIsCreating(true)}
                    data-testid="button-start-create-tag"
                  >
                    <Plus size={16} className="mr-2" />
                    Criar nova tag
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsOpen(false);
                      setIsManagementOpen(true);
                    }}
                    data-testid="button-manage-tags"
                  >
                    <Settings size={16} className="mr-2" />
                    Gerenciar tags
                  </Button>
                </div>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      <TagManagementDialog
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
      />
    </div>
  );
}