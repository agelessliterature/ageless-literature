'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import api from '@/lib/api';
import { debounce } from 'lodash';
import Image from 'next/image';

interface SearchResult {
  id: number;
  type: 'book' | 'product';
  title: string;
  author?: string;
  artist?: string;
  price: string;
  salePrice?: string;
  condition: string;
  primaryImage?: string;
  images?: string[];
  category?: string;
  shortDescription?: string;
  sid?: string;
  slug?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface FilterState {
  category: string;
  author: string;
  minPrice: string;
  maxPrice: string;
  type: string;
  sortBy: string;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    author: '',
    minPrice: '',
    maxPrice: '',
    type: '',
    sortBy: 'relevance',
  });
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Category[] }>('/categories');
        if (response.data.success) {
          setCategories(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string, currentFilters: FilterState) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Build query parameters
        const params = new URLSearchParams();
        params.append('q', searchQuery);
        params.append('limit', '30');
        params.append('status', 'published');

        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.author) params.append('author', currentFilters.author);
        if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
        if (currentFilters.type) params.append('type', currentFilters.type);
        if (currentFilters.sortBy) params.append('sortBy', currentFilters.sortBy);

        const response = await fetch(getApiUrl(`api/search?${params.toString()}`));
        const data = await response.json();

        if (data.success) {
          // Combine books and products from search API response
          const books = (data.data.books || []).map((b: any) => ({ ...b, type: 'book' as const }));
          const products = (data.data.products || []).map((p: any) => ({
            ...p,
            type: 'product' as const,
          }));
          setResults([...books, ...products]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [],
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(0);

    if (value.trim()) {
      setLoading(true);
      performSearch(value, filters);
    } else {
      setResults([]);
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setSelectedIndex(0);

    if (query.trim()) {
      setLoading(true);
      performSearch(query, updatedFilters);
    }
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters = {
      category: '',
      author: '',
      minPrice: '',
      maxPrice: '',
      type: '',
      sortBy: 'relevance',
    };
    setFilters(clearedFilters);

    if (query.trim()) {
      setLoading(true);
      performSearch(query, clearedFilters);
    }
  };

  const hasActiveFilters =
    filters.category || filters.author || filters.minPrice || filters.maxPrice || filters.type;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    }
  };

  // Navigate to result
  const handleResultClick = (result: SearchResult) => {
    const path =
      result.type === 'book'
        ? `/shop/${result.sid || result.id}`
        : `/collectibles/${result.slug || result.id}`;

    router.push(path);
    onClose();
    setQuery('');
    setResults([]);
  };

  // View all results
  const viewAllResults = () => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters.category) params.append('category', filters.category);
    if (filters.author) params.append('author', filters.author);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

    router.push(`/shop?${params.toString()}`);
    onClose();
    setQuery('');
    setResults([]);
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      <div
        className="bg-white shadow-xl w-full max-w-3xl overflow-hidden"
        style={{ borderRadius: '1.5rem' }}
      >
        {/* Search Input */}
        <div className="border-b border-gray-200">
          <div className="flex items-center px-6 py-5">
            <FontAwesomeIcon
              icon={['fal', 'search']}
              className="text-2xl text-primary mr-4"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search for rare books, authors, topics..."
              className="flex-1 text-lg outline-none placeholder-gray-400 text-primary"
              aria-label="Search our collection"
              id="search-modal-title"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-primary transition ml-4"
                aria-label="Clear search"
              >
                <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-primary transition ml-4"
              aria-label="Close search"
            >
              <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Filters Toggle */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-secondary transition"
            >
              <FontAwesomeIcon
                icon={['fal', showFilters ? 'chevron-up' : 'chevron-down']}
                className="text-sm"
              />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-secondary text-white text-xs px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:text-red-800 transition flex items-center gap-1"
              >
                <FontAwesomeIcon icon={['fal', 'times-circle']} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="border-b border-gray-200 bg-white px-6 py-4 animate-in slide-in-from-top duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange({ type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="">All Types</option>
                  <option value="book">Books</option>
                  <option value="product">Collectibles</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange({ category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Author Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Author / Artist
                </label>
                <input
                  type="text"
                  value={filters.author}
                  onChange={(e) => handleFilterChange({ author: e.target.value })}
                  placeholder="Filter by name..."
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="title">Title: A to Z</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Price Range
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange({ minPrice: e.target.value })}
                    placeholder="Min"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                  <span className="text-gray-400">—</span>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange({ maxPrice: e.target.value })}
                    placeholder="Max"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="max-h-[500px] overflow-y-auto" ref={resultsRef}>
          {/* Results Count */}
          {!loading && query && results.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                Found <span className="font-semibold text-primary">{results.length}</span>{' '}
                {results.length === 1 ? 'result' : 'results'} for &quot;
                <span className="font-medium">{query}</span>&quot;
                {hasActiveFilters && <span className="text-gray-500"> (filtered)</span>}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <FontAwesomeIcon
                icon={['fal', 'spinner-third']}
                className="text-4xl text-secondary animate-spin"
                aria-hidden="true"
              />
              <span className="ml-3 text-primary font-medium">Searching our collection...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <FontAwesomeIcon
                icon={['fal', 'book-open']}
                className="text-6xl text-gray-300 mb-4"
                aria-hidden="true"
              />
              <h3 className="text-xl font-semibold text-primary mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                We couldn&apos;t find any items matching &quot;{query}&quot;
                {hasActiveFilters && (
                  <span className="block mt-1 text-sm">
                    Try removing some filters to see more results
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-secondary hover:text-secondary-dark font-medium transition border-b border-secondary"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => {
                    router.push('/shop');
                    onClose();
                  }}
                  className="text-secondary hover:text-secondary-dark font-medium transition border-b border-secondary"
                >
                  Browse our full collection →
                </button>
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-start gap-5 px-6 py-4 hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-b-0 ${
                      index === selectedIndex ? 'bg-gray-50' : ''
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Image */}
                    <div className="flex-shrink-0 w-16 h-20 bg-gray-100 border border-gray-200 overflow-hidden">
                      {result.primaryImage || result.images?.[0] ? (
                        <Image
                          src={result.primaryImage || result.images![0]}
                          alt={result.title}
                          width={64}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FontAwesomeIcon
                            icon={['fal', result.type === 'book' ? 'book' : 'box']}
                            className="text-2xl text-gray-300"
                          />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-primary truncate mb-1">
                            {result.title}
                          </h4>
                          {(result.author || result.artist) && (
                            <p className="text-sm text-gray-600 truncate">
                              {result.author || result.artist}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {result.salePrice ? (
                            <>
                              <p className="text-sm text-gray-400 line-through">${result.price}</p>
                              <p className="font-bold text-secondary text-lg">
                                ${result.salePrice}
                              </p>
                            </>
                          ) : (
                            <p className="font-semibold text-primary">${result.price}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 uppercase tracking-wide">
                        <span className="font-medium">
                          {result.type === 'book' ? 'Book' : 'Collectible'}
                        </span>
                        {result.condition && <span>• {result.condition}</span>}
                        {result.category && <span>• {result.category}</span>}
                      </div>
                    </div>

                    <FontAwesomeIcon
                      icon={['fal', 'chevron-right']}
                      className="text-gray-300 mt-1 flex-shrink-0"
                    />
                  </button>
                ))}
              </div>

              {/* View All Results */}
              <div className="border-t-2 border-gray-200 bg-gray-50">
                <button
                  onClick={viewAllResults}
                  className="w-full text-center text-secondary hover:text-secondary-dark font-semibold py-4 transition flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                >
                  <span>
                    View all {results.length} results for &quot;{query}&quot;
                  </span>
                  <FontAwesomeIcon icon={['fal', 'arrow-right']} />
                </button>
              </div>
            </>
          )}

          {!query && !loading && (
            <div className="py-16 px-6 text-center">
              <FontAwesomeIcon
                icon={['fal', 'books']}
                className="text-6xl text-gray-300 mb-4"
                aria-hidden="true"
              />
              <h3 className="text-lg font-semibold text-primary mb-2">Search Our Collection</h3>
              <p className="text-gray-600">
                Discover rare books, first editions, and unique collectibles
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
