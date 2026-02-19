'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import { formatMoney } from '@/lib/format';

export default function VendorReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState('30');
  const [activityPage, setActivityPage] = useState(1);

  // Use aggregated endpoint to fetch both summary and products data in one call
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['vendor-reports-overview', period],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`api/vendor/reports/overview?period=${period}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch reports overview');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes since reports change frequently
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['vendor-payment-activity', activityPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: activityPage.toString(), limit: '15' });
      const res = await fetch(getApiUrl(`api/vendor/earnings?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) return null;
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  if (status === 'loading') {
    return <PageLoading message="Loading reports..." fullPage={false} />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  // Extract data from the aggregated response
  const summary = reportsData?.summary || {};
  const topProducts = reportsData?.topProducts || [];
  const activityEarnings: any[] = activityData?.earnings || [];
  const activityMeta = activityData?.meta || {};
  const isLoading = reportsLoading;

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
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">View detailed sales reports and analytics</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black w-full sm:w-auto"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center mb-8">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 border-l-4 border-green-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'dollar-sign']}
              className="text-2xl sm:text-3xl text-green-600 mb-2"
            />
            <p className="text-xl sm:text-3xl font-bold text-gray-900">
              {formatMoney(summary.periodEarnings, { fromCents: false })}
            </p>
            <p className="text-sm text-gray-600">Net Earnings</p>
            <p className="text-xs text-gray-400">after platform fee</p>
          </div>

          <div className="bg-white p-4 sm:p-6 border-l-4 border-blue-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'chart-line']}
              className="text-2xl sm:text-3xl text-blue-600 mb-2"
            />
            <p className="text-xl sm:text-3xl font-bold text-gray-900">
              {formatMoney(summary.periodRevenue, { fromCents: false })}
            </p>
            <p className="text-sm text-gray-600">Gross Sales</p>
          </div>

          <div className="bg-white p-4 sm:p-6 border-l-4 border-purple-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'shopping-cart']}
              className="text-2xl sm:text-3xl text-purple-600 mb-2"
            />
            <p className="text-xl sm:text-3xl font-bold text-gray-900">
              {summary.periodOrdersCount || 0}
            </p>
            <p className="text-sm text-gray-600">Orders</p>
          </div>

          <div className="bg-white p-4 sm:p-6 border-l-4 border-red-500 shadow-sm">
            <FontAwesomeIcon
              icon={['fal', 'percentage']}
              className="text-2xl sm:text-3xl text-red-500 mb-2"
            />
            <p className="text-xl sm:text-3xl font-bold text-gray-900">
              {formatMoney(summary.periodCommission, { fromCents: false })}
            </p>
            <p className="text-sm text-gray-600">Commission Paid</p>
            <p className="text-xs text-gray-400">platform fee (8%)</p>
          </div>
        </div>
      )}

      {/* Commission Breakdown */}
      {!isLoading && (
        <div className="bg-white border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-primary mb-4">Period Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-4 bg-gray-50">
              <span className="text-gray-700">Gross Revenue</span>
              <span className="font-bold text-gray-900">
                {formatMoney(summary.periodRevenue, { fromCents: false })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50">
              <span className="text-gray-700">Platform Fee (8%)</span>
              <span className="font-bold text-red-600">
                &minus;{formatMoney(summary.periodCommission, { fromCents: false })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50">
              <span className="text-gray-700">Your Net Earnings</span>
              <span className="font-bold text-green-600">
                {formatMoney(summary.periodEarnings, { fromCents: false })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Activity */}
      <div className="bg-white border border-gray-200 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-primary">Payment Activity</h3>
          <Link href="/vendor/earnings" className="text-sm text-primary hover:underline">
            View all earnings
            <FontAwesomeIcon icon={['fal', 'arrow-right']} className="ml-1" />
          </Link>
        </div>
        {activityLoading ? (
          <div className="p-8 text-center text-gray-400">Loading activity...</div>
        ) : activityEarnings.length === 0 ? (
          <EmptyState
            icon={['fal', 'receipt']}
            title="No payment activity yet"
            description="Earnings will appear here once orders are placed"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sale Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Platform Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Your Earnings
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityEarnings.map((e: any) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      available: 'bg-green-100 text-green-800',
                      completed: 'bg-green-100 text-green-800',
                      paid: 'bg-blue-100 text-blue-800',
                    };
                    const badge = statusColors[e.status] || 'bg-gray-100 text-gray-700';
                    return (
                      <tr key={e.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {e.order?.orderNumber || e.orderId || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                          {formatMoney(e.amount, { fromCents: false })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-red-600">
                          &minus;{formatMoney(e.platformFee, { fromCents: false })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-green-600">
                          {formatMoney(e.netAmount, { fromCents: false })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${badge}`}
                          >
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {activityMeta.totalPages > 1 && (
              <div className="p-4 border-t flex justify-center gap-3">
                <button
                  onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                  disabled={activityPage === 1}
                  className="px-3 py-1 border text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {activityPage} / {activityMeta.totalPages}
                </span>
                <button
                  onClick={() => setActivityPage((p) => Math.min(activityMeta.totalPages, p + 1))}
                  disabled={activityPage === activityMeta.totalPages}
                  className="px-3 py-1 border text-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Top Products */}
      {isLoading ? (
        <PageLoading message="Loading products..." fullPage={false} />
      ) : (
        <div className="bg-white border border-gray-200">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-primary">Top Performing Products</h3>
          </div>
          {topProducts.length === 0 ? (
            <EmptyState
              icon={['fal', 'chart-bar']}
              title="No product data yet"
              description="Product performance data will appear here once you start selling"
            />
          ) : (
            <ResponsiveDataView
              breakpoint="md"
              mobile={
                <MobileCardList gap="md">
                  {topProducts.map((product: any) => (
                    <MobileCard
                      key={product.id}
                      title={product.title}
                      subtitle={product.author}
                      details={[
                        { label: 'Views', value: String(product.views || 0) },
                        { label: 'Sales', value: String(product.salesCount || 0) },
                        { label: 'Conversion', value: `${product.conversionRate || '0.00'}%` },
                      ]}
                      primaryMetric={{
                        label: 'Revenue',
                        value: formatMoney(product.revenue, { fromCents: false }),
                      }}
                    />
                  ))}
                </MobileCardList>
              }
              desktop={
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Views
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Sales
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Conversion
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topProducts.map((product: any) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.title}</div>
                            <div className="text-sm text-gray-500">{product.author}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.views || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {product.salesCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {formatMoney(product.revenue, { fromCents: false })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.conversionRate || '0.00'}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
