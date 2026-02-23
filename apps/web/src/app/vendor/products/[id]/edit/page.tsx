'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ProductForm from '@/components/forms/ProductForm';
import AuctionModal from '@/components/modals/AuctionModal';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get(`/vendor/collectibles/${productId}`);
      return response.data.data;
    },
  });

  // Check for existing active auction
  const { data: activeAuction } = useQuery({
    queryKey: ['product-auction', productId],
    queryFn: async () => {
      const response = await api.get(`/auctions?type=product&status=active`);
      const auctions = response.data.data || [];
      return auctions.find((a: any) => a.auctionableId === productId);
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Product not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Edit Collectible</h1>

          {/* Create Auction Button */}
          {!activeAuction && (
            <button
              onClick={() => setShowAuctionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <FontAwesomeIcon icon={['fal', 'gavel']} />
              <span>Create Auction</span>
            </button>
          )}

          {/* Active Auction Badge */}
          {activeAuction && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-sm font-medium">
              <FontAwesomeIcon icon={['fal', 'gavel']} />
              <span className="font-semibold">Active Auction</span>
            </div>
          )}
        </div>

        <ProductForm product={product} isEdit={true} />

        {/* Auction Modal */}
        <AuctionModal
          isOpen={showAuctionModal}
          onClose={() => setShowAuctionModal(false)}
          item={product}
          itemType="product"
        />
      </div>
    </div>
  );
}
