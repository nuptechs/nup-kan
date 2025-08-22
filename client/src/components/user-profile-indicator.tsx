import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export function UserProfileIndicator() {
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/current-user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online";
      case "busy":
        return "Ocupado";
      case "offline":
        return "Offline";
      default:
        return "Offline";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center space-x-2 h-10 px-2 hover:bg-gray-100 transition-colors"
          data-testid="user-profile-indicator"
        >
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={currentUser.profileImageUrl || undefined} 
                alt={currentUser.name}
              />
              <AvatarFallback className="bg-indigo-500 text-white text-sm font-medium">
                {currentUser.avatar || currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator */}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(currentUser.status || 'offline')}`}
              title={getStatusText(currentUser.status || 'offline')}
            />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900 truncate max-w-24">
              {currentUser.name}
            </p>
            <p className="text-xs text-gray-500 truncate max-w-24">
              {currentUser.role || 'Usuário'}
            </p>
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-64 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={currentUser.profileImageUrl || undefined} 
                alt={currentUser.name}
              />
              <AvatarFallback className="bg-indigo-500 text-white font-medium">
                {currentUser.avatar || currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser.name}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {currentUser.email}
              </p>
              <p className="text-xs text-gray-400">
                {currentUser.role || 'Usuário'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm"
            onClick={() => {
              setLocation("/settings");
            }}
            data-testid="button-user-settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
          
          <div className="border-t my-2" />
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              window.location.href = '/api/logout';
            }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}