'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/format';

export default function AdminCommissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-commissions', page, statusFilter, typeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { transactionType: typeFilter }),
        ...(search && { search }),
      });
      const res = await fetch(getApiUrl(`api/admin/commissions?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch commissions');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const commissions = data?.commissions || [];
  const summary = data?.summary;
  const pagination = data?.pagination;

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/admin/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block text-sm"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Platform Commissions</h1>
        <p className="text-gray-600 mt-1 text-sm">
          All platform fees collected — sales (8%) and auctions (5%)
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-l-4 border-green-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Fees Collected</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatMoney(Number(summary.total_fees), { fromCents: false })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              from{' '}
              {Number(summary.total_gross).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}{' '}
              gross
            </p>
          </div>
          <div className="bg-white border-l-4 border-blue-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider">From Sales (8%)</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatMoney(Number(summary.sale_fees), { fromCents: false })}
            </p>
          </div>
          <div className="bg-white border-l-4 border-purple-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider">From Auctions (5%)</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatMoney(Number(summary.auction_fees), { fromCents: false })}
            </p>
          </div>
          <div className="bg-white border-l-4 border-yellow-500 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Transactions</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{summary.total_count || 0}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.pending_count || 0} pending</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 mb-6 flex flex-wrap items-center gap-3">
        <FontAwesomeIcon icon={['fal', 'filter']} className="text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 border border-gray-300 text-sm focus:ring-2 focus:ring-black"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 border border-gray-300 text-sm focus:ring-2 focus:ring-black"
        >
          <option value="all">All Types</option>
          <option value="sale">Sales</option>
          <option value="auction">Auctions</option>
        </select>
        <input
          type="text"
          placeholder="Search vendor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 border border-gray-300 text-sm focus:ring-2 focus:ring-black w-48"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading commissions…</div>
      ) : commissions.length > 0 ? (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform Fee
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Net
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c: any) => {
                  const isAuction = c.transactionType === 'auction';
                  const rate = c.commissionRateBps
                    ? `${(c.commissionRateBps / 100).toFixed(0)}%`
                    : isAuction
                      ? '5%'
                      : '8%';
                  const statusColor =
                    c.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : c.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800';
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {new Date(c.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">
                          {c.vendor?.storeName || '—'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {c.vendor?.user?.email || ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[160px]">
                        <p className="truncate">{c.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-500 text-xs">
                        {c.order?.orderNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            isAuction ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isAuction ? 'Auction' : 'Sale'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{rate}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {formatMoney(Number(c.amount), { fromCents: false })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-green-700">
                        {formatMoney(Number(c.platformFee), { fromCents: false })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600">
                        {formatMoney(Number(c.netAmount), { fromCents: false })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={['fal', 'percent']}
          title="No commissions found"
          description={
            statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No commissions match the selected filters'
              : 'Commission records will appear here after sales are processed'
          }
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
