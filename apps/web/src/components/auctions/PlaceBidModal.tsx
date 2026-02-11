'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { AuctionSummary } from '@/types/Auction';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PhoneInput from '@/components/forms/PhoneInput';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PlaceBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  auction: AuctionSummary;
}

function BidForm({ auction, onClose, onCollectCardChange, setupIntentClientSecret }: { 
  auction: AuctionSummary; 
  onClose: () => void;
  onCollectCardChange: (collect: boolean) => void;
  setupIntentClientSecret: string | null;
}) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [collectCard, setCollectCard] = useState(false);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const currentBid = Number(auction.currentBid);
  const minBid = currentBid + 1;

  // Notify parent when collectCard changes
  useEffect(() => {
    onCollectCardChange(collectCard);
    // Reset payment ready state when unchecking
    if (!collectCard) {
      setIsPaymentReady(false);
    }
  }, [collectCard, onCollectCardChange]);

  const placeBidMutation = useMutation({
    mutationFn: async ({ amount, paymentMethodId }: { amount: number; paymentMethodId?: string }) => {
      const response = await api.post(`/auctions/${auction.id}/bids`, { 
        amount,
        paymentMethodId,
        smsOptIn,
        phoneNumber: smsOptIn ? phoneNumber : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Bid placed successfully!');
      queryClient.invalidateQueries({ queryKey: ['activeAuction'] });
      router.refresh();
      onClose();
      setBidAmount('');
      setCollectCard(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to place bid';
      toast.error(message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount < minBid) {
      toast.error(`Bid must be at least $${minBid.toFixed(2)}`);
      return;
    }

    let paymentMethodId: string | undefined;

    // If user wants to save card, confirm the setup intent with Stripe
    if (collectCard) {
      if (!stripe || !elements || !setupIntentClientSecret) {
        toast.error('Payment system not initialized. Please wait...');
        return;
      }

      // Submit the elements first (required by Stripe)
      const submitResult = await elements.submit();
      if (submitResult.error) {
        toast.error(submitResult.error.message || 'Failed to submit payment details');
        return;
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: setupIntentClientSecret,
        confirmParams: {
          return_url: window.location.href, // Not used, but required
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Failed to save payment method');
        return;
      }

      if (setupIntent?.payment_method) {
        paymentMethodId = setupIntent.payment_method as string;
      }
    }

    placeBidMutation.mutate({ amount, paymentMethodId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-primary p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={['fal', 'gavel'] as [string, string]} className="text-2xl" />
              <h2 className="text-2xl font-bold">Place Your Bid</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              disabled={placeBidMutation.isPending}
            >
              <FontAwesomeIcon icon={['fal', 'times'] as [string, string]} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <div className="bg-secondary-50 border border-secondary-200 p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Current Bid:</span>
                <span className="text-lg font-bold text-secondary-900">
                  ${currentBid.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Minimum Bid:</span>
                <span className="text-lg font-bold text-secondary-900">${minBid.toFixed(2)}</span>
              </div>
            </div>

            <label htmlFor="bidAmount" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Bid Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                $
              </span>
              <input
                type="number"
                id="bidAmount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={minBid}
                step="0.01"
                placeholder={minBid.toFixed(2)}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 focus:border-secondary-600 focus:outline-none text-lg font-semibold"
                required
                disabled={placeBidMutation.isPending}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter an amount of ${minBid.toFixed(2)} or higher
            </p>
          </div>

          {/* SMS Notifications Opt-in */}
          <div className="mb-6 border border-gray-200 p-4 rounded-lg bg-gray-50">
            <div className="flex items-start gap-3 mb-3">
              <input
                type="checkbox"
                id="smsOptIn"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
                className="mt-1 w-4 h-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                disabled={placeBidMutation.isPending}
              />
              <label htmlFor="smsOptIn" className="text-sm font-medium text-gray-700 cursor-pointer">
                <div>Receive SMS notifications when you're outbid</div>
                <div className="text-xs text-gray-500 mt-1">Stay updated on auction status via text message</div>
              </label>
            </div>
            {smsOptIn && (
              <div className="mt-3">
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:border-secondary-600 focus:outline-none text-sm"
                  disabled={placeBidMutation.isPending}
                />
              </div>
            )}
          </div>

          {/* Card Collection */}
          <div className="mb-6 border border-gray-200 p-4 rounded-lg bg-gray-50">
            <div className="flex items-start gap-3 mb-3">
              <input
                type="checkbox"
                id="collectCard"
                checked={collectCard}
                onChange={(e) => setCollectCard(e.target.checked)}
                className="mt-1 w-4 h-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                disabled={placeBidMutation.isPending}
              />
              <label htmlFor="collectCard" className="text-sm font-medium text-gray-700 cursor-pointer">
                <div>Save payment method for automatic charge if I win</div>
                <div className="text-xs text-gray-500 mt-1">
                  Your card will only be charged if you win the auction. Secured by Stripe.
                </div>
              </label>
            </div>
            {collectCard && (
              <div className="mt-3">
                <PaymentElement 
                  options={{
                    layout: 'accordion',
                  }}
                  onChange={(e) => {
                    setIsPaymentReady(e.complete);
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  <FontAwesomeIcon icon={['fal', 'lock'] as [string, string]} className="mr-1" />
                  Secured by Stripe. We never see your card details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        {bidAmount && collectCard && isPaymentReady && (
          <div className="p-6 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                disabled={placeBidMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-secondary text-white font-semibold hover:from-secondary-700 hover:to-secondary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={placeBidMutation.isPending}
              >
                {placeBidMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={['fal', 'spinner-third'] as [string, string]} spin />
                    Placing Bid...
                  </span>
                ) : (
                  'Place Bid'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlaceBidModal({ isOpen, onClose, auction }: PlaceBidModalProps) {
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
  const [collectCard, setCollectCard] = useState(false);

  // Fetch setup intent when user opts to save card
  useEffect(() => {
    if (collectCard && !setupIntentClientSecret) {
      const fetchSetupIntent = async () => {
        try {
          const response = await api.post('/stripe/setup-intent');
          setSetupIntentClientSecret(response.data.clientSecret);
        } catch (error) {
          console.error('Failed to create setup intent:', error);
          toast.error('Failed to initialize payment method setup');
        }
      };
      fetchSetupIntent();
    }
  }, [collectCard, setupIntentClientSecret]);

  if (!isOpen) return null;

  // Always provide Elements context, with or without clientSecret
  const stripeOptions = setupIntentClientSecret
    ? { clientSecret: setupIntentClientSecret }
    : { mode: 'setup' as const, currency: 'usd' };

  return (
    <Elements stripe={stripePromise} options={stripeOptions}>
      <BidForm 
        auction={auction} 
        onClose={onClose} 
        onCollectCardChange={setCollectCard}
        setupIntentClientSecret={setupIntentClientSecret}
      />
    </Elements>
  );
}
