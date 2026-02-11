'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { BookCard } from '@/components/books/BookCard';
import { BooksFilters } from '@/components/books/BooksFilters';
import api from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import type { BookListItem } from '@/types';

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

  const books = data?.data ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 24, totalPages: 1 };

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

  // Pagination helper
  const getPageNumbers = () => {
    const { page: currentPage, totalPages } = pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-primary border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Rare & Collectibles
          </h1>
          <p className="text-lg text-white/90">
            Discover our curated collection of {pagination.total.toLocaleString()} products from trusted vendors worldwide
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
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
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <FontAwesomeIcon
                icon={['fal', 'spinner-third']}
                spin
                className="text-5xl text-primary mb-4"
              />
              <p className="text-gray-600">Loading books...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <FontAwesomeIcon
                icon={['fal', 'exclamation-circle']}
                className="text-6xl text-red-600 mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-6">
                {error instanceof Error ? error.message : 'Failed to load books'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && books.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <FontAwesomeIcon icon={['fal', 'book']} className="text-8xl text-gray-300 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No books found</h2>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters or search terms to find what you're looking for.
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Books Grid */}
        {!isLoading && !isError && books.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 mt-8 mb-8">
                {/* Mobile Pagination */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(page - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={['fal', 'chevron-left']} />
                    </button>

                    {getPageNumbers().map((pageNum, idx) =>
                      pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-4 py-2 text-gray-700">
                          ...
                        </span>
                      ) : (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum as number)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={['fal', 'chevron-right']} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
