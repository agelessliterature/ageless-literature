'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import { getApiUrl } from '@/lib/api';

interface Offer {
  id: string;
  itemType: 'book' | 'product';
  itemId: number;
  originalPrice: string;
  offerPrice: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expiresAt: string | null;
  createdAt: string;
  vendor: {
    id: string;
    shopName: string;
    shopLogo?: string;
    shopUrl?: string;
  };
  item: {
    id: number;
    title: string;
    sid?: string;
    media?: { imageUrl: string }[];
    images?: string[];
  };
}

export default function UserOffersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const { data: offersData, isLoading } = useQuery({
    queryKey: ['user-offers', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await fetch(getApiUrl(`api/users/offers?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch offers');
      return res.json();
    },
    enabled: !!session,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: 'accept' | 'decline' }) => {
      const res = await fetch(getApiUrl(`api/users/offers/${offerId}/respond`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Failed to respond to offer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-offers'] });
    },
  });

  if (status === 'loading') {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const offers: Offer[] = offersData?.data || [];
  const pagination = offersData?.pagination || {};

  const getStatusBadge = (offerStatus: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[offerStatus] || 'bg-gray-100 text-gray-800';
  };

  const getItemImage = (offer: Offer) => {
    if (offer.itemType === 'book' && offer.item?.media?.[0]?.imageUrl) {
      return offer.item.media[0].imageUrl;
    }
    if (offer.itemType === 'product' && offer.item?.images?.[0]) {
      return offer.item.images[0];
    }
    return null;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  const getItemLink = (offer: Offer) => {
    if (offer.itemType === 'book' && offer.item?.sid) {
      return `/shop/${offer.item.sid}`;
    }
    if (offer.itemType === 'product' && offer.item?.sid) {
      return `/collectibles/${offer.item.sid}`;
    }
    return '#';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary mb-2">Custom Offers</h1>
        <p className="text-gray-600">Special offers from vendors just for you</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6">
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Offers List */}
      {isLoading ? (
        <div className="text-center py-12">Loading offers...</div>
      ) : offers.length === 0 ? (
        <div className="bg-white border border-gray-200 p-8 text-center">
          <FontAwesomeIcon icon={['fal', 'tag']} className="text-4xl text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No offers yet</h3>
          <p className="text-gray-600">When vendors send you custom offers, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const expired = offer.status === 'pending' && isExpired(offer.expiresAt);

            return (
              <div
                key={offer.id}
                className={`bg-white border border-gray-200 p-4 sm:p-6 ${expired ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Item Image */}
                  <Link href={getItemLink(offer)} className="w-24 h-24 flex-shrink-0 bg-gray-100">
                    {getItemImage(offer) ? (
                      <CloudinaryImage
                        src={getItemImage(offer)!}
                        alt={offer.item?.title || 'Item'}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={['fal', offer.itemType === 'book' ? 'book' : 'box']}
                          className="text-3xl text-gray-400"
                        />
                      </div>
                    )}
                  </Link>

                  {/* Offer Details */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <Link
                          href={getItemLink(offer)}
                          className="font-semibold text-gray-900 hover:text-primary"
                        >
                          {offer.item?.title || 'Item'}
                        </Link>
                        <p className="text-sm text-gray-600">
                          From: {offer.vendor?.shopName || 'Vendor'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusBadge(expired ? 'expired' : offer.status)}`}
                      >
                        {expired
                          ? 'Expired'
                          : offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Original Price:</span>{' '}
                        <span className="line-through text-gray-400">${offer.originalPrice}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Your Price:</span>{' '}
                        <span className="font-bold text-green-600 text-lg">
                          ${offer.offerPrice}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">You Save:</span>{' '}
                        <span className="text-green-600 font-semibold">
                          {Math.round(
                            (1 - parseFloat(offer.offerPrice) / parseFloat(offer.originalPrice)) *
                              100,
                          )}
                          % ($
                          {(parseFloat(offer.originalPrice) - parseFloat(offer.offerPrice)).toFixed(
                            2,
                          )}
                          )
                        </span>
                      </div>
                    </div>

                    {offer.message && (
                      <div className="mt-3 bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600 italic">"{offer.message}"</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      {offer.status === 'pending' && !expired && (
                        <>
                          <button
                            onClick={() =>
                              respondMutation.mutate({ offerId: offer.id, action: 'accept' })
                            }
                            disabled={respondMutation.isPending}
                            className="bg-green-600 text-white px-6 py-2 hover:bg-green-700 transition disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={['fal', 'check']} className="mr-2" />
                            Accept Offer
                          </button>
                          <button
                            onClick={() =>
                              respondMutation.mutate({ offerId: offer.id, action: 'decline' })
                            }
                            disabled={respondMutation.isPending}
                            className="border border-gray-300 px-4 py-2 hover:bg-gray-50 transition disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {offer.status === 'accepted' && (
                        <Link
                          href={`${getItemLink(offer)}?offer=${offer.id}`}
                          className="bg-primary text-white px-6 py-2 hover:bg-opacity-90 transition"
                        >
                          <FontAwesomeIcon icon={['fal', 'shopping-cart']} className="mr-2" />
                          Buy Now at ${offer.offerPrice}
                        </Link>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      <span>Received: {new Date(offer.createdAt).toLocaleDateString()}</span>
                      {offer.expiresAt && !expired && offer.status === 'pending' && (
                        <span className="ml-4 text-orange-600">
                          Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1 border border-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
