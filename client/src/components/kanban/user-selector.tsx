import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Users, X, Settings } from "lucide-react";
import { UserManagementDialog } from "./user-management-dialog";
import type { User } from "@shared/schema";

interface UserSelectorProps {
  selectedUserId?: string;
  onUserChange: (userId: string, userName: string, userAvatar: string) => void;
  label?: string;
}

export function UserSelector({ selectedUserId, onUserChange, label = "Responsável" }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const selectedUser = users.find(user => user.id === selectedUserId);

  const handleSelectUser = (user: User) => {
    onUserChange(user.id, user.name, user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase());
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onUserChange("", "", "");
    setIsOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="user-selector">{label}</Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id="user-selector"
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-start h-auto min-h-[40px] p-2"
              data-testid="open-user-selector"
            >
              {selectedUser ? (
                <div className="flex items-center gap-2 w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {selectedUser.avatar || selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{selectedUser.name}</div>
                    {selectedUser.role && (
                      <div className="text-xs text-gray-500">{selectedUser.role}</div>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedUser.status || "offline")}`} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Selecionar usuário...
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar usuários..." />
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">Nenhum usuário encontrado</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setIsManagementOpen(true);
                    }}
                    data-testid="button-manage-users-from-empty"
                  >
                    <Settings size={16} className="mr-2" />
                    Gerenciar usuários
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {selectedUser && (
                  <CommandItem
                    onSelect={handleClearSelection}
                    className="flex items-center justify-between text-red-600"
                    data-testid="clear-user-selection"
                  >
                    <div className="flex items-center gap-2">
                      <X size={16} />
                      <span>Remover responsável</span>
                    </div>
                  </CommandItem>
                )}
                
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleSelectUser(user)}
                    className="flex items-center justify-between"
                    data-testid={`user-option-${user.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {user.role && <span>{user.role}</span>}
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(user.status || "offline")}`} />
                            <span className="capitalize">{user.status || "offline"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedUserId === user.id && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </CommandItem>
                ))}
                
                {users.length > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsOpen(false);
                        setIsManagementOpen(true);
                      }}
                      data-testid="button-manage-users"
                    >
                      <Settings size={16} className="mr-2" />
                      Gerenciar usuários
                    </Button>
                  </div>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        
        <UserManagementDialog
          isOpen={isManagementOpen}
          onClose={() => setIsManagementOpen(false)}
        />
      </div>
    </>
  );
}