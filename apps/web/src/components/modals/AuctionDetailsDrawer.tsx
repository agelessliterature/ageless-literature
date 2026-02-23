'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import Link from 'next/link';
import { formatMoney } from '@/lib/format';

interface AuctionDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auction: any;
  onEdit: (auction: any) => void;
}

export default function AuctionDetailsDrawer({
  isOpen,
  onClose,
  auction,
  onEdit,
}: AuctionDetailsDrawerProps) {
  if (!isOpen || !auction) return null;

  const item = auction.item || auction.book || auction.product;
  const primaryImage =
    item?.images?.find((img: any) => img.isPrimary || img.is_primary) || item?.images?.[0];
  const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;
  const bids = auction.bids || [];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={onClose}>
        <div
          className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary">Auction Details</h2>
                <p className="text-sm text-gray-500 mt-1">ID: {auction.id}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
              </button>
            </div>

            {/* Status Banner */}
            <div className="mb-6 bg-gray-50 border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <span
                    className={`ml-2 px-3 py-1 text-sm font-semibold inline-flex ${
                      auction.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : auction.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : auction.status === 'closed' || auction.status === 'ended'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {auction.status?.toUpperCase()}
                  </span>
                </div>
                {(auction.status === 'active' || auction.status === 'upcoming') && (
                  <div>
                    <AuctionCountdown
                      endsAt={auction.endsAt || auction.endDate}
                      className="text-lg font-bold text-primary"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Item Details */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Auction Item</h3>
              <div className="flex gap-4 bg-white border border-gray-200 p-4">
                <div className="flex-shrink-0 w-32 h-40 overflow-hidden bg-gray-100">
                  <CloudinaryImage
                    src={imageUrl}
                    alt={item?.title || 'Item'}
                    width={128}
                    height={160}
                    className="w-full h-full object-cover"
                    fallbackIcon={['fal', auction.auctionableType === 'book' ? 'book' : 'box']}
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800">
                      {auction.auctionableType?.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    {item?.title || 'Unknown Item'}
                  </h4>
                  <p className="text-gray-600 mb-2">{item?.author || item?.artist || 'N/A'}</p>
                  {item?.description && (
                    <p className="text-sm text-gray-500 line-clamp-3">
                      {typeof item.description === 'object'
                        ? (item.description as any)?.html || (item.description as any)?.en || ''
                        : item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Auction Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Auction Information</h3>
              <div className="bg-gray-50 border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Starting Bid:</span>
                  <span className="font-medium">
                    {formatMoney(auction.startingPrice || auction.startingBid || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Bid:</span>
                  <span className="font-bold text-primary">
                    {auction.currentBid ? formatMoney(auction.currentBid) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reserve Price:</span>
                  <span className="font-medium">{formatMoney(auction.reservePrice || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Bids:</span>
                  <span className="font-medium">{auction.bidCount || 0}</span>
                </div>
                <div className="pt-3 border-t border-gray-300">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Start Date:</span>
                    <span className="text-sm">
                      {new Date(auction.startsAt || auction.startDate).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">End Date:</span>
                    <span className="text-sm">
                      {new Date(auction.endsAt || auction.endDate).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            {auction.vendor && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Vendor</h3>
                <div className="bg-white border border-gray-200 p-4">
                  <div className="flex items-center gap-4">
                    {auction.vendor.logoUrl && (
                      <div className="w-16 h-16 overflow-hidden bg-gray-100">
                        <CloudinaryImage
                          src={auction.vendor.logoUrl}
                          alt={auction.vendor.shopName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{auction.vendor.shopName}</div>
                      <Link
                        href={`/admin/vendors/${auction.vendor.id}`}
                        className="text-sm text-primary hover:underline"
                        onClick={onClose}
                      >
                        View Vendor Profile &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bids */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Bids ({bids.length})</h3>

              {bids.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 p-8 text-center">
                  <FontAwesomeIcon
                    icon={['fal', 'gavel']}
                    className="text-3xl text-gray-400 mb-2"
                  />
                  <p className="text-gray-500">No bids yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bids.slice(0, 10).map((bid: any, index: number) => (
                    <div
                      key={bid.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? 'bg-yellow-400 text-gray-900'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {bid.user?.name ||
                              [bid.user?.firstName, bid.user?.lastName].filter(Boolean).join(' ') ||
                              'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(bid.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {formatMoney(bid.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Winner Information */}
            {auction.winner && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Winner</h3>
                <div className="bg-green-50 border border-green-200 p-4">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon
                      icon={['fal', 'trophy']}
                      className="text-2xl text-yellow-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900">
                        {auction.winner.name ||
                          [auction.winner.firstName, auction.winner.lastName]
                            .filter(Boolean)
                            .join(' ') ||
                          'Winner'}
                      </div>
                      <div className="text-sm text-gray-600">{auction.winner.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  onEdit(auction);
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-black text-white hover:bg-gray-800 font-medium"
              >
                <FontAwesomeIcon icon={['fal', 'edit']} className="mr-2" />
                Edit Auction
              </button>
              <Link
                href={`/auctions/${auction.id}`}
                target="_blank"
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 text-center font-medium"
                onClick={onClose}
              >
                <FontAwesomeIcon icon={['fal', 'external-link']} className="mr-2" />
                View on Site
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
