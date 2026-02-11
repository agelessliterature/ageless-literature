/**
 * Hook to check if the current user is a vendor
 */

import { useQuery } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import api from '@/lib/api';

interface VendorStatus {
  isVendor: boolean;
  status: string | null;
  shopName?: string;
  shopUrl?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export function useVendorStatus() {
  const { data: session } = useSession();

  return useQuery<VendorStatus>({
    queryKey: ['vendor-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/vendor/status');
        return response.data.data;
      } catch (error: any) {
        // If token is invalid or expired, sign out and redirect to home
        if (
          error.response?.data?.message?.includes('Invalid or expired token') ||
          error.response?.data?.message?.includes('jwt expired')
        ) {
          console.warn('Token expired - signing out');
          await signOut({ redirect: false });
          window.location.href = '/';
          throw new Error('Session expired');
        }
        throw error;
      }
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on token expiration
  });
}
