'use client';

import { ReactNode } from 'react';

interface MasonryGridProps {
  children: ReactNode;
}

export function MasonryGrid({ children }: MasonryGridProps) {
  return (
    <div className="masonry-grid">
      <style jsx>{`
        .masonry-grid {
          column-count: 1;
          column-gap: 1.5rem;
        }

        @media (min-width: 640px) {
          .masonry-grid {
            column-count: 2;
          }
        }

        @media (min-width: 1024px) {
          .masonry-grid {
            column-count: 3;
          }
        }

        @media (min-width: 1280px) {
          .masonry-grid {
            column-count: 4;
          }
        }

        .masonry-grid > :global(*) {
          break-inside: avoid;
          margin-bottom: 1.5rem;
        }
      `}</style>
      {children}
    </div>
  );
}
