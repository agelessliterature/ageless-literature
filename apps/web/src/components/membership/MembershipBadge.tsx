'use client';

import React from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getTierColor, getTierDisplayName, type MembershipTier } from '@/lib/membershipAccess';

interface MembershipBadgeProps {
  tier: MembershipTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function MembershipBadge({
  tier,
  size = 'md',
  showIcon = true,
  className = '',
}: MembershipBadgeProps) {
  if (tier === 'none') return null;

  const colors = getTierColor(tier);
  const displayName = getTierDisplayName(tier);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <FontAwesomeIcon icon={['fal', 'crown']} className={iconSizes[size]} />}
      {displayName}
    </span>
  );
}
