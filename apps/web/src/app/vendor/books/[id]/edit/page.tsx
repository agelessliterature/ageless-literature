'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import BookForm from '@/components/forms/BookForm';
import AuctionModal from '@/components/modals/AuctionModal';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import axios from 'axios';

export default function EditBookPage() {
  const params = useParams();
  const bookId = params.id as string;
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const response = await axios.get(`/api/vendor/products/${bookId}`);
      return response.data.data;
    },
  });

  // Check for existing active auction
  const { data: activeAuction } = useQuery({
    queryKey: ['book-auction', bookId],
    queryFn: async () => {
      const response = await axios.get(`/api/auctions?type=book&status=active`);
      const auctions = response.data.data || [];
      return auctions.find((a: any) => a.auctionableId === bookId);
    },
    enabled: !!bookId,
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

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Book not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Edit Book</h1>

          <div className="flex items-center gap-3">
            {/* View Product Button */}
            <a
              href={`/books/${book.slug || book.sid || book.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <FontAwesomeIcon icon={['fal', 'eye']} />
              <span>View Product</span>
            </a>

            {/* Create Auction Button */}
            {!activeAuction && (
              <button
                onClick={() => setShowAuctionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
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
        </div>

        <BookForm book={book} isEdit={true} />

        {/* Auction Modal */}
        <AuctionModal
          isOpen={showAuctionModal}
          onClose={() => setShowAuctionModal(false)}
          item={book}
          itemType="book"
        />
      </div>
    </div>
  );
}
