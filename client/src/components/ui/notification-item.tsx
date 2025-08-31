import { NOTIFICATIONS_LOGS } from "@/constants/logMessages";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  X, 
  ExternalLink,
  Eye 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onActionClick?: (url: string) => void;
  compact?: boolean;
  isMarkingAsRead?: boolean;
  isDeleting?: boolean;
}

const typeIcons = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors = {
  success: "text-green-600 bg-green-50 border-green-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
  error: "text-red-600 bg-red-50 border-red-200",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const priorityLabels = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onActionClick,
  compact = false,
  isMarkingAsRead = false,
  isDeleting = false,
}: NotificationItemProps) {
  const isUnread = notification.isRead === "false";
  const Icon = typeIcons[notification.type] || Info;
  const createdAt = new Date(notification.createdAt);
  
  // Parse metadata safely
  let metadata = {};
  try {
    metadata = JSON.parse(notification.metadata || "{}");
  } catch (error) {
    console.warn(NOTIFICATIONS_LOGS.PARSE_METADATA_ERROR(error));
  }

  const handleMarkAsRead = () => {
    if (onMarkAsRead && isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  const handleActionClick = () => {
    if (onActionClick && notification.actionUrl) {
      onActionClick(notification.actionUrl);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-start space-x-3 p-3 border-l-4 transition-colors hover:bg-gray-50",
          typeColors[notification.type],
          isUnread ? "bg-blue-50/30" : "bg-white"
        )}
        data-testid={`notification-item-${notification.id}`}
      >
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-sm font-medium truncate",
              isUnread ? "text-gray-900" : "text-gray-600"
            )}>
              {notification.title}
            </p>
            
            <div className="flex items-center space-x-1 ml-2">
              {notification.priority !== "normal" && (
                <Badge 
                  className={cn("text-xs px-1 py-0", priorityColors[notification.priority])}
                  data-testid="notification-priority"
                >
                  {priorityLabels[notification.priority]}
                </Badge>
              )}
              
              {isUnread && (
                <div className="h-2 w-2 bg-blue-600 rounded-full" data-testid="unread-indicator" />
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-500 truncate mt-1">
            {notification.message}
          </p>
          
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        
        {isUnread && onMarkAsRead && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAsRead}
            disabled={isMarkingAsRead}
            className="h-6 w-6 p-0 hover:bg-blue-100"
            aria-label="Marcar como lida"
            data-testid="mark-as-read-button"
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "p-4 transition-all duration-200 hover:shadow-md",
        isUnread ? "ring-2 ring-blue-200 bg-blue-50/20" : "bg-white"
      )}
      data-testid={`notification-card-${notification.id}`}
    >
      <div className="flex items-start space-x-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          typeColors[notification.type]
        )}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={cn(
                  "text-sm font-semibold",
                  isUnread ? "text-gray-900" : "text-gray-700"
                )}>
                  {notification.title}
                </h3>
                
                {isUnread && (
                  <div className="h-2 w-2 bg-blue-600 rounded-full" data-testid="unread-indicator" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                {notification.message}
              </p>
              
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                </div>
                
                {notification.category && notification.category !== "general" && (
                  <Badge variant="outline" className="text-xs">
                    {notification.category}
                  </Badge>
                )}
                
                {notification.priority !== "normal" && (
                  <Badge 
                    className={cn("text-xs", priorityColors[notification.priority])}
                    data-testid="notification-priority"
                  >
                    {priorityLabels[notification.priority]}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-start space-x-1 ml-2">
              {notification.actionUrl && onActionClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleActionClick}
                  className="h-8 w-8 p-0 hover:bg-blue-100"
                  aria-label="Abrir ação"
                  data-testid="action-button"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              
              {isUnread && onMarkAsRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingAsRead}
                  className="h-8 w-8 p-0 hover:bg-green-100"
                  aria-label="Marcar como lida"
                  data-testid="mark-as-read-button"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                  aria-label="Excluir notificação"
                  data-testid="delete-button"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}