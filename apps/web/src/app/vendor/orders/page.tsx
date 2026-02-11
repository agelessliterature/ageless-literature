'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import toast from 'react-hot-toast';
import TrackingNumberModal from '@/components/modals/TrackingNumberModal';
import { getApiUrl } from '@/lib/api';

export default function VendorOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['vendor-orders', page, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
      });

      const res = await fetch(getApiUrl(`api/vendor/orders?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, tracking }: { orderId: number; tracking: string }) => {
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
      toast.success('Tracking number added');
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      setSelectedOrder(null);
      setTrackingNumber('');
    },
    onError: () => {
      toast.error('Failed to add tracking number');
    },
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

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination || {};

  const handleMarkAsShipped = (order: any) => {
    setSelectedOrder(order);
  };

  const handleSubmitTracking = () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }
    updateTrackingMutation.mutate({
      orderId: selectedOrder.id,
      tracking: trackingNumber,
    });
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Orders</h1>
        <p className="text-gray-600 mt-2">View and manage customer orders</p>
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
              placeholder="Search by order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No orders found</p>
          <p className="text-sm text-gray-400">Orders containing your products will appear here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-white border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                    <p className="text-sm font-bold text-gray-900 mt-2">
                      Your Earnings: ${parseFloat(order.vendorEarnings || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Your Items in this Order:
                  </h4>
                  <div className="space-y-2">
                    {order.vendorItems?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 flex-shrink-0 overflow-hidden">
                            <CloudinaryImage
                              src={item.book?.imageUrl}
                              alt={item.book?.title || 'Book'}
                              width={96}
                              height={128}
                              className="w-full h-full"
                              fallbackIcon={['fal', 'book']}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.book?.title}</p>
                            <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          ${parseFloat((item.price * item.quantity).toString()).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Info */}
                {order.trackingNumber && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 p-3">
                    <p className="text-sm text-blue-800">
                      <FontAwesomeIcon icon={['fal', 'shipping-fast']} className="mr-2" />
                      Tracking Number:{' '}
                      <span className="font-mono font-semibold">{order.trackingNumber}</span>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsShipped(order)}
                      className="bg-primary text-white px-4 py-2 text-sm hover:bg-opacity-90 transition"
                    >
                      <FontAwesomeIcon icon={['fal', 'shipping-fast']} className="mr-2" />
                      Mark as Shipped
                    </button>
                  )}
                  <Link
                    href={`/vendor/orders/${order.id}`}
                    className="bg-gray-200 text-gray-700 px-4 py-2 text-sm hover:bg-gray-300 transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(page * 20, pagination.total)}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={['fal', 'chevron-left']} />
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter((pageNum) => {
                          return (
                            pageNum === 1 ||
                            pageNum === pagination.totalPages ||
                            Math.abs(pageNum - page) <= 1
                          );
                        })
                        .map((pageNum, index, arr) => {
                          const showEllipsisBefore = index > 0 && pageNum - arr[index - 1] > 1;

                          return (
                            <div key={pageNum} className="inline-flex">
                              {showEllipsisBefore && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => setPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageNum === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            </div>
                          );
                        })}

                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={['fal', 'chevron-right']} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tracking Modal */}
      <TrackingNumberModal
        isOpen={!!selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setTrackingNumber('');
        }}
        orderNumber={selectedOrder?.orderNumber || ''}
        trackingNumber={trackingNumber}
        onTrackingChange={setTrackingNumber}
        onSubmit={handleSubmitTracking}
        isSubmitting={updateTrackingMutation.isPending}
      />
    </div>
  );
}
