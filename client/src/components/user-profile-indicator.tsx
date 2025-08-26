import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export function UserProfileIndicator() {
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading } = useAuth();

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
          className="flex items-center justify-center h-10 w-10 p-1 hover:bg-gray-100 transition-colors rounded-full"
          data-testid="user-profile-indicator"
          title={`${currentUser?.name || 'Usuário'} - ${currentUser?.role || 'Usuário'}`}
        >
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={currentUser?.avatar || undefined} 
                alt={currentUser?.name || 'Usuário'}
              />
              <AvatarFallback className="bg-indigo-500 text-white text-sm font-medium">
                {currentUser?.avatar || (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U')}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator */}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(currentUser?.status || 'offline')}`}
              title={getStatusText(currentUser?.status || 'offline')}
            />
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-64 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={currentUser?.avatar || undefined} 
                alt={currentUser?.name || 'Usuário'}
              />
              <AvatarFallback className="bg-indigo-500 text-white font-medium">
                {currentUser?.avatar || (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-950 transition-colors">
                {currentUser?.name || 'Usuário'}
              </p>
              <p className="text-sm text-gray-500 truncate group-hover:text-gray-600 transition-colors">
                {currentUser?.email || 'email@exemplo.com'}
              </p>
              <p className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
                {currentUser?.role || 'Usuário'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm hover:bg-gray-50 transition-colors group"
            onClick={() => {
              setLocation("/settings");
            }}
            data-testid="button-user-settings"
          >
            <Settings className="w-4 h-4 mr-2 group-hover:text-gray-600 transition-colors" />
            <span className="group-hover:text-gray-900 transition-colors">Configurações</span>
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