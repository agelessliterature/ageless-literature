'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import { formatMoney } from '@/lib/format';

export default function VendorPayoutsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Fetch vendor payouts
  const { data: payoutsData, isLoading } = useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/payouts'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch payouts');
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
    return <PageLoading message="Loading payouts..." fullPage={false} />;
  }

  const payouts = payoutsData?.payouts || [];
  const pagination = payoutsData?.pagination;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-primary">Payout History</h1>
        <p className="text-gray-600 mt-2">View all your completed and pending payouts</p>
      </div>

      {/* Payouts Table */}
      {payouts && payouts.length > 0 ? (
        <ResponsiveDataView
          breakpoint="md"
          mobile={
            <MobileCardList gap="md">
              {payouts.map((payout: any) => {
                const statusColors: Record<string, string> = {
                  completed: 'bg-green-100 text-green-800',
                  pending: 'bg-yellow-100 text-yellow-800',
                  failed: 'bg-red-100 text-red-800',
                };
                return (
                  <MobileCard
                    key={payout.id}
                    title={formatMoney(payout.amount, { fromCents: false })}
                    subtitle={payout.method}
                    badge={
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[payout.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        <FontAwesomeIcon
                          icon={
                            payout.status === 'completed'
                              ? (['fal', 'check-circle'] as [string, string])
                              : payout.status === 'pending'
                                ? (['fal', 'clock'] as [string, string])
                                : (['fal', 'times-circle'] as [string, string])
                          }
                          className="text-[10px]"
                        />
                        {payout.status}
                      </span>
                    }
                    details={[
                      {
                        label: 'Date',
                        value: new Date(payout.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }),
                      },
                      {
                        label: 'Transaction ID',
                        value: (
                          <span className="font-mono text-xs truncate">
                            {payout.transactionId || 'N/A'}
                          </span>
                        ),
                      },
                    ]}
                    primaryMetric={{
                      label: 'Amount',
                      value: formatMoney(payout.amount, { fromCents: false }),
                    }}
                  />
                );
              })}
            </MobileCardList>
          }
          desktop={
            <div className="bg-white border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payouts.map((payout: any) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payout.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {payout.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatMoney(payout.amount, { fromCents: false })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium ${payout.status === 'completed' ? 'bg-green-100 text-green-800' : payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                        >
                          <FontAwesomeIcon
                            icon={
                              payout.status === 'completed'
                                ? (['fal', 'check-circle'] as [string, string])
                                : payout.status === 'pending'
                                  ? (['fal', 'clock'] as [string, string])
                                  : (['fal', 'times-circle'] as [string, string])
                            }
                            className="text-sm"
                          />
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {payout.transactionId || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />
      ) : (
        <EmptyState
          icon={['fal', 'money-check-alt']}
          title="No payouts yet"
          description="Payouts will appear here once you request a withdrawal"
          actionLabel="Request Withdrawal"
          actionHref="/vendor/withdrawals/new"
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`px-4 py-2 ${
                page === pagination.currentPage
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
