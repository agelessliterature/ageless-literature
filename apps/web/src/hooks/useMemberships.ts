import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { MembershipPlan, UserMembership, ApiResponse } from '@/types';
import toast from 'react-hot-toast';

// Fetch all membership plans
export const useMembershipPlans = () => {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MembershipPlan[]>>('/memberships/plans');
      return data.data || [];
    },
  });
};

// Fetch user's current membership
export const useUserMembership = () => {
  return useQuery({
    queryKey: ['user-membership'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<UserMembership>>('/memberships/current');
      return data.data;
    },
  });
};

// Subscribe to a membership plan
export const useSubscribeMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: number) => {
      const { data } = await api.post<ApiResponse<{ clientSecret: string }>>(
        '/memberships/subscribe',
        {
          planId,
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-membership'] });
      toast.success('Subscription successful');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    },
  });
};

// Cancel membership
export const useCancelMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<void>>('/memberships/cancel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-membership'] });
      toast.success('Membership cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel membership');
    },
  });
};
