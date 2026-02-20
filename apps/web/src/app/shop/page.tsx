'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { BookCard } from '@/components/books/BookCard';
import { BooksFilters } from '@/components/books/BooksFilters';
import Pagination from '@/components/shared/Pagination';
import api from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import type { BookListItem } from '@/types';
import { Auction } from '@/types/Auction';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import PageLoading from '@/components/ui/PageLoading';
import InlineError from '@/components/ui/InlineError';
import EmptyState from '@/components/ui/EmptyState';

interface BooksResponse {
  success: boolean;
  data: BookListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface FilterState {
  search: string;
  category: string;
  author: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  sortOrder: string;
}

export default function ShopPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: initialCategory,
    author: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'menu_order',
    sortOrder: 'ASC',
  });

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Update filters when URL params change
  useEffect(() => {
    const category = searchParams.get('category');
    if (category && category !== filters.category) {
      setFilters((prev) => ({ ...prev, category }));
    }
  }, [searchParams]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['books', filters, page],
    queryFn: async () => {
      const params: any = {
        page,
        limit: 24,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.author) params.author = filters.author;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      const { data } = await api.get<BooksResponse>('/books', { params });
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch active auctions
  const { data: auctionsData } = useQuery<Auction[]>({
    queryKey: ['active-auctions-shop'],
    queryFn: async () => {
      const response = await api.get('/auctions', {
        params: {
          status: 'active',
          limit: 100,
        },
      });
      return response.data.data || [];
    },
  });

  const books = data?.data ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 24, totalPages: 1 };

  // Create a map of bookId -> auction for easy lookup
  const auctionMap = new Map<number, Auction>();
  if (auctionsData) {
    auctionsData.forEach((auction) => {
      if (auction.auctionableType === 'book' && auction.auctionableId) {
        auctionMap.set(Number(auction.auctionableId), auction);
      }
    });
  }

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      author: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'menu_order',
      sortOrder: 'ASC',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-primary border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Rare & Collectibles</h1>
          <p className="text-lg text-white/90">
            Discover our curated collection of {pagination.total.toLocaleString()} products from
            trusted vendors worldwide
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <Link
              href={withBasePath('/shop')}
              className="border-b-2 border-primary text-primary py-4 px-1 text-sm font-medium"
            >
              Shop Products
            </Link>
            <Link
              href={withBasePath('/auctions')}
              className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium"
            >
              Browse Auctions
            </Link>
          </nav>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white border-b border-gray-200 sm:static md:static lg:static lg:top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FontAwesomeIcon
                  icon={['fal', 'search']}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base"
                />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  placeholder="Search by title, author..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span className="font-medium">Filters</span>
              {(filters.category || filters.author || filters.minPrice || filters.maxPrice) && (
                <span className="ml-1 px-2 py-0.5 bg-primary text-white text-xs">Active</span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <BooksFilters filters={filters} onChange={handleFilterChange} onClear={clearFilters} />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && <PageLoading message="Loading books..." fullPage={false} />}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center py-20">
            <InlineError
              message={error instanceof Error ? error.message : 'Failed to load books'}
              onRetry={() => window.location.reload()}
            />
          </div>
        )}

        {/* No Books State */}
        {!isLoading && !isError && books.length === 0 && (
          <EmptyState
            icon={['fal', 'book']}
            title="No books found"
            description="Try adjusting your filters or search terms to find what you're looking for."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        )}

        {/* Books Grid */}
        {!isLoading && !isError && books.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => {
                const auction = auctionMap.get(book.id);

                // Render auction card if this book has an active auction
                if (auction) {
                  const itemImage =
                    book.primaryImage ||
                    (book as any).images?.[0]?.url ||
                    (book as any).media?.[0]?.imageUrl ||
                    '/placeholder.jpg';
                  const endDate = (auction as any).endDate || (auction as any).endsAt;
                  const isEndingSoon =
                    endDate && new Date(endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

                  return (
                    <Link
                      key={book.id}
                      href={withBasePath(
                        `/products/${book.slug || book.id}?auctionId=${auction.id}`,
                      )}
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
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-secondary transition-colors line-clamp-2 h-14">
                          {book.title}
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

                        {/* Bid Button */}
                        <div
                          className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white hover:text-black px-6 py-2 text-sm font-semibold transition-all duration-300 w-full border-2 border-black hover:border-secondary cursor-pointer"
                          style={{ borderRadius: '1.5rem' }}
                          role="button"
                          tabIndex={0}
                        >
                          BID NOW
                        </div>
                      </div>
                    </Link>
                  );
                }

                // Render regular book card
                return <BookCard key={book.id} book={book} />;
              })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={setPage}
              className="mt-8 mb-8"
            />
          </>
        )}
      </div>
    </div>
  );
}
