/**
 * Account Order Detail Page
 * Displays full details of a buyer's order
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import PageLoading from '@/components/ui/PageLoading';
import InlineError from '@/components/ui/InlineError';
import { formatMoney } from '@/lib/format';

export default function AccountOrderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

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
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`api/orders/${orderId}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Order not found');
        if (res.status === 403) throw new Error('Access denied');
        throw new Error('Failed to fetch order');
      }
      const result = await res.json();
      return result.data;
    },
    enabled: !!session && !!orderId,
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
            href={withBasePath('/account/orders')}
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href={withBasePath('/account/orders')}
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="mr-2" />
          Back to Orders
        </Link>
      </div>

      {/* Order Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-primary mb-2">Order #{order.orderNumber}</h1>
            <p className="text-gray-600">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}
            >
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item: any) => {
                const book = item.book || item.product;
                const imageUrl =
                  book?.media?.[0]?.imageUrl || book?.imageUrl || book?.images?.[0]?.url;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                  >
                    <div className="w-20 h-28 flex-shrink-0 overflow-hidden rounded">
                      <CloudinaryImage
                        src={imageUrl}
                        alt={book?.title || 'Item'}
                        width={160}
                        height={224}
                        className="w-full h-full object-cover"
                        fallbackIcon={['fal', 'book']}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{book?.title}</h3>
                      {book?.author && <p className="text-sm text-gray-600">by {book.author}</p>}
                      <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        {formatMoney(item.price)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatMoney(parseFloat(item.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shippingAddress && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={['fal', 'truck']} />
                Shipping Address
              </h2>
              <div className="text-gray-700 space-y-1">
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
          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatMoney(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatMoney(order.tax)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatMoney(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
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

          {/* Billing Address */}
          {order.billingAddress && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{order.billingAddress.fullName}</p>
                <p>{order.billingAddress.addressLine1}</p>
                {order.billingAddress.addressLine2 && <p>{order.billingAddress.addressLine2}</p>}
                <p>
                  {order.billingAddress.city}, {order.billingAddress.stateProvince}{' '}
                  {order.billingAddress.postalCode}
                </p>
                <p>{order.billingAddress.country}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
