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

  // Create some demo notifications when user first logs in
  useEffect(() => {
    if (!isAuthenticated || !user?.id || notifications.length > 0) return;

    const createDemoNotifications = async () => {
      // Wait a bit to ensure everything is loaded
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create welcome notification
      createNotification({
        userId: user.id,
        title: "🎉 Bem-vindo ao Sistema!",
        message: "Sistema de notificações ativado com sucesso. Aqui você receberá atualizações importantes sobre suas tarefas e projetos.",
        type: "success",
        priority: "normal",
        category: "system",
        metadata: JSON.stringify({ 
          isDemo: true,
          feature: "notifications" 
        })
      });

      // Create info notification after 3 seconds
      setTimeout(() => {
        createNotification({
          userId: user.id,
          title: "📋 Nova funcionalidade disponível",
          message: "O sistema de permissões foi atualizado com novas funcionalidades. Verifique suas configurações.",
          type: "info",
          priority: "low",
          category: "updates",
          actionUrl: "/admin/permissions",
          metadata: JSON.stringify({ 
            isDemo: true,
            feature: "permissions" 
          })
        });
      }, 3000);

      // Create high priority notification after 6 seconds
      setTimeout(() => {
        createNotification({
          userId: user.id,
          title: "⚠️ Cache Apollo limpo",
          message: "Conflitos de cache anterior foram resolvidos. O erro 'ApolloError: Notification alert not found' foi corrigido.",
          type: "warning",
          priority: "high",
          category: "system",
          metadata: JSON.stringify({ 
            isDemo: true,
            technical: "apollo-cache-cleanup",
            resolved: true
          })
        });
      }, 6000);
    };

    createDemoNotifications();
  }, [isAuthenticated, user?.id, notifications.length, createNotification]);

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