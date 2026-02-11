'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import { getApiUrl } from '@/lib/api';

export default function VendorAuctionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: auctionsData, isLoading } = useQuery({
    queryKey: ['vendor-auctions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
      });

      const res = await fetch(getApiUrl(`api/auctions?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch auctions');
      const result = await res.json();

      // Get vendor dashboard to find vendorId
      const dashRes = await fetch(getApiUrl('api/vendor/dashboard'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const dashData = await dashRes.json();
      const vendorId = dashData.data?.vendor?.id;

      // Filter to only show this vendor's auctions
      let vendorAuctions =
        result.data?.filter((auction: any) => {
          return auction.vendorId === vendorId;
        }) || [];

      // Apply status filter on client side
      if (statusFilter !== 'all') {
        vendorAuctions = vendorAuctions.filter((auction: any) => auction.status === statusFilter);
      }

      return {
        auctions: vendorAuctions,
      };
    },
    enabled: !!session,
  });

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const auctions = auctionsData?.auctions || [];

  // Calculate stats
  const activeCount = auctions.filter(
    (a: any) => a.status === 'active' || a.status === 'upcoming',
  ).length;
  const completedCount = auctions.filter(
    (a: any) => a.status === 'closed' || a.status === 'ended',
  ).length;
  const totalBids = auctions.reduce((sum: number, a: any) => sum + (a.bidCount || 0), 0);
  const totalValue = auctions.reduce((sum: number, a: any) => {
    if ((a.status === 'closed' || a.status === 'ended') && a.winningBidAmount) {
      return sum + parseFloat(a.winningBidAmount);
    }
    return sum;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Auctions</h1>
            <p className="text-gray-600 mt-2">Manage your auction listings and track bids</p>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Auctions</p>
              <p className="text-2xl font-bold text-primary">{activeCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'gavel']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Bids</p>
              <p className="text-2xl font-bold text-primary">{totalBids}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'hand-paper']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-primary">{completedCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-primary">${totalValue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'dollar-sign']} className="text-white text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6">
        <div className="flex gap-3 sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="ended">Ended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Auctions Table */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-purple-500 flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={['fal', 'gavel']} className="text-white text-2xl" />
          </div>
          <p className="text-gray-500 mb-4">No auctions found</p>
          <p className="text-sm text-gray-400 mb-6">
            Create an auction from your product edit page to get started
          </p>
          <Link
            href="/vendor/books"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 hover:bg-opacity-90 transition"
          >
            <FontAwesomeIcon icon={['fal', 'box']} className="text-base" />
            View Products
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Starting Bid
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Bid
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bids
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Remaining
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auctions.map((auction: any) => {
                    const item = auction.item || auction.book || auction.product;
                    return (
                      <tr key={auction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-12 overflow-hidden">
                              <CloudinaryImage
                                src={item?.imageUrl}
                                alt={item?.title || 'Item'}
                                width={96}
                                height={128}
                                className="w-full h-full"
                                fallbackIcon={[
                                  'fal',
                                  auction.auctionableType === 'book' ? 'book' : 'box',
                                ]}
                                fallbackText="No image"
                              />
                            </div>
                            <div className="ml-4 max-w-xs">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {item?.title || 'Unknown'}
                              </div>
                              <div className="text-xs text-purple-600 font-semibold">
                                {auction.auctionableType?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            $
                            {parseFloat(auction.startingBid || auction.startingPrice || 0).toFixed(
                              2,
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-primary">
                            {auction.currentBid
                              ? `$${parseFloat(auction.currentBid).toFixed(2)}`
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <FontAwesomeIcon
                              icon={['fal', 'hand-paper']}
                              className="text-base mr-1"
                            />
                            {auction.bidCount || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {auction.status === 'active' || auction.status === 'upcoming' ? (
                            <AuctionCountdown
                              endsAt={auction.endsAt || auction.endDate}
                              className="text-sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-500">Ended</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold ${
                              auction.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : auction.status === 'upcoming'
                                  ? 'bg-blue-100 text-blue-800'
                                  : auction.status === 'closed' || auction.status === 'ended'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {auction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/auctions/${auction.id}`}
                              className="text-primary hover:text-secondary"
                              title="View Details"
                            >
                              <FontAwesomeIcon icon={['fal', 'eye']} className="text-base" />
                            </Link>
                            {auction.auctionableType === 'book' && (
                              <Link
                                href={`/vendor/books/${auction.auctionableId}/edit`}
                                className="text-gray-600 hover:text-primary"
                                title="Edit Product"
                              >
                                <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                              </Link>
                            )}
                            {auction.auctionableType === 'product' && (
                              <Link
                                href={`/vendor/products/${auction.auctionableId}/edit`}
                                className="text-gray-600 hover:text-primary"
                                title="Edit Product"
                              >
                                <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
