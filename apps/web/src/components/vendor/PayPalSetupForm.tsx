'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Session } from 'next-auth';
import { getApiUrl } from '@/lib/api';

interface PayPalSetupFormProps {
  currentEmail?: string | null;
  onSuccess?: () => void;
  session: Session | null;
}

export default function PayPalSetupForm({
  currentEmail,
  onSuccess,
  session,
}: PayPalSetupFormProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateEmailMutation = useMutation({
    mutationFn: async (paypalEmail: string) => {
      const response = await fetch(getApiUrl('api/vendor/paypal-email'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ paypalEmail }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update PayPal email');
      }

      return response.json();
    },
    onSuccess: () => {
      setError(null);
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    updateEmailMutation.mutate(email);
  };

  const isConfigured = !!currentEmail;

  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-4xl bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="text-xl text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">PayPal</h3>
            {isConfigured ? (
              <p className="text-sm text-green-600">{currentEmail}</p>
            ) : (
              <p className="text-sm text-gray-600">Manual payouts via PayPal</p>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            {updateEmailMutation.isSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-sm text-green-800">
                PayPal email updated successfully!
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">About PayPal Payouts</p>
              <ul className="space-y-1 text-xs">
                <li>• Manual processing by admin team</li>
                <li>• 2-5 business days after approval</li>
                <li>• Email notification when sent</li>
                <li>• Must match your PayPal account email</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PayPal Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 border border-gray-300 font-mono focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={updateEmailMutation.isPending}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Email associated with your PayPal account
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={updateEmailMutation.isPending || !email}
                className="flex-1 bg-primary text-white px-6 py-2 font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {updateEmailMutation.isPending
                  ? 'Saving...'
                  : isConfigured
                    ? 'Update PayPal Email'
                    : 'Save PayPal Email'}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-6 py-2 border border-gray-300 font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Your PayPal email is securely stored and only used for payouts
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
