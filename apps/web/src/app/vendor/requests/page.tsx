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
import { formatMoney } from '@/lib/format';

export default function VendorRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['vendor-requests', categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      });

      const res = await fetch(getApiUrl(`api/vendor/requests?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch requests');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  if (status === 'loading') {
    return <PageLoading message="Loading requests..." fullPage={false} />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const requests = requestsData?.requests || [];

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
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Rare Book Requests</h1>
        <p className="text-gray-600 mt-2">View customer requests for rare and hard-to-find books</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="all">All Categories</option>
          <option value="fiction">Fiction</option>
          <option value="non-fiction">Non-Fiction</option>
          <option value="poetry">Poetry</option>
          <option value="drama">Drama</option>
          <option value="biography">Biography</option>
          <option value="history">History</option>
          <option value="science">Science</option>
          <option value="philosophy">Philosophy</option>
        </select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <PageLoading message="Loading requests..." fullPage={false} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={['fal', 'search']}
          title="No requests found"
          description="Customer requests for rare books will appear here when they're looking for specific titles"
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div key={request.id} className="bg-white border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                  <p className="text-sm text-gray-600">by {request.author}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Posted {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {request.category}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Condition Sought:</span> {request.condition}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Budget:</span>{' '}
                  {formatMoney(request.maxPrice, { fromCents: false })}
                </p>
                {request.description && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Notes:</span> {request.description}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/vendor/books/new?requestId=${request.id}`}
                  className="bg-primary text-white px-4 py-2 text-sm hover:bg-opacity-90 transition"
                >
                  <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2" />I Have This Book
                </Link>
                <Link
                  href={getApiUrl(`/vendor/chat?customerId=${request.userId}`)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 text-sm hover:bg-gray-300 transition"
                >
                  <FontAwesomeIcon icon={['fal', 'envelope']} className="mr-2" />
                  Message Customer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
