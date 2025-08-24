import { useState } from "react";
import { Check, X, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface MultiUserSelectorProps {
  selectedUserIds: string[];
  onUserSelectionChange: (userIds: string[]) => void;
  label?: string;
}

export function MultiUserSelector({ 
  selectedUserIds, 
  onUserSelectionChange, 
  label = "Responsáveis" 
}: MultiUserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const selectedUsers = users.filter(user => selectedUserIds.includes(user.id));

  const handleUserToggle = (user: User) => {
    const isSelected = selectedUserIds.includes(user.id);
    if (isSelected) {
      onUserSelectionChange(selectedUserIds.filter(id => id !== user.id));
    } else {
      onUserSelectionChange([...selectedUserIds, user.id]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    onUserSelectionChange(selectedUserIds.filter(id => id !== userId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="multi-user-selector">{label}</Label>
      
      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map(user => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {user.avatar || getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.name}</span>
              <button
                onClick={() => handleRemoveUser(user.id)}
                className="ml-1 text-gray-500 hover:text-red-500"
                type="button"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="multi-user-selector"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-start h-auto min-h-[40px] p-3"
            data-testid="open-multi-user-selector"
          >
            <UserPlus size={16} className="mr-2" />
            {selectedUsers.length === 0 
              ? "Selecionar responsáveis..." 
              : `${selectedUsers.length} responsável${selectedUsers.length > 1 ? 'is' : ''} selecionado${selectedUsers.length > 1 ? 's' : ''}`
            }
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Selecionar Responsáveis</h4>
            <p className="text-xs text-muted-foreground">
              Escolha um ou mais usuários para esta tarefa
            </p>
          </div>
          
          <ScrollArea className="h-64">
            <div className="p-2">
              {users.map(user => {
                const isSelected = selectedUserIds.includes(user.id);
                
                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserToggle(user)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    data-testid={`select-user-${user.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                            {user.avatar || getUserInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${getStatusColor(user.status || "offline")}`} 
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">{user.name}</div>
                        {user.role && (
                          <div className="text-xs text-gray-500">{user.role}</div>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <Check size={16} className="text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t bg-gray-50">
            <Button 
              onClick={() => setIsOpen(false)} 
              className="w-full"
              size="sm"
            >
              Concluir
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}