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
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';

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
      const res = await fetch(getApiUrl('api/bids/my-bids'), {
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading bids...</p>
        </div>
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
        <Link
          href={withBasePath('/account')}
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="mr-2" />
          Back to Account
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Bids</h1>
        <p className="text-gray-600 mt-2">Track your auction bids and activity</p>
      </div>

      {bids.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <FontAwesomeIcon icon={['fal', 'gavel']} className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Bids Yet</h3>
          <p className="text-gray-500 mb-4">Explore our auctions and start bidding!</p>
          <Link
            href={withBasePath('/auctions')}
            className="inline-block bg-primary text-white px-6 py-2 rounded hover:bg-opacity-90"
          >
            Browse Auctions
          </Link>
        </div>
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
                      bid.isWinning
                        ? 'bg-green-100 text-green-800'
                        : bid.auction?.status === 'ended'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {bid.isWinning
                      ? 'Winning'
                      : bid.auction?.status === 'ended'
                        ? 'Ended'
                        : 'Outbid'}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <p className="font-medium">Your bid: ${(bid.amount / 100).toFixed(2)}</p>
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
