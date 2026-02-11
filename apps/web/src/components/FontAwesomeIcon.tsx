'use client';

import React from 'react';

interface FontAwesomeIconProps {
  icon: [string, string]; // [prefix, iconName]
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  'aria-hidden'?: boolean | 'true' | 'false';
  spin?: boolean;
}

/**
 * Custom FontAwesomeIcon component that uses the kit's class-based approach
 * This works with the FontAwesome kit loaded via script tag
 * Usage: <FontAwesomeIcon icon={['fal', 'icon-name']} className="..." spin />
 *
 * Note: The FontAwesome Kit transforms <i> tags into <svg> on the client,
 * causing hydration mismatches. We suppress this warning with suppressHydrationWarning.
 */
export function FontAwesomeIcon({
  icon,
  className = '',
  style,
  onClick,
  'aria-hidden': ariaHidden = true,
  spin,
}: FontAwesomeIconProps) {
  const [prefix, iconName] = icon;
  const spinClass = spin ? 'fa-spin' : '';

  return (
    <i
      className={`${prefix} fa-${iconName} ${spinClass} ${className}`.trim()}
      style={style}
      onClick={onClick}
      aria-hidden={ariaHidden}
      suppressHydrationWarning
    />
  );
}
