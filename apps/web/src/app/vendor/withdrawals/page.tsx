'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';

export default function VendorWithdrawalsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Fetch vendor withdrawals
  const { data: withdrawalsData, isLoading } = useQuery({
    queryKey: ['vendor-withdrawals'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/withdrawals'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch withdrawals');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading withdrawals...</div>
      </div>
    );
  }

  const withdrawals = withdrawalsData?.withdrawals || [];
  const pagination = withdrawalsData?.pagination;

  const getStatusIcon = (status: string): [string, string] => {
    switch (status) {
      case 'completed':
        return ['fal', 'check-circle'];
      case 'pending':
      case 'approved':
        return ['fal', 'clock'];
      case 'processing':
        return ['fal', 'spinner-third'];
      case 'rejected':
      case 'failed':
        return ['fal', 'times-circle'];
      default:
        return ['fal', 'clock'];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-indigo-100 text-indigo-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Link
            href="/vendor/dashboard"
            className="text-primary hover:text-secondary mb-4 inline-block"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary">Withdrawal Requests</h1>
          <p className="text-gray-600 mt-2">Track your withdrawal requests and their status</p>
        </div>
        <Link
          href="/vendor/withdrawals/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 hover:bg-opacity-90 transition"
        >
          <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
          New Withdrawal
        </Link>
      </div>

      {/* Withdrawals Table */}
      {withdrawals && withdrawals.length > 0 ? (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawals.map((withdrawal: any) => (
                <tr key={withdrawal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(withdrawal.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    ${parseFloat(withdrawal.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {withdrawal.method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium ${getStatusColor(withdrawal.status)}`}
                    >
                      <FontAwesomeIcon
                        icon={getStatusIcon(withdrawal.status)}
                        className={`w-3 h-3 ${withdrawal.status === 'processing' ? 'animate-spin' : ''}`}
                      />
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {withdrawal.completedAt
                      ? new Date(withdrawal.completedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/vendor/withdrawals/${withdrawal.id}`}
                      className="text-primary hover:text-secondary"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <FontAwesomeIcon icon={['fal', 'ban']} className="text-5xl text-gray-300 mb-3" />
          <p className="text-gray-500">No withdrawal requests yet</p>
          <p className="text-sm text-gray-400 mt-2 mb-6">
            Request a withdrawal to transfer your available balance
          </p>
          <Link
            href="/vendor/withdrawals/new"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 hover:bg-opacity-90 transition"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
            Request Withdrawal
          </Link>
        </div>
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
