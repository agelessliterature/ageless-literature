/**
 * Account Winnings Page
 * Lists user's auction wins with claim/pay actions
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/format';
import toast from 'react-hot-toast';

interface Winning {
  id: number;
  auctionId: number;
  userId: number;
  winningAmount: number;
  status: string;
  orderId: number | null;
  paidAt: string | null;
  createdAt: string;
  auction?: {
    id: number;
    title: string;
    status: string;
    book?: {
      id: number;
      title: string;
      author: string;
      coverImage?: string;
    };
  };
  order?: {
    id: number;
    orderNumber: string;
    status: string;
    total: number;
  };
}

export default function AccountWinningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const { data: winningsData, isLoading } = useQuery({
    queryKey: ['account-winnings'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/user/winnings'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch winnings');
      const result = await res.json();
      return result.data || [];
    },
    enabled: !!session,
  });

  const handleClaim = async (auctionId: number) => {
    setClaimingId(auctionId);
    try {
      const res = await fetch(getApiUrl(`api/user/winnings/${auctionId}/claim`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Winning claimed! You can now proceed to payment.');
        queryClient.invalidateQueries({ queryKey: ['account-winnings'] });
      } else {
        toast.error(result.message || 'Failed to claim winning');
      }
    } catch {
      toast.error('Failed to claim winning. Please try again.');
    } finally {
      setClaimingId(null);
    }
  };

  const handlePay = async (auctionId: number) => {
    setPayingId(auctionId);
    try {
      const res = await fetch(getApiUrl(`api/user/winnings/${auctionId}/pay`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Payment processed successfully!');
        queryClient.invalidateQueries({ queryKey: ['account-winnings'] });
      } else {
        toast.error(result.message || 'Payment failed');
      }
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoading message="Loading winnings..." fullPage={false} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const winnings: Winning[] = winningsData || [];

  const getStatusBadge = (winning: Winning) => {
    if (winning.paidAt || winning.order?.status === 'paid') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Paid
        </span>
      );
    }
    if (winning.orderId) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          Claimed - Awaiting Payment
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        Pending - Claim Now
      </span>
    );
  };

  const getActionButtons = (winning: Winning) => {
    if (winning.paidAt || winning.order?.status === 'paid') {
      return (
        <Link
          href={withBasePath('/account/orders')}
          className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-opacity-90"
        >
          View Orders
        </Link>
      );
    }

    if (winning.orderId) {
      return (
        <button
          onClick={() => handlePay(winning.auctionId)}
          disabled={payingId === winning.auctionId}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {payingId === winning.auctionId ? (
            <>
              <FontAwesomeIcon icon={['fal', 'spinner']} spin className="mr-2" />
              Processing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={['fal', 'credit-card']} className="mr-2" />
              Pay Now
            </>
          )}
        </button>
      );
    }

    return (
      <button
        onClick={() => handleClaim(winning.auctionId)}
        disabled={claimingId === winning.auctionId}
        className="bg-primary text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {claimingId === winning.auctionId ? (
          <>
            <FontAwesomeIcon icon={['fal', 'spinner']} spin className="mr-2" />
            Claiming...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={['fal', 'check-circle']} className="mr-2" />
            Claim Winning
          </>
        )}
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Winnings</h1>
        <p className="text-gray-600 mt-2">Manage your auction wins and payments</p>
      </div>

      {winnings.length === 0 ? (
        <EmptyState
          icon={['fal', 'trophy']}
          title="No Winnings Yet"
          description="Place bids on auctions to win rare books!"
          actionLabel="Browse Auctions"
          actionHref={withBasePath('/auctions')}
        />
      ) : (
        <div className="space-y-4">
          {winnings.map((winning) => (
            <div key={winning.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {winning.auction?.book?.title || winning.auction?.title || 'Auction Item'}
                  </h3>
                  {winning.auction?.book?.author && (
                    <p className="text-gray-600 text-sm mb-2">by {winning.auction.book.author}</p>
                  )}
                  <p className="text-gray-500 text-sm">
                    Won on: {new Date(winning.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0 sm:ml-4">{getStatusBadge(winning)}</div>
              </div>

              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {formatMoney(winning.winningAmount)}
                    </p>
                    <p className="text-sm text-gray-500">Winning bid amount</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={withBasePath(`/auctions/${winning.auctionId}`)}
                      className="inline-block border border-primary text-primary px-4 py-2 rounded hover:bg-primary hover:text-white transition-colors"
                    >
                      View Auction
                    </Link>
                    {getActionButtons(winning)}
                  </div>
                </div>
              </div>

              {winning.order && (
                <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 sm:px-6 py-3 rounded-b-lg">
                  <p className="text-sm text-gray-600">
                    <FontAwesomeIcon icon={['fal', 'shopping-bag']} className="mr-2" />
                    Order #{winning.order.orderNumber} • {winning.order.status}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
