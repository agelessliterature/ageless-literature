'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import BenefitsPanel from '@/components/membership/BenefitsPanel';
import { membershipBenefits, type MembershipPlanSlug } from '@/config/membershipBenefits';
import CancelMembershipModal from '@/components/modals/CancelMembershipModal';
import ChangePlanModal from '@/components/modals/ChangePlanModal';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
}

interface UserSubscription {
  id: string;
  userId: number;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused' | 'trialing';
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  pausedAt: string | null;
  resumedAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  plan: MembershipPlan;
}

export default function AccountMembershipPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Fetch user's subscription - same endpoint as public membership page
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<{
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
    enabled: status === 'authenticated',
  });

  // Fetch available plans - same endpoint as public membership page
  const { data: plansData, isLoading: plansLoading } = useQuery<{
    success: boolean;
    data: MembershipPlan[];
  }>({
    queryKey: ['membershipPlans'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/plans'));
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
  });

  // Pause subscription mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/pause'), { method: 'POST' });
      if (!res.ok) throw new Error('Failed to pause subscription');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      toast.success('Membership paused successfully');
    },
    onError: () => {
      toast.error('Failed to pause membership');
    },
  });

  // Resume subscription mutation
  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/resume'), { method: 'POST' });
      if (!res.ok) throw new Error('Failed to resume subscription');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      toast.success('Membership resumed successfully');
    },
    onError: () => {
      toast.error('Failed to resume membership');
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (immediate: boolean) => {
      const res = await fetch(getApiUrl('api/memberships/cancel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate }),
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      setShowCancelModal(false);
      toast.success('Membership cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel membership');
    },
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (newPlanId: string) => {
      const res = await fetch(getApiUrl('api/memberships/change-plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanId }),
      });
      if (!res.ok) throw new Error('Failed to change plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      setShowChangePlanModal(false);
      toast.success('Plan changed successfully');
    },
    onError: () => {
      toast.error('Failed to change plan');
    },
  });

  const subscription = subscriptionData?.data;
  const plans = plansData?.data || [];

  // Loading state
  if (status === 'loading' || subscriptionLoading || plansLoading) {
    return <PageLoading message="Loading membership..." fullPage={false} />;
  }

  if (!session) return null;

  const getStatusBadge = (status: UserSubscription['status']) => {
    const badges = {
      active: {
        color: 'bg-green-100 text-green-800',
        icon: ['fal', 'check-circle'] as [string, string],
        label: 'Active',
      },
      paused: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: ['fal', 'pause'] as [string, string],
        label: 'Paused',
      },
      cancelled: {
        color: 'bg-red-100 text-red-800',
        icon: ['fal', 'ban'] as [string, string],
        label: 'Cancelled',
      },
      expired: {
        color: 'bg-gray-100 text-gray-800',
        icon: ['fal', 'exclamation-triangle'] as [string, string],
        label: 'Expired',
      },
      past_due: {
        color: 'bg-orange-100 text-orange-800',
        icon: ['fal', 'exclamation-triangle'] as [string, string],
        label: 'Past Due',
      },
      trialing: {
        color: 'bg-blue-100 text-blue-800',
        icon: ['fal', 'crown'] as [string, string],
        label: 'Trial',
      },
    };
    const badge = badges[status];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium ${badge.color}`}
      >
        <FontAwesomeIcon icon={badge.icon} className="text-sm" />
        {badge.label}
      </span>
    );
  };

  // If no subscription, show upsell to join
  if (!subscription) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Membership</h1>
        <p className="text-gray-600 mb-6 sm:mb-8">Manage your membership subscription</p>

        {/* No Membership - Upsell */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 p-8 text-center">
          <FontAwesomeIcon icon={['fal', 'crown']} className="text-6xl text-primary mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Unlock Premium Benefits</h2>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Join our membership program to get exclusive access to premium features, early auction
            access, reduced fees, AI tools, and much more.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-left">
            <div className="bg-white/80 p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Silver - $19/month</h3>
              <p className="text-sm text-gray-600">
                Perfect for getting started with premium features
              </p>
            </div>
            <div className="bg-white/80 p-4 border border-primary">
              <div className="inline-block bg-primary text-white text-xs px-2 py-1 mb-2">
                MOST POPULAR
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Gold - $59/month</h3>
              <p className="text-sm text-gray-600">
                Best value with all essential tools and savings
              </p>
            </div>
            <div className="bg-white/80 p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Platinum - $299/month</h3>
              <p className="text-sm text-gray-600">Ultimate experience with concierge service</p>
            </div>
          </div>

          <a
            href="/memberships"
            className="inline-block bg-primary text-white py-3 px-8 font-semibold hover:bg-primary/90 transition-colors"
          >
            View All Plans & Join Now
          </a>
        </div>
      </div>
    );
  }

  // Get current plan benefits
  const currentPlanSlug = subscription.plan.slug.toLowerCase() as MembershipPlanSlug;
  const currentBenefits = membershipBenefits[currentPlanSlug] || [];

  // Show current subscription
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Membership</h1>
      <p className="text-gray-600 mb-6 sm:mb-8">Manage your subscription and benefits</p>

      {/* Current Plan Card */}
      <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <FontAwesomeIcon icon={['fal', 'crown']} className="text-2xl text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">
                {subscription.plan.name} Membership
              </h2>
              {getStatusBadge(subscription.status)}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={['fal', 'calendar']} className="text-base" />
                <span>
                  Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              {subscription.paymentMethodLast4 && (
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={['fal', 'credit-card']} className="text-base" />
                  <span>
                    {subscription.paymentMethodBrand} ****{subscription.paymentMethodLast4}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">${subscription.plan.price}</div>
            <div className="text-sm text-gray-600">per {subscription.plan.interval}</div>
          </div>
        </div>

        {/* Warning banner if cancelling at period end */}
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
            <div className="flex items-start gap-2">
              <FontAwesomeIcon
                icon={['fal', 'exclamation-triangle']}
                className="text-base text-yellow-600 mt-0.5"
              />
              <p className="text-sm text-yellow-800">
                Your membership will be cancelled on{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}. You will still have
                access until then.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <>
              <button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {pauseMutation.isPending ? (
                  <>
                    <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                    Pausing...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={['fal', 'pause']} className="mr-2" />
                    Pause
                  </>
                )}
              </button>
              <button
                onClick={() => setShowChangePlanModal(true)}
                className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <FontAwesomeIcon icon={['fal', 'arrow-up']} className="mr-2" />
                Upgrade/Change Plan
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 border border-red-600 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <FontAwesomeIcon icon={['fal', 'ban']} className="mr-2" />
                Cancel
              </button>
            </>
          )}

          {subscription.status === 'paused' && (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {resumeMutation.isPending ? (
                <>
                  <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                  Resuming...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={['fal', 'play']} className="mr-2" />
                  Resume Membership
                </>
              )}
            </button>
          )}

          <a
            href="/account/membership/billing-history"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center"
          >
            <FontAwesomeIcon icon={['fal', 'history']} className="mr-2" />
            Billing History
          </a>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white shadow-sm border border-gray-200 p-6 mt-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Benefits</h3>
        <BenefitsPanel benefits={currentBenefits} />
      </div>

      {/* Upsell to Upgrade (if not on Platinum) */}
      {currentPlanSlug !== 'platinum' && (
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 p-6 mt-6">
          <div className="flex items-start gap-4">
            <FontAwesomeIcon
              icon={['fal', 'crown']}
              className="text-3xl text-primary flex-shrink-0"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentPlanSlug === 'silver'
                  ? 'Upgrade to Gold or Platinum'
                  : 'Upgrade to Platinum'}
              </h3>
              <p className="text-gray-700 mb-3">
                {currentPlanSlug === 'silver'
                  ? 'Get 67% auction fee savings, AI tools, early access, and more with Gold. Or go all-in with Platinum for concierge service.'
                  : 'Unlock the ultimate experience with personal concierge service, unlimited book library crafting, and zero fees with our bookseller.'}
              </p>
              <button
                onClick={() => setShowChangePlanModal(true)}
                className="bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Upgrade Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      <CancelMembershipModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancelAtPeriodEnd={() => cancelMutation.mutate(false)}
        onCancelImmediately={() => cancelMutation.mutate(true)}
        isPending={cancelMutation.isPending}
        currentPeriodEnd={subscription.currentPeriodEnd}
      />

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={showChangePlanModal}
        onClose={() => setShowChangePlanModal(false)}
        plans={plans}
        currentPlanId={subscription.planId}
        currentPlanPrice={subscription.plan.price}
        onChangePlan={(planId) => changePlanMutation.mutate(planId)}
        isPending={changePlanMutation.isPending}
      />
    </div>
  );
}
