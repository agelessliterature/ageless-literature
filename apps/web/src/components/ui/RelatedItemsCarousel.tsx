'use client';

import { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { BookCard } from '@/components/books/BookCard';
import type { BookListItem } from '@/types';

interface RelatedItemsCarouselProps {
  items: BookListItem[];
  title: string;
  emptyMessage?: string;
}

export default function RelatedItemsCarousel({
  items,
  title,
  emptyMessage: _emptyMessage = 'No items found',
}: RelatedItemsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(':scope > *')?.clientWidth || 300;
    const distance = cardWidth * 2 + 24; // 2 cards + gap
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  // Deduplicate by id
  const uniqueItems = items.filter(
    (item, index, self) => index === self.findIndex((i) => i.id === item.id),
  );

  if (uniqueItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {/* Desktop Navigation Arrows */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: '50%' }}
            aria-label="Scroll left"
          >
            <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-gray-700" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: '50%' }}
            aria-label="Scroll right"
          >
            <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-gray-700" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {uniqueItems.map((item) => (
          <div key={item.id} className="flex-none w-[280px] sm:w-[260px] lg:w-[280px] snap-start">
            <BookCard book={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
