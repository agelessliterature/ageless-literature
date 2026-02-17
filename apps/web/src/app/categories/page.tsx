'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  parentId?: number;
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-ASC');

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<CategoriesResponse>('/categories');
      return res.data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let filtered = categoriesData?.data || [];

    // Hide unwanted categories (price-based, uncategorized)
    filtered = filtered.filter((cat) => {
      const name = cat.name.toLowerCase();
      if (name.includes('$')) return false;
      if (name.includes('less than')) return false;
      if (name.includes('more than')) return false;
      if (name.includes('starting')) return false;
      if (name.includes('ageless')) return false;
      if (name === 'uncategorized' || name === 'un-categorized') return false;
      return true;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) || cat.description?.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    const [field, order] = sortBy.split('-');
    filtered = [...filtered].sort((a, b) => {
      const aVal = field === 'name' ? a.name : a.id;
      const bVal = field === 'name' ? b.name : b.id;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'ASC' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return order === 'ASC'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [categoriesData?.data, searchQuery, sortBy]);

  const categories = filteredCategories;

  if (isLoading) {
    return <PageLoading message="Loading categories..." fullPage={true} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-primary py-12 md:py-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
              Explore Our Collections
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto px-4">
              Discover rare and extraordinary books organized by subject, genre, and specialty
              collections
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        {/* Search and Sort - Enhanced to match shop page */}
        <div className="bg-white border border-gray-200 mb-8 shadow-sm">
          <div className="p-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <FontAwesomeIcon
                    icon={['fal', 'search']}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base"
                  />
                  <input
                    type="text"
                    placeholder="Search collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="w-full md:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="name-ASC">Name: A to Z</option>
                  <option value="name-DESC">Name: Z to A</option>
                  <option value="id-DESC">Newest First</option>
                  <option value="id-ASC">Oldest First</option>
                </select>
              </div>
            </form>
          </div>

          {/* Results Count */}
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{categories.length}</span> collection
              {categories.length !== 1 ? 's' : ''}
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </p>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {categories.map((category) => (
              <Link key={category.id} href={`/shop?category=${category.slug}`} className="group">
                <div className="bg-white shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                  {/* Category Image */}
                  <div className="relative h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FontAwesomeIcon
                          icon={['fal', 'books']}
                          className="text-8xl text-primary/30 group-hover:text-primary/50 transition-colors duration-300"
                        />
                      </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Category Info */}
                  <div className="p-6 flex-grow flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors duration-300">
                      {category.name}
                    </h2>

                    {category.description && (
                      <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
                        {category.description}
                      </p>
                    )}

                    {/* Browse Link */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <span className="text-primary font-semibold group-hover:text-primary-dark transition-colors">
                        Browse Collection
                      </span>
                      <FontAwesomeIcon
                        icon={['fal', 'arrow-right']}
                        className="text-primary group-hover:translate-x-2 transition-transform duration-300"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={['fal', 'books']}
            title={searchQuery ? 'No Categories Found' : 'No Categories Yet'}
            description={
              searchQuery
                ? 'Try adjusting your search terms or browse all collections.'
                : 'Categories are being curated. Check back soon to explore our collections.'
            }
          />
        )}
      </div>

      {/* Call to Action Section */}
      <div className="bg-white border-t border-gray-200 py-10 md:py-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto">
              Our concierge service can help you locate rare and hard-to-find books from our network
              of trusted booksellers.
            </p>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 sm:gap-3 bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 hover:bg-primary-dark transition-colors font-semibold text-base sm:text-lg"
            >
              <FontAwesomeIcon icon={['fal', 'concierge-bell']} />
              Request Concierge Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
