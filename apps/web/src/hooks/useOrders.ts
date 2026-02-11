import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import type { Order, ApiResponse, PaginatedResponse } from '@/types';

// Fetch user's orders
export const useOrders = (page = 1, limit = 10) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['orders', page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/orders', {
        params: { page, limit },
      });
      return data;
    },
    enabled: !!session,
  });
};

// Fetch single order
export const useOrder = (orderId: string | number) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
      return data.data;
    },
    enabled: !!orderId,
  });
};

// Fetch vendor orders (vendor dashboard)
export const useVendorOrders = (page = 1, limit = 10) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['vendor-orders', page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/vendor/orders', {
        params: { page, limit },
      });
      return data;
    },
    enabled: !!session && session.user.role === 'vendor',
  });
};

// Update order status (vendor only)
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const { data } = await api.put<ApiResponse<Order>>(`/vendor/orders/${orderId}`, {
        status,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
  });
};
