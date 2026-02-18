'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import AuctionDetailsDrawer from '@/components/modals/AuctionDetailsDrawer';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';

export default function AdminAuctionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const { data: auctionsData, isLoading } = useQuery({
    queryKey: ['admin-auctions', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const res = await fetch(`/api/auctions?${params}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch auctions');
      const result = await res.json();

      let auctions = result.data || [];

      // Filter by search query
      if (searchQuery) {
        auctions = auctions.filter((auction: any) => {
          const item = auction.item || auction.book || auction.product;
          return (
            item?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            auction.vendor?.shopName?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        });
      }

      return auctions;
    },
    enabled: !!session,
  });

  const handleViewDetails = async (auction: any) => {
    try {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const data = await res.json();

      if (data.success) {
        setSelectedAuction(data.data);
        setShowDetailsDrawer(true);
      }
    } catch (err) {
      console.error('Failed to load auction details:', err);
    }
  };

  const handleEdit = (auction: any) => {
    router.push(`/admin/auctions/${auction.id}`);
  };

  if (status === 'loading') {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/admin/login');
    return null;
  }

  const auctions = auctionsData || [];

  // Calculate stats
  const activeCount = auctions.filter((a: any) => a.status === 'active').length;
  const completedCount = auctions.filter((a: any) => a.status === 'closed').length;
  const totalBids = auctions.reduce((sum: number, a: any) => sum + (a.bidCount || 0), 0);
  const totalValue = auctions.reduce((sum: number, a: any) => {
    if (a.status === 'closed' && a.winningBidAmount) {
      return sum + parseFloat(a.winningBidAmount);
    }
    return sum;
  }, 0);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">All Auctions</h1>
            <p className="text-gray-600 mt-2">Manage and monitor all auction listings</p>
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
            <div className="w-12 h-12 bg-secondary-500 flex items-center justify-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={['fal', 'search']}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by title or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
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
          <div className="w-16 h-16 bg-secondary-500 flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={['fal', 'gavel']} className="text-white text-2xl" />
          </div>
          <p className="text-gray-500 mb-4">No auctions found</p>
          <p className="text-sm text-gray-400">
            {searchQuery
              ? 'Try adjusting your search filters'
              : 'No auctions have been created yet'}
          </p>
        </div>
      ) : (
        <>
          <ResponsiveDataView
            breakpoint="lg"
            mobile={
              <MobileCardList gap="md">
                {auctions.map((auction: any) => {
                  const item = auction.item || auction.book || auction.product;
                  const primaryImage =
                    item?.images?.find((img: any) => img.isPrimary || img.is_primary) ||
                    item?.images?.[0];
                  const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;
                  return (
                    <MobileCard
                      key={auction.id}
                      onClick={() => handleViewDetails(auction)}
                      thumbnail={
                        <CloudinaryImage
                          src={imageUrl}
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
                      }
                      title={item?.title || 'Unknown'}
                      subtitle={
                        <>
                          <span className="text-xs text-gray-500">
                            {item?.author || item?.artist}
                          </span>{' '}
                          <span className="text-xs text-purple-600 font-semibold">
                            {auction.auctionableType?.toUpperCase()}
                          </span>
                        </>
                      }
                      badge={
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${auction.status === 'active' ? 'bg-green-100 text-green-800' : auction.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : auction.status === 'closed' || auction.status === 'ended' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {auction.status}
                        </span>
                      }
                      details={[
                        { label: 'Vendor', value: auction.vendor?.shopName || 'N/A' },
                        {
                          label: 'Starting Bid',
                          value: `$${parseFloat(auction.startingBid || auction.startingPrice || 0).toFixed(2)}`,
                        },
                        {
                          label: 'Current Bid',
                          value: auction.currentBid
                            ? `$${parseFloat(auction.currentBid).toFixed(2)}`
                            : '-',
                        },
                        { label: 'Bids', value: String(auction.bidCount || 0) },
                      ]}
                    >
                      {(auction.status === 'active' || auction.status === 'upcoming') && (
                        <div className="mt-2">
                          <AuctionCountdown
                            endsAt={auction.endsAt || auction.endDate}
                            className="text-sm"
                          />
                        </div>
                      )}
                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewDetails(auction)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 min-h-[36px]"
                        >
                          <FontAwesomeIcon icon={['fal', 'eye']} className="text-sm" /> View
                        </button>
                        <button
                          onClick={() => handleEdit(auction)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 min-h-[36px]"
                        >
                          <FontAwesomeIcon icon={['fal', 'edit']} className="text-sm" /> Edit
                        </button>
                        <Link
                          href={`/admin/vendors/${auction.vendorId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[36px]"
                        >
                          <FontAwesomeIcon icon={['fal', 'store']} className="text-sm" /> Vendor
                        </Link>
                      </div>
                    </MobileCard>
                  );
                })}
              </MobileCardList>
            }
            desktop={
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
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
                        const primaryImage =
                          item?.images?.find((img: any) => img.isPrimary || img.is_primary) ||
                          item?.images?.[0];
                        const imageUrl =
                          primaryImage?.url || primaryImage?.imageUrl || primaryImage;
                        return (
                          <tr
                            key={auction.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleViewDetails(auction)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-16 w-12 overflow-hidden">
                                  <CloudinaryImage
                                    src={imageUrl}
                                    alt={item?.title || 'Item'}
                                    width={96}
                                    height={128}
                                    className="w-128 h-128"
                                    fallbackIcon={[
                                      'fal',
                                      auction.auctionableType === 'book' ? 'book' : 'box',
                                    ]}
                                    fallbackText="No image"
                                  />
                                </div>
                                <div className="ml-4 max-w-xs">
                                  <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                                    {item?.title || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {item?.author || item?.artist}
                                  </div>
                                  <div className="text-xs text-purple-600 font-semibold">
                                    {auction.auctionableType?.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {auction.vendor?.shopName || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                $
                                {parseFloat(
                                  auction.startingBid || auction.startingPrice || 0,
                                ).toFixed(2)}
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
                                className={`px-2 inline-flex text-xs leading-5 font-semibold ${auction.status === 'active' ? 'bg-green-100 text-green-800' : auction.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : auction.status === 'closed' || auction.status === 'ended' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}
                              >
                                {auction.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleViewDetails(auction)}
                                  className="text-primary hover:text-secondary"
                                  title="View Details"
                                >
                                  <FontAwesomeIcon icon={['fal', 'eye']} className="text-base" />
                                </button>
                                <button
                                  onClick={() => handleEdit(auction)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Edit Auction"
                                >
                                  <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                                </button>
                                <Link
                                  href={`/admin/vendors/${auction.vendorId}`}
                                  className="text-red-600 hover:text-red-900"
                                  title="View Vendor"
                                >
                                  <FontAwesomeIcon icon={['fal', 'store']} className="text-base" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            }
          />
        </>
      )}

      {/* Auction Details Drawer */}
      <AuctionDetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        auction={selectedAuction}
        onEdit={handleEdit}
      />
    </div>
  );
}
