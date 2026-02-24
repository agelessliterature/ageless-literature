/**
 * Account Bids Page
 * Lists user's auction bid history
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/format';

export default function AccountBidsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const { data: bidsData, isLoading } = useQuery({
    queryKey: ['account-bids'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/user/bids'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch bids');
      const result = await res.json();
      return result.data || [];
    },
    enabled: !!session,
  });

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoading message="Loading bids..." fullPage={false} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const bids = bidsData || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Bids</h1>
        <p className="text-gray-600 mt-2">Track your auction bids and activity</p>
      </div>

      {bids.length === 0 ? (
        <EmptyState
          icon={['fal', 'gavel']}
          title="No Bids Yet"
          description="Explore our auctions and start bidding!"
          actionLabel="Browse Auctions"
          actionHref={withBasePath('/auctions')}
        />
      ) : (
        <div className="space-y-4">
          {bids.map((bid: any) => (
            <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <p className="font-semibold text-lg">{bid.auction?.title || 'Auction Item'}</p>
                  <p className="text-gray-500 text-sm">
                    Bid placed: {new Date(bid.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bid.auction?.status === 'ended' && bid.status === 'winning'
                        ? 'bg-green-100 text-green-800'
                        : bid.auction?.status === 'ended' && bid.status !== 'winning'
                          ? 'bg-gray-100 text-gray-800'
                          : bid.status === 'winning'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {bid.auction?.status === 'ended' && bid.status === 'winning'
                      ? '🏆 Won'
                      : bid.auction?.status === 'ended'
                        ? '❌ Lost'
                        : bid.status === 'winning'
                          ? '👑 Highest Bid'
                          : '⬇️ Out Bid'}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <p className="font-medium">Your bid: {formatMoney(bid.amount)}</p>
                <Link
                  href={withBasePath(`/auctions/${bid.auctionId}`)}
                  className="text-primary hover:text-secondary"
                >
                  View Auction
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
