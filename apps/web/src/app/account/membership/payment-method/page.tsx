'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import Link from 'next/link';
import getStripe from '@/lib/stripe';
import { getApiUrl } from '@/lib/api';

function PaymentMethodForm() {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: subscriptionData } = useQuery<{
    success: boolean;
    data: {
      id: string;
      paymentMethodLast4: string | null;
      paymentMethodBrand: string | null;
    } | null;
  }>({
    queryKey: ['userSubscription'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/subscription'));
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return res.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update payment method on backend
      const res = await fetch(getApiUrl('api/memberships/payment-method'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update payment method');
      }

      toast.success('Payment method updated successfully');
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      cardElement.clear();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  const subscription = subscriptionData?.data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Method</h1>
          <p className="text-gray-600">Update your payment information</p>
        </div>
        <Link
          href="/account/membership"
          className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700"
        >
          Back
        </Link>
      </div>

      {!subscription ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon
              icon={['fal', 'exclamation-circle']}
              className="text-xl text-yellow-600 mt-0.5"
            />
            <p className="text-sm text-yellow-800">You don't have an active subscription.</p>
          </div>
        </div>
      ) : (
        <>
          {subscription.paymentMethodLast4 && (
            <div className="bg-white border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold mb-2">Current Payment Method</h2>
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={['fal', 'credit-card']} className="text-gray-600" />
                <span className="capitalize">{subscription.paymentMethodBrand}</span>
                <span>••••{subscription.paymentMethodLast4}</span>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 p-6">
            <h2 className="font-semibold mb-4">Update Payment Method</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 border border-gray-300 rounded">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full px-6 py-3 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Update Payment Method'
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentMethodPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stripePromise] = useState(() => getStripe());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-primary" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodForm />
    </Elements>
  );
}
