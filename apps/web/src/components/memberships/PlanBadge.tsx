import React from 'react';

interface PlanBadgeProps {
  variant: 'popular' | 'premium' | 'starter';
  className?: string;
}

export default function PlanBadge({ variant, className = '' }: PlanBadgeProps) {
  const badgeStyles = {
    popular: {
      bg: 'bg-gradient-to-r from-secondary to-secondary-light',
      text: 'text-primary',
      label: 'Most Popular',
      glow: 'shadow-lg shadow-secondary/50',
    },
    premium: {
      bg: 'bg-gradient-to-r from-primary to-primary-dark',
      text: 'text-white',
      label: 'Premium',
      glow: 'shadow-lg shadow-primary/50',
    },
    starter: {
      bg: 'bg-gray-600',
      text: 'text-white',
      label: 'Best Value',
      glow: 'shadow-md shadow-gray-600/30',
    },
  };

  const style = badgeStyles[variant];

  return (
    <div
      className={`inline-flex items-center px-4 py-1.5 text-xs font-semibold tracking-wide uppercase ${style.bg} ${style.text} ${style.glow} ${className}`}
    >
      <span className="relative flex h-2 w-2 mr-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full ${style.text === 'text-white' ? 'bg-white' : 'bg-primary'} opacity-75`}
        ></span>
        <span
          className={`relative inline-flex h-2 w-2 ${style.text === 'text-white' ? 'bg-white' : 'bg-primary'}`}
        ></span>
      </span>
      {style.label}
    </div>
  );
}
