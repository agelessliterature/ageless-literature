'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { Book } from '@/types/Book';
import { Product } from '@/types/Product';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatMoney } from '@/lib/format';

interface AuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Book | Product;
  itemType: 'book' | 'product';
}

interface AuctionFormData {
  startingBid: string;
  reservePrice: string;
  startTime: string;
  endTime: string;
  description: string;
}

export default function AuctionModal({ isOpen, onClose, item, itemType }: AuctionModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AuctionFormData>({
    startingBid: '',
    reservePrice: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    description: '',
  });

  const createAuctionMutation = useMutation({
    mutationFn: async (data: AuctionFormData) => {
      const response = await api.post('/auctions', {
        auctionableType: itemType,
        auctionableId: item.id,
        startingPrice: parseFloat(data.startingBid),
        reservePrice: parseFloat(data.reservePrice),
        startDate: new Date(data.startTime).toISOString(),
        endDate: new Date(data.endTime).toISOString(),
        description: data.description,
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success('Auction created successfully!');
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: [itemType === 'book' ? 'books' : 'products'] });
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create auction';
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAuctionMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={['fal', 'gavel']} className="text-2xl text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Create Auction</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={createAuctionMutation.isPending}
          >
            <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
          </button>
        </div>

        {/* Item Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-4">
            {item.images && item.images[0] && (
              <img
                src={item.images[0].url}
                alt={item.title}
                className="w-24 h-24 object-cover border border-gray-300"
              />
            )}
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">
                {itemType === 'book' ? 'Book' : 'Product'}
              </p>
              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
              {'author' in item && item.author && (
                <p className="text-sm text-gray-600">by {item.author}</p>
              )}
              {'artist' in item && item.artist && (
                <p className="text-sm text-gray-600">by {item.artist}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Current Price: {formatMoney(item.price)}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Starting Bid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Bid <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                name="startingBid"
                value={formData.startingBid}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum bid required to start the auction</p>
          </div>

          {/* Reserve Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reserve Price (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                name="reservePrice"
                value={formData.reservePrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum price you're willing to accept. Hidden from bidders.
            </p>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Auction will automatically close at this time
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auction Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
              placeholder="Additional details about this auction, special terms, etc."
            />
          </div>

          {/* Error Message */}
          {createAuctionMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3">
              {createAuctionMutation.error?.message || 'Failed to create auction'}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createAuctionMutation.isPending}
              className="flex-1 bg-green-600 text-white px-6 py-3 font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createAuctionMutation.isPending ? (
                <>
                  <FontAwesomeIcon icon={['fal', 'spinner-third']} spin />
                  Creating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={['fal', 'gavel']} />
                  Create Auction
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={createAuctionMutation.isPending}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
