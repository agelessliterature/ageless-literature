'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import { formatMoney } from '@/lib/format';

export default function VendorEarningsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch vendor earnings
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['vendor-earnings', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await fetch(getApiUrl(`api/vendor/earnings?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch earnings');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  if (!session) {
    router.push('/auth/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageLoading message="Loading earnings..." fullPage={false} />
      </div>
    );
  }

  const earnings = earningsData?.earnings || [];
  const pagination = earningsData?.pagination;
  const summary = earningsData?.summary;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Earnings History</h1>
        <p className="text-gray-600 mt-2">Complete history of your sales and earnings</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white border-l-4 border-green-500 p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-600">Total Earnings</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatMoney(summary.totalEarnings, { fromCents: false })}
            </p>
          </div>
          <div className="bg-white border-l-4 border-blue-500 p-6 shadow-sm">
            <p className="text-sm text-gray-600">Completed Sales</p>
            <p className="text-2xl font-bold text-gray-900">{summary.completedCount || 0}</p>
          </div>
          <div className="bg-white border-l-4 border-yellow-500 p-6 shadow-sm">
            <p className="text-sm text-gray-600">Pending Sales</p>
            <p className="text-2xl font-bold text-gray-900">{summary.pendingCount || 0}</p>
          </div>
          <div className="bg-white border-l-4 border-purple-500 p-6 shadow-sm">
            <p className="text-sm text-gray-600">Gross Sales</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoney(summary.grossSales, { fromCents: false })}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
        <FontAwesomeIcon icon={['fal', 'filter']} className="text-base text-gray-500" />
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1 border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Earnings Table */}
      {earnings && earnings.length > 0 ? (
        <ResponsiveDataView
          breakpoint="md"
          mobile={
            <MobileCardList gap="md">
              {earnings.map((earning: any) => {
                const statusColors: Record<string, string> = {
                  paid: 'bg-green-100 text-green-800',
                  pending: 'bg-yellow-100 text-yellow-800',
                  processing: 'bg-blue-100 text-blue-800',
                  cancelled: 'bg-red-100 text-red-800',
                };
                return (
                  <MobileCard
                    key={earning.id}
                    title={earning.description || earning.orderItem?.book?.title || 'N/A'}
                    subtitle={earning.transactionType === 'auction' ? 'Auction' : 'Sale'}
                    badge={
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[earning.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {earning.status}
                      </span>
                    }
                    details={[
                      {
                        label: 'Date',
                        value: new Date(earning.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }),
                      },
                      {
                        label: 'Order',
                        value: (
                          <span className="font-mono text-xs">
                            {earning.order?.orderNumber || 'Auction'}
                          </span>
                        ),
                      },
                      {
                        label: 'Rate',
                        value: earning.commissionRateBps
                          ? `${(earning.commissionRateBps / 100).toFixed(0)}%`
                          : '8%',
                      },
                      { label: 'Gross', value: formatMoney(earning.amount, { fromCents: false }) },
                      {
                        label: 'Commission',
                        value: (
                          <span className="text-red-600">
                            -{formatMoney(earning.platformFee, { fromCents: false })}
                          </span>
                        ),
                      },
                    ]}
                    primaryMetric={{
                      label: 'Your Earnings',
                      value: (
                        <span className="text-green-600 font-bold">
                          {formatMoney(earning.netAmount, { fromCents: false })}
                        </span>
                      ),
                    }}
                  />
                );
              })}
            </MobileCardList>
          }
          desktop={
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Your Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {earnings.map((earning: any) => (
                      <tr key={earning.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(earning.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <p className="font-medium truncate max-w-[180px]">
                            {earning.description || earning.orderItem?.book?.title || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              earning.transactionType === 'auction'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {earning.transactionType === 'auction' ? 'Auction' : 'Sale'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {earning.order?.orderNumber || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700 font-medium">
                          {earning.commissionRateBps
                            ? `${(earning.commissionRateBps / 100).toFixed(0)}%`
                            : '8%'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          {formatMoney(earning.amount, { fromCents: false })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                          -{formatMoney(earning.platformFee, { fromCents: false })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                          {formatMoney(earning.netAmount, { fromCents: false })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs ${earning.status === 'paid' ? 'bg-green-100 text-green-800' : earning.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : earning.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {earning.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          }
        />
      ) : (
        <EmptyState
          icon={['fal', 'money-bill-wave']}
          title="No earnings found"
          description={
            statusFilter !== 'all'
              ? `No ${statusFilter} earnings to display`
              : 'Start selling to see your earnings here'
          }
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
