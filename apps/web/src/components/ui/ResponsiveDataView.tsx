'use client';

import { ReactNode } from 'react';

interface ResponsiveDataViewProps {
  /** Content shown on desktop/tablet (typically a table) */
  desktop: ReactNode;
  /** Content shown on mobile (typically cards/list) */
  mobile: ReactNode;
  /** Tailwind breakpoint at which to switch. Default 'md' (768px) */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Renders a mobile-native view below the breakpoint and a desktop view above it.
 * Desktop content is hidden on mobile and vice versa using Tailwind responsive utilities.
 * This ensures tables remain on desktop while mobile gets a touch-friendly card layout.
 */
export default function ResponsiveDataView({
  desktop,
  mobile,
  breakpoint = 'md',
}: ResponsiveDataViewProps) {
  // Map breakpoint to Tailwind hidden/block classes
  const mobileHidden = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
  };
  const desktopHidden = {
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
  };

  return (
    <>
      {/* Mobile view — hidden at breakpoint and above */}
      <div className={mobileHidden[breakpoint]}>{mobile}</div>
      {/* Desktop view — hidden below breakpoint */}
      <div className={desktopHidden[breakpoint]}>{desktop}</div>
    </>
  );
}
