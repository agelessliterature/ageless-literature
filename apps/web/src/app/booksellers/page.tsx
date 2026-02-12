'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
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
      style={{ borderRadius: '1.5rem' }}
    >
      {/* Banner with overlay and shop name */}
      <div className="relative h-56 overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
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

        {/* Search and Sort Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search booksellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-white"
            >
              <option value="featured">Featured</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading booksellers...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto">
            <FontAwesomeIcon
              icon={['fal', 'exclamation-circle']}
              className="text-4xl text-red-500 mb-4"
            />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchAllVendors()}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : allVendors.length === 0 ? (
          <div className="text-center py-12 bg-white shadow-md max-w-2xl mx-auto">
            <p className="text-gray-600">
              No booksellers available at the moment. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* Grid Layout - Larger cards with max 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto">
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
  );
}
