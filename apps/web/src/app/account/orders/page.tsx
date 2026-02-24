/**
 * Account Orders Page
 * Lists user's order history
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/format';

export default function AccountOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['account-orders'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/orders'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const result = await res.json();
      return result.data || [];
    },
    enabled: !!session,
  });

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const orders = ordersData || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Orders</h1>
        <p className="text-gray-600 mt-2">View and track your order history</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={['fal', 'shopping-bag']}
          title="No Orders Yet"
          description="Start exploring our collection of rare books!"
          actionLabel="Browse Books"
          actionHref={withBasePath('/shop')}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <p className="font-semibold text-lg">Order #{order.orderNumber}</p>
                  <p className="text-gray-500 text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'shipped'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <p className="font-medium">{formatMoney(order.totalAmount)}</p>
                <Link
                  href={withBasePath(`/account/orders/${order.id}`)}
                  className="text-primary hover:text-secondary"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
