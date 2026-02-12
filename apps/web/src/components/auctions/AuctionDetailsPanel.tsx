'use client';

import React from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import AuctionCountdown from './AuctionCountdown';
import { AuctionSummary } from '@/types/Auction';

interface AuctionDetailsPanelProps {
  auction: AuctionSummary;
  className?: string;
}

export default function AuctionDetailsPanel({ auction, className = '' }: AuctionDetailsPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`bg-gradient-to-br from-secondary-50 to-secondary-100 border-2 border-secondary-300 p-6 ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bid Price */}
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 text-sm text-secondary-700 font-semibold mb-2">
            <FontAwesomeIcon icon={['fal', 'hammer'] as [string, string]} />
            <span>{auction.bidCount ? 'CURRENT BID' : 'STARTING BID'}</span>
          </div>
          <div className="text-3xl font-bold text-secondary-900">
            {formatCurrency(auction.bidCount ? auction.currentBid : auction.startingPrice)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
          </div>
        </div>

        {/* Time Remaining */}
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 text-sm text-secondary-700 font-semibold mb-2">
            <FontAwesomeIcon icon={['fal', 'clock'] as [string, string]} />
            <span>TIME REMAINING</span>
          </div>
          <div className="text-3xl font-bold text-secondary-900">
            <AuctionCountdown endsAt={auction.endsAt} />
          </div>
          <div className="text-sm text-gray-600 mt-1">Ends {formatDate(auction.endsAt)}</div>
        </div>

        {/* Starting Price */}
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 text-sm text-secondary-700 font-semibold mb-2">
            <FontAwesomeIcon icon={['fal', 'tag'] as [string, string]} />
            <span>STARTING PRICE</span>
          </div>
          <div className="text-3xl font-bold text-secondary-900">
            {formatCurrency(auction.startingPrice)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Started {formatDate(auction.startsAt)}</div>
        </div>
      </div>
    </div>
  );
}
