'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';
import type { BookListItem } from '@/types';
import { withBasePath } from '@/lib/path-utils';

interface Vendor {
  id: number;
  shopName: string;
  shopUrl: string;
  businessDescription?: string;
  businessEmail?: string;
  logoUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  createdAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface VendorResponse {
  success: boolean;
  data: Vendor;
}

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

export default function VendorPage() {
  const params = useParams();
  const shopUrl = params?.shopUrl as string;
  const [activeTab, setActiveTab] = useState<'products' | 'biography'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('menu_order-ASC');
  const [page, setPage] = useState(1);

  // Fetch vendor profile
  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-public', shopUrl],
    queryFn: async () => {
      const res = await api.get<VendorResponse>(`/vendors/${shopUrl}`);
      return res.data.data;
    },
    enabled: !!shopUrl,
  });

  // Fetch vendor products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-products', vendorData?.id, page, searchQuery, sortBy],
    queryFn: async () => {
      const [field, order] = sortBy.split('-');
      const res = await api.get<BooksResponse>('/books', {
        params: {
          vendorId: vendorData?.id,
          page,
          limit: 12,
          search: searchQuery || undefined,
          sortBy: field,
          sortOrder: order,
        },
      });
      return res.data;
    },
    enabled: !!vendorData?.id,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-primary" />
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Vendor Not Found</h1>
          <Link href="/books" className="text-primary hover:underline">
            Browse All Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-r from-primary to-primary-dark">
        {vendorData.bannerUrl && (
          <Image
            src={vendorData.bannerUrl}
            alt={vendorData.shopName}
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Vendor Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            {vendorData.logoUrl ? (
              <div className="w-24 h-24 relative flex-shrink-0 border border-gray-200">
                <Image
                  src={vendorData.logoUrl}
                  alt={vendorData.shopName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-200 flex items-center justify-center border border-gray-300">
                <FontAwesomeIcon icon={['fal', 'store']} className="text-4xl text-gray-400" />
              </div>
            )}

            {/* Vendor Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{vendorData.shopName}</h1>
              {vendorData.user && (
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FontAwesomeIcon icon={['fal', 'user']} />
                  <span>
                    {vendorData.user.firstName} {vendorData.user.lastName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500">
                <FontAwesomeIcon icon={['fal', 'star']} />
                <span>No ratings found yet!</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href={withBasePath(`/chat?vendorId=${vendorData.id}`)}
                className="px-6 py-2 bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
              >
                Live Chat
              </Link>
              <button className="px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium flex items-center gap-2">
                Share
                <FontAwesomeIcon icon={['fal', 'share-alt']} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('biography')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'biography'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendor Biography
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'products' && (
          <>
            {/* Search and Sort */}
            <div className="bg-white p-4 border border-gray-200 mb-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-8 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
                >
                  Search
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="menu_order-ASC">Featured</option>
                  <option value="createdAt-DESC">Default sorting</option>
                  <option value="price-ASC">Price: Low to High</option>
                  <option value="price-DESC">Price: High to Low</option>
                  <option value="title-ASC">Title: A to Z</option>
                  <option value="title-DESC">Title: Z to A</option>
                  <option value="createdAt-ASC">Oldest First</option>
                </select>
              </form>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="flex items-center justify-center py-20">
                <FontAwesomeIcon
                  icon={['fal', 'spinner-third']}
                  spin
                  className="text-5xl text-primary"
                />
              </div>
            ) : productsData?.data && productsData.data.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {productsData.data.map((book) => (
                    <Link
                      key={book.id}
                      href={`/products/${book.slug}`}
                      className="group block h-full"
                    >
                      <div
                        className="bg-black border border-gray-700 hover:shadow-xl hover:border-[#d4af37] transition-all duration-300 overflow-hidden h-full flex flex-col"
                        style={{ borderRadius: '1.5rem' }}
                      >
                        {/* Image */}
                        <div className="relative aspect-[3/4] bg-gray-100">
                          {book.primaryImage ? (
                            <Image
                              src={book.primaryImage}
                              alt={book.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                              <FontAwesomeIcon icon={['fal', 'book']} className="text-6xl" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-grow flex flex-col">
                          <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2 group-hover:text-[#d4af37] transition-colors h-14">
                            {book.title}
                          </h3>

                          {/* Price */}
                          <div className="mt-auto">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-2xl font-bold text-white">
                                {Number(book.price).toFixed(0)} USD
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={(_e) => {
                                  // Let the parent Link handle navigation
                                }}
                                className="flex-1 bg-secondary hover:bg-secondary/90 text-black py-2 px-4 font-semibold transition-colors duration-300 text-center"
                                style={{ borderRadius: '1.5rem' }}
                              >
                                VIEW
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Wishlist functionality
                                }}
                                className="bg-secondary hover:bg-secondary/90 text-black py-2 px-3 font-semibold transition-colors duration-300"
                                style={{ borderRadius: '1.5rem' }}
                                aria-label="Add to wishlist"
                              >
                                <FontAwesomeIcon icon={['fal', 'heart']} className="text-base" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Add to cart functionality
                                }}
                                className="bg-secondary hover:bg-secondary/90 text-black py-2 px-3 font-semibold transition-colors duration-300"
                                style={{ borderRadius: '1.5rem' }}
                                aria-label="Add to cart"
                              >
                                <FontAwesomeIcon
                                  icon={['fal', 'shopping-cart']}
                                  className="text-base"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {productsData.pagination && productsData.pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={['fal', 'chevron-left']} />
                    </button>
                    <span className="px-4 py-2 bg-white border border-gray-300">
                      Page {page} of {productsData.pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(productsData.pagination.totalPages, p + 1))
                      }
                      disabled={page === productsData.pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={['fal', 'chevron-right']} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <FontAwesomeIcon
                  icon={['fal', 'box-open']}
                  className="text-6xl text-gray-300 mb-4"
                />
                <p className="text-xl text-gray-600">No products found</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'biography' && (
          <div className="bg-white p-8 border border-gray-200">
            {vendorData.businessDescription ? (
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {vendorData.businessDescription}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">No biography available yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
