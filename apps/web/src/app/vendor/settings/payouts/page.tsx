'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StripeConnectSetup from '@/components/vendor/StripeConnectSetup';
import PayPalSetupForm from '@/components/vendor/PayPalSetupForm';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import { formatMoney } from '@/lib/format';

interface PayoutSettings {
  payoutMethod: 'stripe' | 'paypal' | null;
  stripeAccountId: string | null;
  stripeAccountStatus: 'pending' | 'active' | 'restricted' | 'inactive' | null;
  paypalEmail: string | null;
  balanceAvailable: number;
  balancePending: number;
  balancePaid: number;
}

export default function VendorPayoutSettingsPage() {
  const { data: session } = useSession();
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | ''>('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Check for Stripe redirect params
  useEffect(() => {
    const stripeStatus = searchParams.get('stripe');
    if (stripeStatus === 'success') {
      setShowSuccessMessage(true);
      queryClient.invalidateQueries({ queryKey: ['payout-settings'] });

      // Clear success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [searchParams, queryClient]);

  // Fetch payout settings
  const {
    data: settings,
    isLoading,
    refetch,
  } = useQuery<PayoutSettings>({
    queryKey: ['payout-settings'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('api/vendor/payout-settings'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch payout settings');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!session,
  });

  // Update payout method
  const updateMethodMutation = useMutation({
    mutationFn: async (payoutMethod: 'stripe' | 'paypal') => {
      const response = await fetch(getApiUrl('api/vendor/payout-method'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ payoutMethod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update payout method');
      }

      return response.json();
    },
    onSuccess: () => {
      refetch();
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    },
  });

  useEffect(() => {
    if (settings?.payoutMethod) {
      setSelectedMethod(settings.payoutMethod);
    }
  }, [settings]);

  const handleMethodChange = (method: 'stripe' | 'paypal') => {
    setSelectedMethod(method);
  };

  const handleSaveMethod = () => {
    if (selectedMethod && selectedMethod !== settings?.payoutMethod) {
      updateMethodMutation.mutate(selectedMethod);
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading payout settings..." fullPage={true} />;
  }

  const canSelectStripe = !!settings?.stripeAccountId && settings?.stripeAccountStatus === 'active';
  const canSelectPayPal = !!settings?.paypalEmail;
  const hasMethodChanged = selectedMethod !== settings?.payoutMethod && selectedMethod !== '';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <a
              href="/vendor/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="text-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Payout Settings</h1>
          </div>
          <p className="text-gray-600">Configure how you want to receive your earnings</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 flex items-center space-x-3">
            <svg
              className="text-xl text-green-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-green-800">Settings updated successfully!</p>
          </div>
        )}

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Available Balance</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {formatMoney(settings?.balanceAvailable, { fromCents: false })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ready for payout</p>
          </div>

          <div className="bg-white border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Pending Balance</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {formatMoney(settings?.balancePending, { fromCents: false })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Processing</p>
          </div>

          <div className="bg-white border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Total Paid</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {formatMoney(settings?.balancePaid, { fromCents: false })}
            </p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>
        </div>

        {/* Current Payout Method Details */}
        {settings?.payoutMethod && (
          <div className="bg-white border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Payout Method</h2>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {settings.payoutMethod === 'stripe' && (
                    <div className="text-5xl bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg
                        className="text-2xl text-indigo-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                      </svg>
                    </div>
                  )}
                  {settings.payoutMethod === 'paypal' && (
                    <div className="text-5xl bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="text-2xl text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.payoutMethod === 'stripe' && 'Stripe Connect'}
                    {settings.payoutMethod === 'paypal' && 'PayPal'}
                  </p>
                  {settings.payoutMethod === 'stripe' && settings.stripeAccountId && (
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">
                        Account ID:{' '}
                        <span className="font-mono text-xs">{settings.stripeAccountId}</span>
                      </p>
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full ${
                          settings.stripeAccountStatus === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {settings.stripeAccountStatus}
                      </span>
                    </div>
                  )}
                  {settings.payoutMethod === 'paypal' && settings.paypalEmail && (
                    <p className="text-sm text-gray-600 mt-1">{settings.paypalEmail}</p>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="text-sm mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Default
              </span>
            </div>
          </div>
        )}

        {/* Payout Method Selection */}
        <div className="bg-white border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Payout Method</h2>

          <div className="space-y-4">
            {/* Stripe Option */}
            <label
              className={`flex items-start p-4 border-2 cursor-pointer transition-colors ${
                selectedMethod === 'stripe'
                  ? 'border-primary bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canSelectStripe ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="payoutMethod"
                value="stripe"
                checked={selectedMethod === 'stripe'}
                onChange={() => handleMethodChange('stripe')}
                disabled={!canSelectStripe}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900">Stripe Connect</span>
                  {settings?.stripeAccountId && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        canSelectStripe
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {canSelectStripe ? 'Active' : settings?.stripeAccountStatus || 'Pending'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Automatic payouts • 1-2 business days • Direct to bank account
                </p>
                {!canSelectStripe && (
                  <p className="text-xs text-orange-600 mt-2">
                    {!settings?.stripeAccountId
                      ? 'Complete Stripe setup below to enable this option'
                      : 'Complete your Stripe account setup to enable automatic payouts'}
                  </p>
                )}
              </div>
            </label>

            {/* PayPal Option */}
            <label
              className={`flex items-start p-4 border-2 cursor-pointer transition-colors ${
                selectedMethod === 'paypal'
                  ? 'border-primary bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canSelectPayPal ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="payoutMethod"
                value="paypal"
                checked={selectedMethod === 'paypal'}
                onChange={() => handleMethodChange('paypal')}
                disabled={!canSelectPayPal}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900">PayPal</span>
                  {settings?.paypalEmail && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {settings.paypalEmail}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Manual payouts • 2-5 business days • Requires admin approval
                </p>
                {!canSelectPayPal && (
                  <p className="text-xs text-orange-600 mt-2">
                    Add your PayPal email below to enable this option
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Save Button */}
          {hasMethodChanged && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSaveMethod}
                disabled={updateMethodMutation.isPending}
                className="w-full bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMethodMutation.isPending ? 'Saving...' : 'Save Payout Method'}
              </button>
            </div>
          )}

          {updateMethodMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                {updateMethodMutation.error instanceof Error
                  ? updateMethodMutation.error.message
                  : 'Failed to update payout method'}
              </p>
            </div>
          )}
        </div>

        {/* Setup Forms */}
        <div className="space-y-6">
          <StripeConnectSetup
            session={session}
            onSuccess={() => {
              refetch();
              setShowSuccessMessage(true);
              setTimeout(() => setShowSuccessMessage(false), 5000);
            }}
          />

          <PayPalSetupForm
            session={session}
            currentEmail={settings?.paypalEmail}
            onSuccess={() => {
              refetch();
              setShowSuccessMessage(true);
              setTimeout(() => setShowSuccessMessage(false), 5000);
            }}
          />
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Stripe Connect (Recommended):</strong> Best for automatic payouts. Once your
              account is approved, earnings are automatically transferred to your bank account.
            </p>
            <p>
              <strong>PayPal:</strong> Good alternative if you prefer PayPal. Payouts are processed
              manually by our team after approval.
            </p>
            <p className="mt-4">
              <strong>Minimum payout:</strong> $25.00 • <strong>Payout schedule:</strong> Weekly
              (Fridays)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
