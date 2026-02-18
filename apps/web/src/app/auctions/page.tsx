'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/clientTranslations';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Auction } from '@/types/Auction';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import { useState } from 'react';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';

type SortOption = 'ending-soon' | 'newest' | 'price-low' | 'price-high' | 'most-bids';

export default function AuctionsPage() {
  const t = useTranslations('home');
  const [sortBy, setSortBy] = useState<SortOption>('ending-soon');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch all active auctions
  const { data: auctions, isLoading } = useQuery<Auction[]>({
    queryKey: ['all-auctions', sortBy],
    queryFn: async () => {
      const response = await api.get('/auctions', {
        params: {
          status: 'active',
          limit: 50,
        },
      });
      return response.data.data || [];
    },
  });

  // Sort auctions based on selected option
  const sortedAuctions = auctions
    ? [...auctions].sort((a, b) => {
        switch (sortBy) {
          case 'ending-soon': {
            const dateA = new Date((a as any).endDate || (a as any).endsAt).getTime();
            const dateB = new Date((b as any).endDate || (b as any).endsAt).getTime();
            return dateA - dateB;
          }
          case 'newest': {
            const createdA = new Date((a as any).createdAt).getTime();
            const createdB = new Date((b as any).createdAt).getTime();
            return createdB - createdA;
          }
          case 'price-low':
            return (
              Number(a.currentBid || a.startingPrice) - Number(b.currentBid || b.startingPrice)
            );
          case 'price-high':
            return (
              Number(b.currentBid || b.startingPrice) - Number(a.currentBid || a.startingPrice)
            );
          case 'most-bids':
            return (b.bidCount || 0) - (a.bidCount || 0);
          default:
            return 0;
        }
      })
    : [];

  // Filter auctions based on search query
  const filteredAuctions = sortedAuctions.filter((auction) => {
    if (!searchQuery.trim()) return true;

    const item = auction.item || auction.book || auction.product;
    const itemTitle = (item?.title || '').toLowerCase();
    const itemAuthor = ((item as any)?.author || (item as any)?.artist || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return itemTitle.includes(query) || itemAuthor.includes(query);
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Clean, No Border Radius */}
      <section className="bg-primary py-16 md:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Live Auctions
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Discover and bid on extraordinary rare books, manuscripts, and literary treasures
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <Link
              href="/shop"
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium"
            >
              Back to Shop
            </Link>
            <Link
              href="/auctions"
              className="border-b-2 border-primary text-primary py-4 px-1 text-sm font-medium"
            >
              Browse Auctions
            </Link>
          </nav>
        </div>
      </div>

      {/* Filters Section - Clean Style */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search Bar */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search auctions by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 border-gray-200 px-4 py-3 pl-12 text-sm focus:border-[#d4af37] focus:outline-none transition-colors bg-white"
                style={{ borderRadius: 0 }}
              />
              <FontAwesomeIcon
                icon={['fal', 'search']}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FontAwesomeIcon icon={['fal', 'times']} className="text-lg" />
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                Sort By:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="border-2 border-gray-200 px-4 py-3 text-sm font-medium focus:border-[#d4af37] focus:outline-none transition-colors bg-white min-w-[180px]"
                style={{ borderRadius: 0 }}
              >
                <option value="ending-soon">Ending Soon</option>
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="most-bids">Most Bids</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600 flex-shrink-0 text-right">
              <span className="font-semibold text-primary">{filteredAuctions.length}</span> Active
              Auction{filteredAuctions.length !== 1 ? 's' : ''}
              {searchQuery && (
                <span className="ml-2 text-gray-500 block lg:inline">
                  (filtered from {sortedAuctions.length})
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Auctions Grid - Clean, No Border Radius */}
      <section className="py-12 md:py-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <PageLoading message="Loading auctions..." fullPage={false} />
          ) : sortedAuctions.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAuctions.map((auction) => {
                const item = auction.item || auction.book || auction.product;
                const itemImage =
                  (item as any)?.images?.[0]?.url ||
                  (item as any)?.media?.[0]?.imageUrl ||
                  '/placeholder.jpg';
                const itemTitle = item?.title || 'Auction Item';
                const endDate = (auction as any).endDate || (auction as any).endsAt;
                const isEndingSoon =
                  endDate && new Date(endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

                return (
                  <Link
                    key={auction.id}
                    href={`/products/${item?.slug || item?.id}?auctionId=${auction.id}`}
                    className="group block bg-black shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                    style={{ borderRadius: '1.5rem' }}
                  >
                    {/* Status Badge - Red "ENDING SOON" */}
                    <div className="relative">
                      {isEndingSoon && (
                        <div
                          className="absolute top-4 right-4 z-10 bg-red-600 text-white px-3 py-1 text-xs font-bold shadow-lg"
                          style={{ borderRadius: 0 }}
                        >
                          ENDING SOON
                        </div>
                      )}

                      {/* Image */}
                      <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                        <img
                          src={itemImage}
                          alt={itemTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-secondary transition-colors line-clamp-2 h-14">
                        {itemTitle}
                      </h3>

                      {/* Bid Price */}
                      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                        <span className="text-sm text-gray-300 font-semibold">
                          {auction.bidCount ? 'CURRENT BID' : 'STARTING BID'}
                        </span>
                        <span className="text-2xl font-bold text-white">
                          {Math.floor(
                            Number(auction.bidCount ? auction.currentBid : auction.startingPrice),
                          )}{' '}
                          USD
                        </span>
                      </div>

                      {/* Bid Count and Timer */}
                      <div className="flex justify-between items-center text-sm text-gray-300 mb-4">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={['fal', 'hammer'] as [string, string]} />
                          {auction.bidCount || 0} {auction.bidCount === 1 ? 'bid' : 'bids'}
                        </span>
                        <span className="font-semibold flex items-center gap-1">
                          <FontAwesomeIcon icon={['fal', 'clock'] as [string, string]} />
                          <AuctionCountdown endsAt={endDate} />
                        </span>
                      </div>

                      {/* Bid Button - Black/Gold Style */}
                      <div
                        className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary text-white hover:text-black px-6 py-2 text-sm font-semibold transition-all duration-300 w-full border-2 border-black hover:border-secondary cursor-pointer"
                        style={{ borderRadius: '1.5rem' }}
                        role="button"
                        tabIndex={0}
                      >
                        {t('featuredAuctions.bidNow')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : searchQuery ? (
            <EmptyState
              icon={['fal', 'search']}
              title="No Matching Auctions"
              description={`No auctions found for "${searchQuery}". Try a different search term.`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <EmptyState
              icon={['fal', 'gavel']}
              title="No Active Auctions"
              description="There are no live auctions at the moment. Check back soon for exciting rare book auctions!"
              actionLabel="Browse Our Collection"
              actionHref="/shop"
            />
          )}
        </div>
      </section>

      {/* Newsletter / CTA Section */}
      <section className="bg-gray-50 border-t border-gray-200 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FontAwesomeIcon icon={['fal', 'bell']} className="text-4xl text-[#d4af37] mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Never Miss an Auction
          </h2>
          <p className="text-gray-600 mb-6">
            Sign up for auction alerts and be the first to know when rare items become available
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-[#d4af37] hover:bg-[#b8941f] text-white px-8 py-4 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            style={{ borderRadius: 0 }}
          >
            Create Account
            <FontAwesomeIcon icon={['fal', 'arrow-right']} />
          </Link>
        </div>
      </section>
    </div>
  );
}
