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
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import { formatMoney } from '@/lib/format';

export default function VendorAuctionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    data: auctionsData,
    isLoading,
    refetch,
  } = useQuery({
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
      if (statusFilter === 'ended') {
        // Show all ended states
        vendorAuctions = vendorAuctions.filter(
          (auction: any) => auction.status.startsWith('ended_') || auction.status === 'ended',
        );
      } else if (statusFilter === 'needs_action') {
        // Show ended auctions that need vendor action
        vendorAuctions = vendorAuctions.filter((auction: any) =>
          ['ended_no_bids', 'ended_reserve_not_met', 'ended_no_sale'].includes(auction.status),
        );
      } else if (statusFilter !== 'all') {
        vendorAuctions = vendorAuctions.filter((auction: any) => auction.status === statusFilter);
      }

      return {
        auctions: vendorAuctions,
      };
    },
    enabled: !!session,
  });

  // Action handlers
  const handleRelist = async (auctionId: number) => {
    if (!confirm('Relist this auction with the same settings?')) return;

    setActionLoading(`relist-${auctionId}`);
    try {
      const res = await fetch(getApiUrl(`api/auctions/${auctionId}/relist`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ durationDays: 7 }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to relist auction');
      }

      alert('Auction relisted successfully!');
      refetch();
    } catch (error: any) {
      alert(error.message || 'Failed to relist auction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToFixed = async (auctionId: number) => {
    const price = prompt('Enter fixed price (leave empty to use reserve price):');
    if (price === null) return; // Cancelled

    setActionLoading(`convert-${auctionId}`);
    try {
      const body: any = {};
      if (price) body.price = parseFloat(price);

      const res = await fetch(getApiUrl(`api/auctions/${auctionId}/convert-to-fixed`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to convert auction');
      }

      alert('Auction converted to fixed price successfully!');
      refetch();
    } catch (error: any) {
      alert(error.message || 'Failed to convert auction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlist = async (auctionId: number) => {
    if (!confirm('Archive this auction item? It will be removed from public listings.')) return;

    setActionLoading(`unlist-${auctionId}`);
    try {
      const res = await fetch(getApiUrl(`api/auctions/${auctionId}/unlist`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to unlist auction');
      }

      alert('Auction item unlisted successfully!');
      refetch();
    } catch (error: any) {
      alert(error.message || 'Failed to unlist auction');
    } finally {
      setActionLoading(null);
    }
  };

  if (status === 'loading') {
    return <PageLoading message="Loading auctions..." fullPage={false} />;
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
  const soldCount = auctions.filter((a: any) => a.status === 'ended_sold').length;
  const needsActionCount = auctions.filter((a: any) =>
    ['ended_no_bids', 'ended_reserve_not_met', 'ended_no_sale'].includes(a.status),
  ).length;
  const totalValue = auctions.reduce((sum: number, a: any) => {
    if (a.status === 'ended_sold' && a.currentBid) {
      return sum + parseFloat(a.currentBid);
    }
    return sum;
  }, 0);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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
              <p className="text-sm text-gray-600 mb-1">Sold</p>
              <p className="text-2xl font-bold text-primary">{soldCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Needs Action</p>
              <p className="text-2xl font-bold text-orange-600">{needsActionCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-500 flex items-center justify-center">
              <FontAwesomeIcon
                icon={['fal', 'exclamation-circle']}
                className="text-white text-xl"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-primary">
                {formatMoney(totalValue, { fromCents: false })}
              </p>
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
            <option value="ended">All Ended</option>
            <option value="ended_sold">Sold</option>
            <option value="needs_action">⚠️ Needs Action</option>
            <option value="ended_no_bids">No Bids</option>
            <option value="ended_reserve_not_met">Reserve Not Met</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Auctions Table */}
      {isLoading ? (
        <PageLoading message="Loading auctions..." fullPage={false} />
      ) : auctions.length === 0 ? (
        <EmptyState
          icon={['fal', 'gavel']}
          title="No auctions found"
          description="Create an auction from your product edit page to get started"
          actionLabel="View Products"
          actionHref="/vendor/books"
        />
      ) : (
        <>
          <ResponsiveDataView
            breakpoint="md"
            mobile={
              <MobileCardList gap="md">
                {auctions.map((auction: any) => {
                  const item = auction.item || auction.book || auction.product;
                  const getAuctionStatusBadge = () => {
                    const statusMap: Record<string, { bg: string; label: string }> = {
                      active: { bg: 'bg-green-100 text-green-800', label: 'Active' },
                      upcoming: { bg: 'bg-blue-100 text-blue-800', label: 'Upcoming' },
                      ended_sold: { bg: 'bg-green-100 text-green-800', label: 'Sold' },
                      ended_no_bids: { bg: 'bg-orange-100 text-orange-800', label: 'No Bids' },
                      ended_reserve_not_met: {
                        bg: 'bg-yellow-100 text-yellow-800',
                        label: 'Reserve Not Met',
                      },
                      ended_no_sale: { bg: 'bg-gray-100 text-gray-800', label: 'No Sale' },
                    };
                    const s = statusMap[auction.status] || {
                      bg: 'bg-red-100 text-red-800',
                      label: auction.status,
                    };
                    return s;
                  };
                  const statusBadge = getAuctionStatusBadge();
                  const needsAction = [
                    'ended_no_bids',
                    'ended_reserve_not_met',
                    'ended_no_sale',
                  ].includes(auction.status);
                  const outOfStock = item?.trackQuantity && (!item?.quantity || item?.quantity < 1);

                  return (
                    <MobileCard
                      key={auction.id}
                      thumbnail={
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
                      }
                      title={item?.title || 'Unknown'}
                      subtitle={
                        <span className="text-xs text-purple-600 font-semibold">
                          {auction.auctionableType?.toUpperCase()}
                        </span>
                      }
                      badge={
                        <div className="flex flex-col gap-1 items-end">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge.bg}`}
                          >
                            {statusBadge.label}
                          </span>
                          {needsAction && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded-full">
                              Action Required
                            </span>
                          )}
                          {auction.relistCount > 0 && (
                            <span className="text-xs text-gray-500">
                              Relisted {auction.relistCount}x
                            </span>
                          )}
                        </div>
                      }
                      details={[
                        {
                          label: 'Starting Bid',
                          value: formatMoney(
                            parseFloat(auction.startingBid || auction.startingPrice || 0),
                            { fromCents: false },
                          ),
                        },
                        {
                          label: 'Current Bid',
                          value:
                            auction.currentBid && parseFloat(auction.currentBid) > 0
                              ? formatMoney(parseFloat(auction.currentBid), { fromCents: false })
                              : formatMoney(
                                  parseFloat(auction.startingBid || auction.startingPrice || 0),
                                  { fromCents: false },
                                ),
                        },
                        { label: 'Bids', value: String(auction.bidCount || 0) },
                        {
                          label: 'Time',
                          value:
                            auction.status === 'active' || auction.status === 'upcoming'
                              ? 'Live'
                              : 'Ended',
                        },
                      ]}
                    >
                      {/* Countdown for active/upcoming */}
                      {(auction.status === 'active' || auction.status === 'upcoming') && (
                        <div className="mt-2 px-1">
                          <AuctionCountdown
                            endsAt={auction.endsAt || auction.endDate}
                            className="text-sm"
                          />
                        </div>
                      )}
                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/auctions/${auction.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 min-h-[36px]"
                        >
                          <FontAwesomeIcon icon={['fal', 'eye']} className="text-sm" /> View
                        </Link>
                        {needsAction && (
                          <>
                            <button
                              onClick={() => handleRelist(auction.id)}
                              disabled={actionLoading === `relist-${auction.id}` || outOfStock}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 min-h-[36px]"
                            >
                              <FontAwesomeIcon
                                icon={
                                  actionLoading === `relist-${auction.id}`
                                    ? ['fal', 'spinner']
                                    : ['fal', 'redo']
                                }
                                className={`text-sm ${actionLoading === `relist-${auction.id}` ? 'animate-spin' : ''}`}
                              />{' '}
                              Relist
                            </button>
                            <button
                              onClick={() => handleConvertToFixed(auction.id)}
                              disabled={actionLoading === `convert-${auction.id}` || outOfStock}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 min-h-[36px]"
                            >
                              <FontAwesomeIcon
                                icon={
                                  actionLoading === `convert-${auction.id}`
                                    ? ['fal', 'spinner']
                                    : ['fal', 'tag']
                                }
                                className={`text-sm ${actionLoading === `convert-${auction.id}` ? 'animate-spin' : ''}`}
                              />{' '}
                              Fixed Price
                            </button>
                            <button
                              onClick={() => handleUnlist(auction.id)}
                              disabled={actionLoading === `unlist-${auction.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 min-h-[36px]"
                            >
                              <FontAwesomeIcon
                                icon={
                                  actionLoading === `unlist-${auction.id}`
                                    ? ['fal', 'spinner']
                                    : ['fal', 'archive']
                                }
                                className={`text-sm ${actionLoading === `unlist-${auction.id}` ? 'animate-spin' : ''}`}
                              />{' '}
                              Unlist
                            </button>
                          </>
                        )}
                        {auction.auctionableType === 'book' && (
                          <Link
                            href={`/vendor/books/${auction.auctionableId}/edit`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 min-h-[36px]"
                          >
                            <FontAwesomeIcon icon={['fal', 'edit']} className="text-sm" /> Edit
                          </Link>
                        )}
                        {auction.auctionableType === 'product' && (
                          <Link
                            href={`/vendor/products/${auction.auctionableId}/edit`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 min-h-[36px]"
                          >
                            <FontAwesomeIcon icon={['fal', 'edit']} className="text-sm" /> Edit
                          </Link>
                        )}
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
                                {formatMoney(
                                  parseFloat(auction.startingBid || auction.startingPrice || 0),
                                  { fromCents: false },
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-primary">
                                {auction.currentBid && parseFloat(auction.currentBid) > 0
                                  ? formatMoney(parseFloat(auction.currentBid), {
                                      fromCents: false,
                                    })
                                  : formatMoney(
                                      parseFloat(auction.startingBid || auction.startingPrice || 0),
                                      { fromCents: false },
                                    )}
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
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold ${auction.status === 'active' ? 'bg-green-100 text-green-800' : auction.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : auction.status === 'ended_sold' ? 'bg-green-100 text-green-800' : auction.status === 'ended_no_bids' ? 'bg-orange-100 text-orange-800' : auction.status === 'ended_reserve_not_met' ? 'bg-yellow-100 text-yellow-800' : auction.status === 'ended_no_sale' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}
                                >
                                  {auction.status === 'ended_sold'
                                    ? 'Sold'
                                    : auction.status === 'ended_no_bids'
                                      ? 'No Bids'
                                      : auction.status === 'ended_reserve_not_met'
                                        ? 'Reserve Not Met'
                                        : auction.status === 'ended_no_sale'
                                          ? 'No Sale'
                                          : auction.status}
                                </span>
                                {[
                                  'ended_no_bids',
                                  'ended_reserve_not_met',
                                  'ended_no_sale',
                                ].includes(auction.status) && (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold bg-orange-500 text-white">
                                    Action Required
                                  </span>
                                )}
                                {auction.relistCount > 0 && (
                                  <span className="text-xs text-gray-500">
                                    Relisted {auction.relistCount}x
                                  </span>
                                )}
                              </div>
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
                                {[
                                  'ended_no_bids',
                                  'ended_reserve_not_met',
                                  'ended_no_sale',
                                ].includes(auction.status) && (
                                  <>
                                    <button
                                      onClick={() => handleRelist(auction.id)}
                                      disabled={
                                        actionLoading === `relist-${auction.id}` ||
                                        (item?.trackQuantity &&
                                          (!item?.quantity || item?.quantity < 1))
                                      }
                                      className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Relist Auction"
                                    >
                                      {actionLoading === `relist-${auction.id}` ? (
                                        <FontAwesomeIcon
                                          icon={['fal', 'spinner']}
                                          className="text-base animate-spin"
                                        />
                                      ) : (
                                        <FontAwesomeIcon
                                          icon={['fal', 'redo']}
                                          className="text-base"
                                        />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleConvertToFixed(auction.id)}
                                      disabled={
                                        actionLoading === `convert-${auction.id}` ||
                                        (item?.trackQuantity &&
                                          (!item?.quantity || item?.quantity < 1))
                                      }
                                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Convert to Fixed Price"
                                    >
                                      {actionLoading === `convert-${auction.id}` ? (
                                        <FontAwesomeIcon
                                          icon={['fal', 'spinner']}
                                          className="text-base animate-spin"
                                        />
                                      ) : (
                                        <FontAwesomeIcon
                                          icon={['fal', 'tag']}
                                          className="text-base"
                                        />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleUnlist(auction.id)}
                                      disabled={actionLoading === `unlist-${auction.id}`}
                                      className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Unlist Item"
                                    >
                                      {actionLoading === `unlist-${auction.id}` ? (
                                        <FontAwesomeIcon
                                          icon={['fal', 'spinner']}
                                          className="text-base animate-spin"
                                        />
                                      ) : (
                                        <FontAwesomeIcon
                                          icon={['fal', 'archive']}
                                          className="text-base"
                                        />
                                      )}
                                    </button>
                                  </>
                                )}
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
            }
          />
        </>
      )}
    </div>
  );
}
