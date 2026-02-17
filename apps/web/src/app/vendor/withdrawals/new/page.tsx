'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import { formatMoney } from '@/lib/format';

export default function NewWithdrawalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch vendor dashboard for balance info
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/dashboard'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  // Withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (data: { amount: string; method: string; vendorNotes: string }) => {
      const res = await fetch(getApiUrl('api/vendor/withdraw'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to create withdrawal request');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Withdrawal request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendor-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-withdrawals'] });
      router.push('/vendor/withdrawals');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit withdrawal request');
    },
  });

  if (!session) {
    router.push('/auth/login');
    return null;
  }

  if (isLoading) {
    return <PageLoading message="Loading withdrawal form..." fullPage={false} />;
  }

  const vendor = dashboardData?.vendor;
  const payoutSettings = dashboardData?.payoutSettings;
  const availableBalance = parseFloat(vendor?.balanceAvailable || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!method) {
      toast.error('Please select a payout method');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > availableBalance) {
      toast.error('Amount exceeds available balance');
      return;
    }

    withdrawalMutation.mutate({
      amount,
      method,
      vendorNotes: notes,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/vendor/withdrawals"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Withdrawals
        </Link>
        <h1 className="text-3xl font-bold text-primary">Request Withdrawal</h1>
        <p className="text-gray-600 mt-2">Transfer your available balance to your payout method</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 mb-8">
        <p className="text-sm text-gray-600 mb-1">Available Balance</p>
        <p className="text-4xl font-bold text-green-600">
          {formatMoney(availableBalance, { fromCents: false })}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Minimum withdrawal: $10.00 | Maximum withdrawal:{' '}
          {formatMoney(availableBalance, { fromCents: false })}
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 p-4 mb-8 flex gap-3">
        <FontAwesomeIcon
          icon={['fal', 'info-circle']}
          className="text-xl text-blue-600 flex-shrink-0 mt-0.5"
        />
        <div className="text-sm text-gray-700">
          <p className="font-medium text-gray-900 mb-1">Processing Time</p>
          <p>
            Withdrawals are typically processed within 2-3 business days. You'll receive an email
            notification once your withdrawal is approved and processed.
          </p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8">
        {/* Amount */}
        <div className="mb-6">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            Withdrawal Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="10"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter amount between $10.00 and {formatMoney(availableBalance, { fromCents: false })}
          </p>
        </div>

        {/* Payout Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Payout Method *</label>
          <div className="space-y-3">
            {/* Stripe */}
            {payoutSettings?.stripeConnected && (
              <label className="flex items-center gap-3 p-4 border border-gray-300 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="method"
                  value="stripe"
                  checked={method === 'stripe'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="text-base text-primary"
                />
                <FontAwesomeIcon icon={['fab', 'stripe']} className="text-2xl text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Stripe Connect</p>
                  <p className="text-xs text-gray-500">Connected account</p>
                </div>
              </label>
            )}

            {/* PayPal */}
            {payoutSettings?.paypalEmail && (
              <label className="flex items-center gap-3 p-4 border border-gray-300 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="method"
                  value="paypal"
                  checked={method === 'paypal'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="text-base text-primary"
                />
                <FontAwesomeIcon icon={['fab', 'paypal']} className="text-2xl text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">PayPal</p>
                  <p className="text-xs text-gray-500">{payoutSettings.paypalEmail}</p>
                </div>
              </label>
            )}

            {/* No methods configured */}
            {!payoutSettings?.stripeConnected && !payoutSettings?.paypalEmail && (
              <div className="p-4 border border-yellow-300 bg-yellow-50 text-center">
                <p className="text-sm text-gray-700 mb-3">No payout methods configured</p>
                <Link
                  href="/vendor/settings/payouts"
                  className="inline-block bg-primary text-white px-4 py-2 text-sm hover:bg-opacity-90 transition"
                >
                  Setup Payout Method
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Add any additional notes about this withdrawal..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={withdrawalMutation.isPending || !method || !amount}
            className="flex-1 bg-primary text-white px-6 py-3 font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawalMutation.isPending ? 'Submitting...' : 'Submit Withdrawal Request'}
          </button>
          <Link
            href="/vendor/withdrawals"
            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
