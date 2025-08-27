import { useEffect } from "react";
import { NotificationCenter } from "@/components/ui/notification-center";
import { NotificationToastProvider } from "@/components/ui/notification-toast-provider";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { apolloCleanup } from "@/lib/apolloCacheCleanup";

/**
 * Complete Notification System Component
 * 
 * This component provides:
 * - NotificationCenter (bell icon + slide-out panel)
 * - Toast notifications for new notifications
 * - Apollo cache cleanup to prevent conflicts
 * - Demo notifications for testing
 */
export function NotificationSystem() {
  const { user, isAuthenticated } = useAuth();
  const { createNotification, notifications } = useNotifications();

  // TEMPORARIAMENTE DESABILITADO - Evitar loop de notificações
  // TODO: Reativar depois que o sistema estiver estável
  /*
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    // Evitar loop - usar flag no localStorage
    const demoNotificationsCreated = localStorage.getItem(`demo-notifications-${user.id}`);
    if (demoNotificationsCreated) return;

    console.log('🔔 [NOTIFICATION-SYSTEM] Criando notificações demo para:', user.id);
    localStorage.setItem(`demo-notifications-${user.id}`, 'true');
    
  }, [isAuthenticated, user?.id]);
  */

  // Run Apollo cleanup on component mount
  useEffect(() => {
    const runCleanup = async () => {
      try {
        await apolloCleanup.initCleanup();
      } catch (error) {
        console.error("Error running Apollo cleanup:", error);
      }
    };

    runCleanup();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Toast Provider for automatic toast notifications */}
      <NotificationToastProvider />
      
      {/* Notification Center - renders the bell icon and slide-out panel */}
      <NotificationCenter />
    </>
  );
}