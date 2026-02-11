'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';
import type { BookListItem } from '@/types';
import { toast } from 'react-hot-toast';
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
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('menu_order-ASC');
  const [page, setPage] = useState(1);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
    queryKey: ['vendor-products', vendorData?.id, page, searchQuery, category, author, minPrice, maxPrice, sortBy],
    queryFn: async () => {
      const [field, order] = sortBy.split('-');
      const res = await api.get<BooksResponse>('/books', {
        params: {
          vendorId: vendorData?.id,
          page,
          limit: 12,
          search: searchQuery || undefined,
          category: category || undefined,
          author: author || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
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

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
      setShowShareMenu(false);
    });
  };

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(vendorData?.shopName || 'Check out this vendor');

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'pinterest':
        shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${title}%20${url}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${title}&body=${url}`;
        window.location.href = shareUrl;
        setShowShareMenu(false);
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setShowShareMenu(false);
    }
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
      <div className="relative h-64 sm:h-80 md:h-96 bg-gradient-to-r from-primary to-primary-dark">
        {vendorData.bannerUrl && (
          <Image
            src={vendorData.bannerUrl}
            alt={vendorData.shopName}
            fill
            className="object-contain"
          />
        )}
      </div>

      {/* Vendor Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            {/* Logo */}
            {vendorData.logoUrl ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex-shrink-0 border border-gray-200 mx-auto sm:mx-0">
                <Image
                  src={vendorData.logoUrl}
                  alt={vendorData.shopName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 flex items-center justify-center border border-gray-300 mx-auto sm:mx-0">
                <FontAwesomeIcon
                  icon={['fal', 'store']}
                  className="text-3xl sm:text-4xl text-gray-400"
                />
              </div>
            )}

            {/* Vendor Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {vendorData.shopName}
              </h1>
              {vendorData.user && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mb-2">
                  <FontAwesomeIcon icon={['fal', 'user']} />
                  <span>
                    {vendorData.user.firstName} {vendorData.user.lastName}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500">
                <FontAwesomeIcon icon={['fal', 'star']} />
                <span>No ratings found yet!</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 justify-center sm:justify-end">
              <Link
                href={withBasePath(`/chat?vendorId=${vendorData.id}`)}
                className="px-4 sm:px-6 py-2 bg-primary text-white hover:bg-primary-dark transition-colors font-medium text-sm sm:text-base"
              >
                Live Chat
              </Link>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium flex items-center gap-2 text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Share</span>
                  <FontAwesomeIcon icon={['fal', 'share-alt']} />
                </button>

                {/* Share Dropdown Menu */}
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 shadow-lg z-50">
                    <div className="p-2">
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon icon={['fal', 'link']} className="text-xl text-gray-600" />
                        <span className="font-medium text-gray-700">Copy Link</span>
                      </button>

                      <div className="border-t border-gray-200 my-2"></div>

                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon
                          icon={['fab', 'facebook-f']}
                          className="text-xl text-blue-600"
                        />
                        <span className="font-medium text-gray-700">Facebook</span>
                      </button>

                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon
                          icon={['fab', 'twitter']}
                          className="text-xl text-sky-500"
                        />
                        <span className="font-medium text-gray-700">Twitter</span>
                      </button>

                      <button
                        onClick={() => handleShare('linkedin')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon
                          icon={['fab', 'linkedin-in']}
                          className="text-xl text-blue-700"
                        />
                        <span className="font-medium text-gray-700">LinkedIn</span>
                      </button>

                      <button
                        onClick={() => handleShare('pinterest')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon
                          icon={['fab', 'pinterest-p']}
                          className="text-xl text-red-600"
                        />
                        <span className="font-medium text-gray-700">Pinterest</span>
                      </button>

                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon
                          icon={['fab', 'whatsapp']}
                          className="text-xl text-green-600"
                        />
                        <span className="font-medium text-gray-700">WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleShare('email')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <FontAwesomeIcon
                          icon={['fal', 'envelope']}
                          className="text-xl text-gray-600"
                        />
                        <span className="font-medium text-gray-700">Email</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to close share menu when clicking outside */}
      {showShareMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)}></div>
      )}

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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'products' && (
          <>
            {/* Search and Filters */}
            <div className="bg-white border border-gray-200 mb-4 sm:mb-6">
              <div className="p-3 sm:p-4">
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={['fal', 'search']}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base"
                      />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2 justify-center md:justify-start"
                  >
                    <span className="font-medium">Filters</span>
                    {(category || author || minPrice || maxPrice) && (
                      <span className="ml-1 px-2 py-0.5 bg-primary text-white text-xs">Active</span>
                    )}
                  </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="Enter category..."
                          className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      {/* Author Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input
                          type="text"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          placeholder="Search by author..."
                          className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      {/* Price Range */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                          <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder="$0"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                          <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder="$10,000"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="menu_order-ASC">Featured</option>
                          <option value="createdAt-DESC">Newest First</option>
                          <option value="createdAt-ASC">Oldest First</option>
                          <option value="price-ASC">Price: Low to High</option>
                          <option value="price-DESC">Price: High to Low</option>
                          <option value="title-ASC">Title: A to Z</option>
                          <option value="title-DESC">Title: Z to A</option>
                        </select>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {(category || author || minPrice || maxPrice) && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => {
                            setCategory('');
                            setAuthor('');
                            setMinPrice('');
                            setMaxPrice('');
                            setSearchQuery('');
                          }}
                          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={['fal', 'times-circle']} />
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {productsData.data.map((book) => (
                    <Link key={book.id} href={`/products/${book.slug}`} className="group block">
                      <div className="bg-white border border-gray-200 hover:shadow-xl hover:border-[#d4af37] transition-all duration-300 overflow-hidden h-full flex flex-col" style={{ borderRadius: 0 }}>
                        {/* Image */}
                        <div className="relative aspect-[3/4] bg-gray-100">
                          {book.primaryImage ? (
                            <Image
                              src={book.primaryImage}
                              alt={book.title}
                              fill
                              quality={75}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FontAwesomeIcon
                                icon={['fal', 'book']}
                                className="text-6xl text-gray-300"
                              />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-grow flex flex-col">
                          <h3 className="font-semibold text-lg text-primary mb-1 line-clamp-2 group-hover:text-[#d4af37] transition-colors h-14">
                            {book.title}
                          </h3>

                          {/* Price */}
                          <div className="mt-auto">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-2xl font-bold text-primary">
                                {Number(book.price).toFixed(0)} USD
                              </span>
                            </div>

                            {/* View Details Button */}
                            <button className="w-full bg-secondary hover:bg-secondary/90 text-primary py-2 px-4 transition-colors font-semibold text-sm flex items-center justify-center gap-2">
                              VIEW
                            </button>
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
