import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showZero?: boolean;
}

export function NotificationBadge({ 
  count, 
  onClick, 
  className, 
  size = "md",
  showZero = false 
}: NotificationBadgeProps) {
  const hasNotifications = count > 0;
  const displayCount = count > 99 ? "99+" : count.toString();

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  };

  const badgeSizeClasses = {
    sm: "h-3 w-3 text-xs",
    md: "h-4 w-4 text-xs",
    lg: "h-5 w-5 text-sm"
  };

  if (!hasNotifications && !showZero) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors",
          className
        )}
        aria-label="Notificações"
        data-testid="notification-badge-empty"
      >
        <Bell className={cn(sizeClasses[size])} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors",
        hasNotifications && "text-blue-600 hover:text-blue-700",
        className
      )}
      aria-label={`${count} notificações não lidas`}
      data-testid="notification-badge"
    >
      <Bell className={cn(sizeClasses[size])} />
      
      {(hasNotifications || showZero) && (
        <Badge
          className={cn(
            "absolute -top-1 -right-1 flex items-center justify-center border-2 border-white bg-red-500 text-white min-w-0 p-0",
            badgeSizeClasses[size]
          )}
          data-testid="notification-count"
        >
          {count > 0 ? displayCount : "0"}
        </Badge>
      )}
    </button>
  );
}