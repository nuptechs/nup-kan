import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { SUCCESS_MESSAGES } from "@/constants/successMessages";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { NOTIFICATIONS_LOGS } from "@/constants/logMessages";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: "true" | "false";
  priority: "low" | "normal" | "high" | "urgent";
  category?: string;
  metadata?: string;
  actionUrl?: string;
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  count: number;
}

interface UnreadCountResponse {
  count: number;
}

interface CreateNotificationResponse {
  success: boolean;
  notification: Notification;
}

interface MarkAllAsReadResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  priority?: "low" | "normal" | "high" | "urgent";
  category?: string;
  metadata?: string;
  actionUrl?: string;
  expiresAt?: string;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications for current user
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (was 30s)
    gcTime: 10 * 60 * 1000, // Garbage collect after 10 minutes (was 1min)
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes (was 1min)
    refetchOnWindowFocus: false, // Disable aggressive refetch
  });

  // Fetch unread count
  const {
    data: unreadCountData,
    isLoading: isLoadingCount,
    refetch: refetchUnreadCount
  } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes (was 15s)
    refetchInterval: 3 * 60 * 1000, // Auto-refresh every 3 minutes (was 30s)
    refetchOnWindowFocus: false, // Disable aggressive refetch
  });

  const notifications = useMemo(() => {
    return notificationsData?.notifications || [];
  }, [notificationsData]);

  const unreadCount = useMemo(() => {
    return unreadCountData?.count || 0;
  }, [unreadCountData]);

  // Memoized notification lists
  const { unreadNotifications, readNotifications } = useMemo(() => {
    const unread = notifications.filter((n: Notification) => n.isRead === "false");
    const read = notifications.filter((n: Notification) => n.isRead === "true");
    
    return {
      unreadNotifications: unread,
      readNotifications: read
    };
  }, [notifications]);

  // Create notification mutation
  const createNotificationMutation = useMutation<CreateNotificationResponse, Error, CreateNotificationData>({
    mutationFn: async (data: CreateNotificationData) => {
      const response = await apiRequest("POST", "/api/notifications", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: SUCCESS_MESSAGES.NOTIFICATIONS.CREATED,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error(NOTIFICATIONS_LOGS.CREATE_ERROR(error));
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.NOTIFICATIONS.CREATE_FAILED,
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation<Notification, Error, string>({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error) => {
      console.error(NOTIFICATIONS_LOGS.MARK_READ_ERROR(error));
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.NOTIFICATIONS.MARK_READ_FAILED,
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation<MarkAllAsReadResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/notifications/mark-all-read");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      
      const updatedCount = data?.updatedCount || 0;
      if (updatedCount > 0) {
        toast({
          title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
          description: `${updatedCount} ${SUCCESS_MESSAGES.NOTIFICATIONS.MARKED_AS_READ}`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      console.error(NOTIFICATIONS_LOGS.MARK_ALL_READ_ERROR(error));
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.NOTIFICATIONS.MARK_READ_FAILED,
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation<void, Error, string>({
    mutationFn: async (notificationId: string) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: SUCCESS_MESSAGES.GENERIC.SUCCESS,
        description: SUCCESS_MESSAGES.NOTIFICATIONS.DELETED,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error(NOTIFICATIONS_LOGS.DELETE_ERROR(error));
      toast({
        title: ERROR_MESSAGES.GENERIC.ERROR,
        description: ERROR_MESSAGES.NOTIFICATIONS.DELETE_FAILED,
        variant: "destructive",
      });
    },
  });

  // Callback functions
  const createNotification = useCallback((data: CreateNotificationData) => {
    createNotificationMutation.mutate(data);
  }, [createNotificationMutation]);

  const markAsRead = useCallback((notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  }, [markAllAsReadMutation, unreadCount]);

  const deleteNotification = useCallback((notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  }, [deleteNotificationMutation]);

  const refreshNotifications = useCallback(() => {
    refetchNotifications();
    refetchUnreadCount();
  }, [refetchNotifications, refetchUnreadCount]);

  // Helper functions
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter((n: Notification) => n.type === type);
  }, [notifications]);

  const getNotificationsByCategory = useCallback((category: string) => {
    return notifications.filter((n: Notification) => n.category === category);
  }, [notifications]);

  const hasUnreadNotifications = unreadCount > 0;

  return {
    // Data
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    hasUnreadNotifications,

    // States
    isLoading: isLoadingNotifications,
    isLoadingCount,
    error: notificationsError,
    
    // Mutations states
    isCreating: createNotificationMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,

    // Actions
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,

    // Helper functions
    getNotificationsByType,
    getNotificationsByCategory,
  };
}

// Hook for showing notification toasts
export function useNotificationToast() {
  const { toast } = useToast();

  const showNotificationToast = useCallback((notification: Notification) => {
    const variant = notification.type === "error" ? "destructive" : "default";
    
    toast({
      title: notification.title,
      description: notification.message,
      variant,
      duration: notification.priority === "urgent" ? 10000 : 
                 notification.priority === "high" ? 7000 : 5000,
    });
  }, [toast]);

  const showSuccessToast = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      duration: 3000,
    });
  }, [toast]);

  const showErrorToast = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "destructive",
      duration: 5000,
    });
  }, [toast]);

  const showInfoToast = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      duration: 4000,
    });
  }, [toast]);

  return {
    showNotificationToast,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
  };
}