'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import InlineError from '@/components/ui/InlineError';
import { withBasePath } from '@/lib/path-utils';
import { getApiUrl } from '@/lib/api';

interface Vendor {
  id: string;
  shopName: string;
  shopUrl: string;
  businessDescription: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  socialFacebook?: string | null;
  socialTwitter?: string | null;
  socialInstagram?: string | null;
  socialLinkedin?: string | null;
  isFeatured?: boolean;
  featuredPriority?: number;
  createdAt: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function BookSellersPage() {
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    perPage: 12,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchAllVendors = async (page: number = 1) => {
    try {
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.perPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        sortBy: sortBy,
      });
      const response = await fetch(getApiUrl(`api/vendors?${params}`));
      const data = await response.json();
      if (data.success) {
        setAllVendors(data.data.vendors || []);
        setPagination(data.data.pagination);
      } else {
        setError(data.message || 'Failed to load booksellers');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAllVendors();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, sortBy]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
    fetchAllVendors(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const VendorCard = ({ vendor }: { vendor: Vendor }) => (
    <Link
      href={withBasePath(`/shop/${vendor.shopUrl}`)}
      className="relative overflow-hidden transition-all duration-300 group border border-gray-200 bg-white hover:shadow-xl hover:border-[#d4af37] h-full flex flex-col"
    >
      {/* Banner with overlay and shop name */}
      <div className="relative w-full aspect-video overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: vendor.bannerUrl
              ? `url(${vendor.bannerUrl})`
              : 'url(https://res.cloudinary.com/dvohtcqvi/image/upload/v1/vendor-defaults/default-banner.png)',
            backgroundPosition: 'center center',
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40" />

        {/* Full width white bar at bottom with name on left and logo on right */}
        <div className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-black text-base">{vendor.shopName}</h3>
          <div className="w-16 h-16 flex-shrink-0 rounded-full border-2 border-gray-300 bg-white shadow-lg overflow-hidden">
            <CloudinaryImage
              src={vendor.logoUrl}
              alt={vendor.shopName}
              width={64}
              height={64}
              className="w-full h-full rounded-full object-cover"
              fallbackIcon={['fal', 'store']}
              fallbackText={vendor.shopName.charAt(0).toUpperCase()}
            />
          </div>
        </div>

        {/* Featured badge */}
        {vendor.isFeatured && (
          <div className="absolute top-4 right-4 bg-secondary text-primary px-3 py-1 text-xs font-bold">
            Featured
          </div>
        )}
      </div>

      {/* Business Description */}
      {vendor.businessDescription && (
        <div className="px-4 py-4 flex-grow">
          <p className="text-gray-600 text-sm line-clamp-3">{vendor.businessDescription}</p>
        </div>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Our Booksellers</h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-2">
            Discover our trusted network of professional booksellers
          </p>
          <p className="text-gray-500">
            Browse through carefully curated collections from verified sellers around the world
          </p>
        </div>

        {/* Apply to be a Bookseller CTA */}
        <div className="mx-auto mb-8">
          <div
            className="bg-gradient-to-br from-primary/5 to-secondary/10 border-2 border-secondary/30 p-6 sm:p-8"
            style={{ borderRadius: '1.5rem' }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                  Questions about Becoming a Vendor?
                </h2>
                <p className="text-gray-700">
                  Get all your questions answered in our comprehensive FAQ section.
                </p>
              </div>
              <Link
                href="/faq"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 font-semibold transition-all duration-300 hover:scale-105 whitespace-nowrap shadow-md hover:shadow-lg"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="bg-white border-b border-gray-200 lg:sticky lg:top-0 z-30">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search booksellers..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <option value="featured">Featured</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <PageLoading message="Loading booksellers..." fullPage={false} />
          ) : error ? (
            <InlineError message={error} onRetry={() => fetchAllVendors()} />
          ) : allVendors.length === 0 ? (
            <EmptyState
              icon={['fal', 'store']}
              title="No booksellers found"
              description={
                searchQuery
                  ? 'No booksellers match your search. Try adjusting your filters.'
                  : 'No booksellers available at the moment. Check back soon!'
              }
            />
          ) : (
            <>
              {/* Grid Layout - Larger cards with max 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mx-auto">
                {allVendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className={`px-4 py-2 ${
                      pagination.hasPrevPage
                        ? 'bg-black text-white hover:bg-gray-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <FontAwesomeIcon icon={['fal', 'chevron-left']} className="mr-2" />
                    Previous
                  </button>

                  <span className="text-gray-700">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className={`px-4 py-2 ${
                      pagination.hasNextPage
                        ? 'bg-black text-white hover:bg-gray-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                    <FontAwesomeIcon icon={['fal', 'chevron-right']} className="ml-2" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
