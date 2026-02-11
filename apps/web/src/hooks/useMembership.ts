/**
 * React Hook for Membership Access
 * Provides easy access to current user's membership tier and features
 */

import { useQuery } from '@tanstack/react-query';
import {
  getTierFromSlug,
  type MembershipTier,
  hasFeatureAccess,
  type MembershipFeatures,
} from '@/lib/membershipAccess';
import { getApiUrl } from '@/lib/api';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
}

interface UserSubscription {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused' | 'trialing';
  plan: MembershipPlan;
}

export function useMembership() {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: UserSubscription | null;
  }>({
    queryKey: ['userSubscription'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/subscription'));
      if (!res.ok) {
        if (res.status === 401) return { success: true, data: null };
        throw new Error('Failed to fetch subscription');
      }
      return res.json();
    },
    retry: false,
  });

  const subscription = data?.data;
  const tier: MembershipTier =
    subscription?.status === 'active' ? getTierFromSlug(subscription.plan.slug) : 'none';

  return {
    subscription,
    tier,
    isActive: subscription?.status === 'active',
    isPaused: subscription?.status === 'paused',
    isCancelled: subscription?.status === 'cancelled',
    isLoading,
    error,
    hasAccess: (feature: keyof MembershipFeatures) => hasFeatureAccess(tier, feature),
  };
}
