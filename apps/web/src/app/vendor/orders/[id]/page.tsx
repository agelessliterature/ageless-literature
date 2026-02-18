/**
 * Vendor Order Detail Page
 * Displays order details for vendor's items only
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import TrackingNumberModal from '@/components/modals/TrackingNumberModal';
import { getApiUrl } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoading from '@/components/ui/PageLoading';
import InlineError from '@/components/ui/InlineError';
import { formatMoney } from '@/lib/format';

export default function VendorOrderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const {
    data: orderData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vendor-order-detail', orderId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`api/vendor/orders/${orderId}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Order not found');
        if (res.status === 403) throw new Error('Access denied to this order');
        throw new Error('Failed to fetch order');
      }
      const result = await res.json();
      return result.data;
    },
    enabled: !!session && !!orderId,
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async (tracking: string) => {
      const res = await fetch(getApiUrl(`api/vendor/orders/${orderId}/tracking`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ trackingNumber: tracking }),
      });
      if (!res.ok) throw new Error('Failed to update tracking');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Tracking number added successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-order-detail', orderId] });
      setShowTrackingModal(false);
      setTrackingNumber('');
    },
    onError: () => {
      toast.error('Failed to add tracking number');
    },
  });

  if (status === 'loading' || isLoading) {
    return <PageLoading message="Loading order details..." fullPage={true} />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InlineError
          message={(error as Error).message || 'Failed to load order details'}
          onRetry={() => window.location.reload()}
        />
        <div className="text-center mt-4">
          <Link
            href="/vendor/orders"
            className="inline-block bg-primary text-white px-6 py-2 rounded hover:bg-opacity-90"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  const order = orderData;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmitTracking = () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }
    updateTrackingMutation.mutate(trackingNumber);
  };

  const calculateVendorEarnings = () => {
    const itemsTotal =
      order.items?.reduce(
        (sum: number, item: any) => sum + parseFloat(item.price) * item.quantity,
        0,
      ) || 0;
    return itemsTotal * 0.92; // 92% to vendor, 8% platform commission
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/vendor/orders" className="text-primary hover:text-secondary mb-4 inline-block">
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="mr-2" />
          Back to Orders
        </Link>
      </div>

      {/* Order Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">Order #{order.orderNumber}</h1>
            <p className="text-gray-600">{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}
            >
              {order.status.toUpperCase()}
            </span>
            <div className="text-sm">
              <p className="text-gray-600">Your Earnings</p>
              <p className="text-xl font-bold text-green-600">
                {formatMoney(calculateVendorEarnings())}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
          {order.status === 'pending' && (
            <button
              onClick={() => setShowTrackingModal(true)}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-opacity-90 transition flex items-center gap-2"
            >
              <FontAwesomeIcon icon={['fal', 'shipping-fast']} />
              Add Tracking Number
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Your Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Items in this Order</h2>
            <div className="space-y-4">
              {order.items?.map((item: any) => {
                const book = item.book || item.product;
                const imageUrl = book?.imageUrl || book?.images?.[0]?.url;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                  >
                    <div className="w-16 h-24 flex-shrink-0 overflow-hidden rounded">
                      <CloudinaryImage
                        src={imageUrl}
                        alt={book?.title || 'Item'}
                        width={128}
                        height={192}
                        className="w-full h-full object-cover"
                        fallbackIcon={['fal', 'book']}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{book?.title}</h3>
                      {book?.author && <p className="text-sm text-gray-600">by {book.author}</p>}
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        <p className="text-sm text-gray-500">
                          Price: {formatMoney(item.price)} each
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          Subtotal: {formatMoney(parseFloat(item.price) * item.quantity)}
                        </p>
                        <p className="text-sm text-green-600 font-medium">
                          Your Earnings:{' '}
                          {formatMoney(parseFloat(item.price) * item.quantity * 0.92)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracking Info */}
          {order.trackingNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={['fal', 'shipping-fast']} />
                Tracking Information
              </h2>
              <div className="bg-white rounded px-4 py-3">
                <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {order.trackingNumber}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          {order.user && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">
                  {order.user.firstName} {order.user.lastName}
                </p>
                <p className="text-gray-600">{order.user.email}</p>
              </div>
            </div>
          )}

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={['fal', 'truck']} />
                Shipping Address
              </h2>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          )}

          {/* Order Totals */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Totals</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Order Total</span>
                <span>{formatMoney(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Your Items Subtotal</span>
                <span>
                  {formatMoney(
                    order.items?.reduce(
                      (sum: number, item: any) => sum + parseFloat(item.price) * item.quantity,
                      0,
                    ),
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform Commission (8%)</span>
                <span>
                  -
                  {formatMoney(
                    order.items?.reduce(
                      (sum: number, item: any) => sum + parseFloat(item.price) * item.quantity,
                      0,
                    ) * 0.08,
                  )}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                <span>Your Earnings</span>
                <span className="text-green-600">{formatMoney(calculateVendorEarnings())}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Method</span>
                <span className="font-medium text-gray-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span
                  className={`font-medium ${
                    order.paymentStatus === 'completed'
                      ? 'text-green-600'
                      : order.paymentStatus === 'failed'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Modal */}
      <TrackingNumberModal
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setTrackingNumber('');
        }}
        orderNumber={order.orderNumber}
        trackingNumber={trackingNumber}
        onTrackingChange={setTrackingNumber}
        onSubmit={handleSubmitTracking}
        isSubmitting={updateTrackingMutation.isPending}
      />
    </div>
  );
}
