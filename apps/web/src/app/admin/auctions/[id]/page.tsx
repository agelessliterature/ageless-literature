'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';

export default function AuctionDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const auctionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    startingPrice: '',
    reservePrice: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAuction();
    }
  }, [status, auctionId]);

  const fetchAuction = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/auctions/${auctionId}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const data = await res.json();

      if (data.success) {
        const auctionData = data.data;
        setAuction(auctionData);
        setBids(auctionData.bids || []);

        setFormData({
          startingPrice: auctionData.startingPrice || auctionData.startingBid || '',
          reservePrice: auctionData.reservePrice || '',
          startDate: formatDateForInput(auctionData.startsAt || auctionData.startDate),
          endDate: formatDateForInput(auctionData.endsAt || auctionData.endDate),
        });
      } else {
        setError(data.message || 'Failed to load auction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const res = await fetch(`/api/auctions/${auctionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Auction updated successfully!');
        fetchAuction();
      } else {
        setError(data.message || 'Failed to update auction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update auction');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this auction? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`/api/auctions/${auctionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Auction cancelled successfully!');
        fetchAuction();
      } else {
        setError(data.message || 'Failed to cancel auction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel auction');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
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

  if (error && !auction) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
        <Link href="/admin/auctions" className="text-primary hover:underline">
          &larr; Back to Auctions
        </Link>
      </div>
    );
  }

  const item = auction?.item || auction?.book || auction?.product;
  const primaryImage =
    item?.images?.find((img: any) => img.isPrimary || img.is_primary) || item?.images?.[0];
  const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;

  const canEdit =
    auction?.status === 'upcoming' || (auction?.status === 'active' && !auction?.currentBid);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/auctions" className="text-primary hover:underline mb-2 inline-block">
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="mr-2" />
          Back to Auctions
        </Link>
        <h1 className="text-3xl font-bold text-primary">
          {canEdit ? 'Edit Auction' : 'View Auction'}
        </h1>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 p-4 mb-6">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Details Card */}
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Auction Item</h2>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-32 h-40 overflow-hidden bg-gray-100">
                <CloudinaryImage
                  src={imageUrl}
                  alt={item?.title || 'Item'}
                  width={128}
                  height={160}
                  className="w-full h-full object-cover"
                  fallbackIcon={['fal', auction?.auctionableType === 'book' ? 'book' : 'box']}
                />
              </div>

              <div className="flex-1">
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 mb-2">
                    {auction?.auctionableType?.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {item?.title || 'Unknown Item'}
                </h3>
                <p className="text-gray-600 mb-2">{item?.author || item?.artist}</p>
                {item?.description && (
                  <p className="text-sm text-gray-500 line-clamp-3">
                    {typeof item.description === 'object'
                      ? (item.description as any)?.html || (item.description as any)?.en || ''
                      : item.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Condition:</span>
                  <span className="ml-2 font-medium">{item?.condition || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Stock:</span>
                  <span className="ml-2 font-medium">
                    {item?.quantity || item?.stockQuantity || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Auction Details Form */}
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Auction Details</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Price *
                  </label>
                  <input
                    type="number"
                    name="startingPrice"
                    value={formData.startingPrice}
                    onChange={handleChange}
                    disabled={!canEdit}
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reserve Price
                  </label>
                  <input
                    type="number"
                    name="reservePrice"
                    value={formData.reservePrice}
                    onChange={handleChange}
                    disabled={!canEdit}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    disabled={!canEdit}
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    disabled={!canEdit}
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                  />
                </div>
              </div>

              {!canEdit && (
                <div className="bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm text-yellow-800">
                    <FontAwesomeIcon icon={['fal', 'info-circle']} className="mr-2" />
                    This auction cannot be edited because it is {auction?.status} and has active
                    bids.
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                {canEdit && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}

                {auction?.status !== 'cancelled' && auction?.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-2 border border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel Auction
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Bids Section */}
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-primary mb-4">Bids ({bids.length})</h2>

            {bids.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bids yet</p>
            ) : (
              <div className="space-y-3">
                {bids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{bid.user?.name || 'Unknown User'}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(bid.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      ${parseFloat(bid.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-primary mb-4">Auction Status</h3>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold inline-flex ${
                      auction?.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : auction?.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : auction?.status === 'closed' || auction?.status === 'ended'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {auction?.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {(auction?.status === 'active' || auction?.status === 'upcoming') && (
                <div>
                  <span className="text-sm text-gray-600">Time Remaining:</span>
                  <div className="mt-1">
                    <AuctionCountdown
                      endsAt={auction?.endsAt || auction?.endDate}
                      className="text-lg font-bold text-primary"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Starting Bid:</span>
                  <span className="font-medium">
                    ${parseFloat(auction?.startingPrice || auction?.startingBid || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Bid:</span>
                  <span className="font-bold text-primary">
                    {auction?.currentBid ? `$${parseFloat(auction.currentBid).toFixed(2)}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Reserve Price:</span>
                  <span className="font-medium">
                    ${parseFloat(auction?.reservePrice || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Bids:</span>
                  <span className="font-medium">{auction?.bidCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Card */}
          {auction?.vendor && (
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-primary mb-4">Vendor</h3>

              <div className="text-center">
                {auction.vendor.logoUrl && (
                  <div className="w-16 h-16 mx-auto mb-3 overflow-hidden bg-gray-100">
                    <CloudinaryImage
                      src={auction.vendor.logoUrl}
                      alt={auction.vendor.shopName}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="font-bold text-gray-900">{auction.vendor.shopName}</div>
                <Link
                  href={`/admin/vendors/${auction.vendor.id}`}
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  View Vendor &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Winner Card */}
          {auction?.winner && (
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-primary mb-4">Winner</h3>

              <div>
                <div className="font-medium text-gray-900">{auction.winner.name}</div>
                <div className="text-sm text-gray-500">{auction.winner.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
