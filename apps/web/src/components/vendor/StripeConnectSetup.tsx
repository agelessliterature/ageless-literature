'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Session } from 'next-auth';
import { getApiUrl } from '@/lib/api';

interface StripeConnectSetupProps {
  onSuccess?: () => void;
  session: Session | null;
}

interface StripeAccountStatus {
  hasAccount: boolean;
  status: 'pending' | 'active' | 'restricted' | 'inactive' | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export default function StripeConnectSetup({ onSuccess, session }: StripeConnectSetupProps) {
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch current Stripe account status
  const {
    data: accountStatus,
    isLoading: statusLoading,
    refetch,
  } = useQuery<StripeAccountStatus>({
    queryKey: ['stripe-account-status'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('api/stripe/connect/status'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch account status');
      }

      const result = await response.json();
      return result.data || result;
    },
    enabled: !!session,
  });

  // Create Stripe Connect account
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl('api/stripe/connect/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create account');
      }

      return response.json();
    },
    onSuccess: async () => {
      await refetch();
      onSuccess?.();
      // Automatically start onboarding after account creation
      setTimeout(() => {
        onboardingMutation.mutate();
      }, 500);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Get onboarding link
  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl('api/stripe/connect/onboard'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/vendor/settings/payouts?stripe=success`,
          refreshUrl: `${window.location.origin}/vendor/settings/payouts?stripe=refresh`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get onboarding link');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      if (data?.data?.url) {
        window.location.href = data.data.url;
      } else if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error('No URL in response:', data);
        setError('Failed to get onboarding URL');
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Get Express dashboard login link
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl('api/stripe/connect/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get login link');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Open dashboard in new tab
      const url = data?.data?.url || data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        console.error('No URL in dashboard response:', data);
        setError('Failed to get dashboard URL');
      }
    },
    onError: (err: Error) => {
      console.error('Dashboard login error:', err);
      setError(err.message);
    },
  });

  const handleCreateAccount = () => {
    setError(null);
    createAccountMutation.mutate();
  };

  const handleStartOnboarding = () => {
    setError(null);
    onboardingMutation.mutate();
  };

  const handleOpenDashboard = () => {
    setError(null);
    loginMutation.mutate();
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full text-3xl border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasAccount = accountStatus?.hasAccount === true;
  const isActive = accountStatus?.status === 'active';
  const isPending = accountStatus?.status === 'pending';
  const hasPastDueRequirements = (accountStatus?.requirements?.past_due?.length || 0) > 0;
  const isConfigured = hasAccount && isActive && accountStatus.payoutsEnabled;

  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-4xl bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="text-2xl text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Stripe Connect</h3>
            {isConfigured ? (
              <p className="text-sm text-green-600">Active • Payouts enabled</p>
            ) : hasAccount ? (
              <p className="text-sm text-yellow-600">{accountStatus.status} • Setup required</p>
            ) : (
              <p className="text-sm text-gray-600">Automatic payouts to your bank account</p>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-800">
              <p className="font-medium mb-2">{error}</p>
              {error.includes('signed up for Connect') && (
                <div className="mt-2 text-xs">
                  <p className="font-medium mb-1">To enable Stripe Connect:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      Go to{' '}
                      <a
                        href="https://dashboard.stripe.com/connect/accounts/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Stripe Dashboard - Connect
                      </a>
                    </li>
                    <li>Click "Get Started" to enable Connect</li>
                    <li>Return here and try again</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {!hasAccount ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Why Stripe Connect?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Automatic payouts - no manual processing</li>
                  <li>• Secure bank account verification</li>
                  <li>• Fast transfers (1-2 business days)</li>
                  <li>• Professional earnings dashboard</li>
                </ul>
              </div>

              <button
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending}
                className="w-full bg-primary text-white px-6 py-2 font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {createAccountMutation.isPending ? 'Creating Account...' : 'Connect with Stripe'}
              </button>
            </div>
          ) : isConfigured ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <svg className="text-base text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h4 className="text-sm font-medium text-green-900">Account Active</h4>
                </div>
                <p className="text-xs text-green-800">
                  Your Stripe account is fully set up and ready to receive payouts.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleOpenDashboard}
                  disabled={loginMutation.isPending}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {loginMutation.isPending ? 'Opening...' : 'Open Dashboard'}
                </button>
                <button
                  onClick={handleStartOnboarding}
                  disabled={onboardingMutation.isPending}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Update Details
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">
                  {isPending ? 'Setup Incomplete' : 'Action Required'}
                </h4>
                <p className="text-xs text-yellow-800 mb-2">
                  {isPending
                    ? 'Complete your Stripe account setup to enable payouts.'
                    : 'Additional information required to enable payouts.'}
                </p>

                {accountStatus.requirements &&
                  (hasPastDueRequirements ||
                    (accountStatus.requirements.currently_due?.length || 0) > 0) && (
                    <div className="space-y-1 mt-2">
                      {accountStatus.requirements.past_due?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-yellow-900">Past Due:</p>
                          <ul className="text-xs text-yellow-800 ml-3">
                            {accountStatus.requirements.past_due.slice(0, 3).map((req) => (
                              <li key={req}>• {req.replace(/_/g, ' ')}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              <button
                onClick={handleStartOnboarding}
                disabled={onboardingMutation.isPending}
                className="w-full bg-primary text-white px-6 py-2 font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {onboardingMutation.isPending ? 'Loading...' : 'Complete Setup'}
              </button>
            </div>
          )}

          {hasAccount && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Securely connected via Stripe</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
