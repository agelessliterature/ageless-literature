import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import type { CartItem, ApiResponse } from '@/types';
import toast from 'react-hot-toast';

interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// Fetch user's cart
export const useCart = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Cart>>('/cart');
        return data.data || null;
      } catch (error: any) {
        // If API is not available or connection refused, return null
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
          return null;
        }
        throw error;
      }
    },
    enabled: !!session,
    retry: false, // Don't retry on connection errors
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Add item to cart
export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, quantity = 1 }: { bookId: number; quantity?: number }) => {
      const { data } = await api.post<ApiResponse<CartItem>>('/cart', {
        bookId,
        quantity,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    },
  });
};

// Update cart item quantity
export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      const { data } = await api.put<ApiResponse<CartItem>>(`/cart/${itemId}`, {
        quantity,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cart');
    },
  });
};

// Remove item from cart
export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/cart/${itemId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Removed from cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove from cart');
    },
  });
};

// Clear entire cart
export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ApiResponse<void>>('/cart');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Cart cleared');
    },
  });
};
