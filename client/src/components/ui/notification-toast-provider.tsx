import { useEffect } from "react";
import { useNotifications, useNotificationToast } from "@/hooks/useNotifications";

/**
 * Component that automatically shows toast notifications for new notifications
 * This should be placed at the root level of your app to work globally
 */
export function NotificationToastProvider() {
  const { notifications } = useNotifications();
  const { showNotificationToast } = useNotificationToast();

  useEffect(() => {
    if (notifications.length === 0) return;

    // Get the latest notification (first in the array since they're ordered by createdAt desc)
    const latestNotification = notifications[0];
    if (!latestNotification) return;

    // Only show toast for unread notifications created in the last minute
    const isUnread = latestNotification.isRead === "false";
    const isRecent = new Date(latestNotification.createdAt).getTime() > Date.now() - 60000;

    if (isUnread && isRecent) {
      showNotificationToast(latestNotification);
    }
  }, [notifications, showNotificationToast]);

  return null;
}