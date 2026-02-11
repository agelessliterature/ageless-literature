import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import type { WishlistItem, ApiResponse } from '@/types';
import toast from 'react-hot-toast';

// Fetch user's wishlist
export const useWishlist = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<WishlistItem[]>>('/wishlist');
      return data.data || [];
    },
    enabled: !!session,
  });
};

// Add item to wishlist
export const useAddToWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: number) => {
      const { data } = await api.post<ApiResponse<WishlistItem>>('/wishlist', {
        bookId,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Added to wishlist');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add to wishlist');
    },
  });
};

// Remove item from wishlist
export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/wishlist/${itemId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove from wishlist');
    },
  });
};

// Check if book is in wishlist
export const useIsInWishlist = (bookId: number) => {
  const { data: wishlist } = useWishlist();

  return wishlist?.some((item) => item.bookId === bookId) || false;
};
