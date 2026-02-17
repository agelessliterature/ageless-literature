import { ReactNode } from 'react';

interface MobileCardListProps {
  children: ReactNode;
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg';
  /** Optional empty state when no children */
  emptyState?: ReactNode;
  /** Whether the list is currently empty */
  isEmpty?: boolean;
  className?: string;
}

export default function MobileCardList({
  children,
  gap = 'md',
  emptyState,
  isEmpty = false,
  className = '',
}: MobileCardListProps) {
  const gapClasses = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  };

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`${gapClasses[gap]} ${className}`} role="list">
      {children}
    </div>
  );
}
