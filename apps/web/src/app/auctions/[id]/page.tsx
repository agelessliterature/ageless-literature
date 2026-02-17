'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';

/**
 * Auction Detail Page
 * Fetches the auction by ID, resolves the associated book/product,
 * and redirects to the product detail page with ?auctionId=
 */
export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auctionId) return;

    const fetchAndRedirect = async () => {
      try {
        const response = await api.get(`/auctions/${auctionId}`);
        if (response.data?.success && response.data?.data) {
          const auction = response.data.data;
          const item = auction.item || auction.book || auction.product;

          if (item?.slug) {
            router.replace(withBasePath(`/products/${item.slug}?auctionId=${auctionId}`));
            return;
          }

          // Fallback: use auctionableType and auctionableId to build a URL
          if (auction.auctionableType && auction.auctionableId) {
            const type = auction.auctionableType; // 'book' or 'product'
            try {
              const endpoint =
                type === 'book'
                  ? `/shop/${auction.auctionableId}`
                  : `/products/${auction.auctionableId}`;
              const itemRes = await api.get(endpoint);
              const slug = itemRes.data?.data?.slug;
              if (slug) {
                router.replace(withBasePath(`/products/${slug}?auctionId=${auctionId}`));
                return;
              }
            } catch {
              // Fall through to error
            }
          }

          setError('Could not find the product associated with this auction.');
        } else {
          setError('Auction not found.');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Auction not found.');
        } else {
          setError('Failed to load auction details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAndRedirect();
  }, [auctionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading auction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Auction Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href={withBasePath('/auctions')}
            className="inline-block bg-primary text-white px-6 py-3 font-medium hover:bg-opacity-90 transition"
          >
            Browse Auctions
          </a>
        </div>
      </div>
    );
  }

  return null;
}
