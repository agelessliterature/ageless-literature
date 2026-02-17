'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Pagination from '@/components/shared/Pagination';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import CreateOfferModal from '@/components/modals/CreateOfferModal';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';

interface Offer {
  id: string;
  itemType: 'book' | 'product';
  itemId: number;
  originalPrice: string;
  offerPrice: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  initiatedBy: 'vendor' | 'buyer';
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  item: {
    id: number;
    title: string;
    media?: { imageUrl: string }[];
    images?: string[];
  };
}

export default function VendorOffersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);

  const { data: offersData, isLoading } = useQuery({
    queryKey: ['vendor-offers', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await fetch(getApiUrl(`api/vendor/offers?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch offers');
      return res.json();
    },
    enabled: !!session,
  });

  const cancelMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await fetch(getApiUrl(`api/vendor/offers/${offerId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to cancel offer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-offers'] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: 'accept' | 'decline' }) => {
      const res = await fetch(getApiUrl(`api/vendor/offers/${offerId}/respond`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} offer`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-offers'] });
    },
  });

  if (status === 'loading') {
    return <PageLoading message="Loading offers..." fullPage={false} />;
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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Custom Offers</h1>
            <p className="text-gray-600 mt-2">
              Manage offers from buyers and send custom offers to customers
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 hover:bg-opacity-90 transition w-full sm:w-auto"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
            Create Offer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6">
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Offers List */}
      {isLoading ? (
        <PageLoading message="Loading offers..." fullPage={false} />
      ) : offers.length === 0 ? (
        <EmptyState
          icon={['fal', 'tag']}
          title="No offers yet"
          description="Create custom offers to send to specific customers"
          actionLabel="Create Your First Offer"
          actionOnClick={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Item Image */}
                <div className="w-20 h-20 flex-shrink-0 bg-gray-100">
                  {getItemImage(offer) ? (
                    <CloudinaryImage
                      src={getItemImage(offer)!}
                      alt={offer.item?.title || 'Item'}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FontAwesomeIcon
                        icon={['fal', offer.itemType === 'book' ? 'book' : 'box']}
                        className="text-2xl text-gray-400"
                      />
                    </div>
                  )}
                </div>

                {/* Offer Details */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{offer.item?.title || 'Item'}</h3>
                      <p className="text-sm text-gray-600">
                        {offer.initiatedBy === 'buyer' ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                              <FontAwesomeIcon icon={['fal', 'arrow-down']} /> From:
                            </span>{' '}
                            {offer.user?.name} ({offer.user?.email})
                          </>
                        ) : (
                          <>
                            To: {offer.user?.name} ({offer.user?.email})
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {offer.initiatedBy === 'buyer' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          Buyer Offer
                        </span>
                      )}
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusBadge(offer.status)}`}
                      >
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Original Price:</span>{' '}
                      <span className="line-through text-gray-400">${offer.originalPrice}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Offer Price:</span>{' '}
                      <span className="font-semibold text-green-600">${offer.offerPrice}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Discount:</span>{' '}
                      <span className="text-green-600">
                        {Math.round(
                          (1 - parseFloat(offer.offerPrice) / parseFloat(offer.originalPrice)) *
                            100,
                        )}
                        % off
                      </span>
                    </div>
                  </div>

                  {offer.message && (
                    <p className="mt-2 text-sm text-gray-600 italic">"{offer.message}"</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>Created: {new Date(offer.createdAt).toLocaleDateString()}</span>
                    {offer.expiresAt && (
                      <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
                    )}
                    {offer.status === 'pending' && offer.initiatedBy === 'vendor' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this offer?')) {
                            cancelMutation.mutate(offer.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        disabled={cancelMutation.isPending}
                      >
                        Cancel Offer
                      </button>
                    )}
                    {offer.status === 'pending' && offer.initiatedBy === 'buyer' && (
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() =>
                            respondMutation.mutate({ offerId: offer.id, action: 'accept' })
                          }
                          className="bg-green-600 text-white px-3 py-1 text-xs font-semibold hover:bg-green-700 transition rounded"
                          disabled={respondMutation.isPending}
                        >
                          Accept Offer
                        </button>
                        <button
                          onClick={() =>
                            respondMutation.mutate({ offerId: offer.id, action: 'decline' })
                          }
                          className="bg-red-600 text-white px-3 py-1 text-xs font-semibold hover:bg-red-700 transition rounded"
                          disabled={respondMutation.isPending}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={pagination.totalPages || 1}
        totalItems={pagination.total || 0}
        itemsPerPage={20}
        onPageChange={setPage}
        className="mt-6"
      />

      {/* Create Offer Modal */}
      {showCreateModal && (
        <CreateOfferModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['vendor-offers'] });
          }}
        />
      )}
    </div>
  );
}
