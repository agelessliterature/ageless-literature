'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';

interface BuyerOfferModalProps {
  onClose: () => void;
  onSuccess: () => void;
  item: {
    type: 'book' | 'product';
    id: number;
    title: string;
    price: number;
    primaryImage?: string;
    vendor?: {
      id: number;
      shopName: string;
    };
  };
}

export default function BuyerOfferModal({ onClose, onSuccess, item }: BuyerOfferModalProps) {
  const [offerPrice, setOfferPrice] = useState('');
  const [message, setMessage] = useState('');

  const submitOffer = useMutation({
    mutationFn: async () => {
      const res = await api.post('/users/offers', {
        itemType: item.type,
        itemId: item.id,
        offerPrice: parseFloat(offerPrice),
        message: message.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerPrice || parseFloat(offerPrice) <= 0) return;
    submitOffer.mutate();
  };

  const discount = offerPrice ? Math.round((1 - parseFloat(offerPrice) / item.price) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ borderRadius: '1.5rem' }}
      >
        {/* Header */}
        <div className="bg-primary text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Make an Offer</h2>
            {item.vendor && <p className="text-sm text-white/80 mt-1">to {item.vendor.shopName}</p>}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Item Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {item.primaryImage && (
              <img
                src={item.primaryImage}
                alt={item.title}
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{item.title}</h3>
              <p className="text-lg font-bold text-primary mt-1">
                ${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Offer Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Offer Price (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 focus:border-primary focus:outline-none text-lg font-semibold"
                style={{ borderRadius: '0.75rem' }}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
            {offerPrice && parseFloat(offerPrice) > 0 && (
              <p className={`text-sm mt-2 ${discount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {discount > 0
                  ? `${discount}% below asking price`
                  : discount < 0
                    ? `${Math.abs(discount)}% above asking price`
                    : 'Same as asking price'}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 focus:border-primary focus:outline-none resize-none"
              style={{ borderRadius: '0.75rem' }}
              rows={3}
              placeholder="Add a message to the seller..."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-1">{message.length}/500</p>
          </div>

          {/* Error Message */}
          {submitOffer.isError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {(submitOffer.error as any)?.response?.data?.message ||
                'Failed to submit offer. Please try again.'}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!offerPrice || parseFloat(offerPrice) <= 0 || submitOffer.isPending}
            className="w-full bg-primary text-white py-4 font-bold text-lg hover:bg-secondary hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-primary hover:border-secondary"
            style={{ borderRadius: '1.5rem' }}
          >
            {submitOffer.isPending ? (
              <>
                <FontAwesomeIcon icon={['fal', 'spinner-third']} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fal', 'paper-plane']} />
                Submit Offer
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            The seller will be notified and can accept or decline your offer. Offers expire in 7
            days.
          </p>
        </form>
      </div>
    </div>
  );
}
