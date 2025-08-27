import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotificationBadge } from "./notification-badge";
import { NotificationItem } from "./notification-item";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  RefreshCw, 
  CheckCheck, 
  Trash2, 
  Filter,
  Settings,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  className?: string;
  compact?: boolean;
  defaultOpen?: boolean;
}

export function NotificationCenter({ 
  className, 
  compact = false, 
  defaultOpen = false 
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");

  const {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    isLoading,
    isMarkingAllAsRead,
    isDeleting,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const getActiveNotifications = () => {
    switch (activeTab) {
      case "unread":
        return unreadNotifications;
      case "read":
        return readNotifications;
      default:
        return notifications;
    }
  };

  const activeNotifications = getActiveNotifications();
  const hasUnreadNotifications = unreadCount > 0;

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleRefresh = () => {
    refreshNotifications();
  };

  const handleActionClick = (url: string) => {
    // Open URL in new tab or navigate based on URL type
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      // Internal navigation - could use wouter's navigate here
      window.location.href = url;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className={cn("inline-flex", className)}>
          <NotificationBadge 
            count={unreadCount}
            onClick={() => setIsOpen(true)}
            data-testid="notification-center-trigger"
          />
        </div>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[500px] p-0" side="right">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                Notificações
                {hasUnreadNotifications && (
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-100 text-blue-700"
                    data-testid="header-unread-count"
                  >
                    {unreadCount} não lidas
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                Centralize suas notificações e alertas do sistema
              </SheetDescription>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
                aria-label="Atualizar notificações"
                data-testid="refresh-button"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              
              {hasUnreadNotifications && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                  className="h-8 w-8 p-0"
                  aria-label="Marcar todas como lidas"
                  data-testid="mark-all-read-button"
                >
                  {isMarkingAllAsRead ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <div className="px-6 py-3 border-b bg-gray-50/50">
              <TabsList className="grid w-full grid-cols-3" data-testid="notification-tabs">
                <TabsTrigger value="all" className="text-xs">
                  Todas ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Não lidas ({unreadNotifications.length})
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs">
                  Lidas ({readNotifications.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content */}
            <TabsContent value={activeTab} className="flex-1 m-0 p-0">
              <ScrollArea className="h-full">
                {isLoading && activeNotifications.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Carregando notificações...</p>
                    </div>
                  </div>
                ) : activeNotifications.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {activeTab === "all" && "Nenhuma notificação"}
                        {activeTab === "unread" && "Nenhuma notificação não lida"}
                        {activeTab === "read" && "Nenhuma notificação lida"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {activeTab === "all" && "Você não tem notificações no momento"}
                        {activeTab === "unread" && "Todas as notificações foram lidas"}
                        {activeTab === "read" && "Você não tem notificações lidas"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0" data-testid="notifications-list">
                    {activeNotifications.map((notification, index) => (
                      <div key={notification.id}>
                        <div className="px-4 py-2">
                          <NotificationItem
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDelete}
                            onActionClick={handleActionClick}
                            compact={compact}
                            isDeleting={isDeleting}
                          />
                        </div>
                        {index < activeNotifications.length - 1 && (
                          <Separator className="mx-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-4 bg-gray-50/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Total: {notifications.length} notificações
              </span>
              
              <Button
                variant="ghost" 
                size="sm"
                className="text-xs h-auto p-1 text-gray-500 hover:text-gray-700"
                data-testid="notification-settings"
              >
                <Settings className="h-3 w-3 mr-1" />
                Configurações
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}