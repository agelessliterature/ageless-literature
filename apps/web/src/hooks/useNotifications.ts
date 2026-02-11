import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  userId: string;
  type: string;
  data: any;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Fetch unread notification count
export const useUnreadNotificationCount = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<{ count: number }>>(
          '/notifications/unread-count',
        );
        return data.data?.count || 0;
      } catch (error: any) {
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
          return 0;
        }
        throw error;
      }
    },
    enabled: !!session,
    retry: false,
    staleTime: 1000 * 30, // Cache for 30 seconds
    refetchInterval: 1000 * 60, // Refetch every 60 seconds
  });
};

// Fetch notifications list
export const useNotifications = (
  page = 1,
  limit = 20,
  filters?: { type?: string; isRead?: boolean },
) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['notifications', 'list', page, limit, filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(filters?.type && { type: filters.type }),
          ...(filters?.isRead !== undefined && { isRead: filters.isRead.toString() }),
        });

        const { data } = await api.get<ApiResponse<NotificationListResponse>>(
          `/notifications?${params.toString()}`,
        );
        return (
          data.data || {
            notifications: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
          }
        );
      } catch (error: any) {
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
          return { notifications: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
        }
        throw error;
      }
    },
    enabled: !!session,
    retry: false,
    staleTime: 1000 * 30,
  });
};

// Mark notification as read
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch<ApiResponse<Notification>>(
        `/notifications/${notificationId}/read`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      console.error('Failed to mark notification as read:', error);
    },
  });
};

// Mark all notifications as read
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<ApiResponse<{ updated: number }>>(
        '/notifications/mark-all-read',
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark notifications as read');
    },
  });
};

// Delete notification
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete notification');
    },
  });
};
