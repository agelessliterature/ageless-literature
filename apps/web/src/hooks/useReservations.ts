import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import type { Reservation, ApiResponse } from '@/types';
import toast from 'react-hot-toast';

// Fetch user's reservations
export const useReservations = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Reservation[]>>('/reservations');
      return data.data || [];
    },
    enabled: !!session,
  });
};

// Create a reservation
export const useCreateReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: number) => {
      const { data } = await api.post<ApiResponse<Reservation>>('/reservations', {
        bookId,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Book reserved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reserve book');
    },
  });
};

// Cancel a reservation
export const useCancelReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/reservations/${reservationId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Reservation cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel reservation');
    },
  });
};
