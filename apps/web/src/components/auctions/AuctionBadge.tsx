import React from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface AuctionBadgeProps {
  className?: string;
}

export default function AuctionBadge({ className = '' }: AuctionBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 bg-secondary text-white font-semibold shadow-lg ${className}`}
    >
      <FontAwesomeIcon icon={['fal', 'gavel'] as [string, string]} className="text-lg" />
      <span>LIVE AUCTION</span>
    </div>
  );
}
