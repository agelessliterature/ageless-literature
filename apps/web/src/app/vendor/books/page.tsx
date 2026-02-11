'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ItemTypeSelectionModal from '@/components/modals/ItemTypeSelectionModal';
import { getApiUrl } from '@/lib/api';

declare global {
  interface Window {
    hasLoggedProducts?: boolean;
  }
}

export default function VendorBooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const {
    data: productsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['vendor-products', page, search, statusFilter, conditionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(conditionFilter !== 'all' && { condition: conditionFilter }),
      });

      const res = await fetch(getApiUrl(`api/vendor/products?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const result = await res.json();
      return result; // Return full result with data and pagination
    },
    enabled: !!session,
  });

  // Fetch active auctions for products
  const { data: auctionsData } = useQuery({
    queryKey: ['vendor-auctions-active'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/auctions?status=active'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) return [];
      const result = await res.json();
      return result.data || [];
    },
    enabled: !!session,
  });

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const products = productsData?.data || [];
  const pagination = productsData?.pagination || {};
  const activeAuctions = auctionsData || [];

  // Debug logging (client-side only)
  if (typeof window !== 'undefined' && products.length > 0 && !(window as any).hasLoggedProducts) {
    console.log('[DEBUG] First product:', products[0]);
    console.log('[DEBUG] First product imageUrl:', products[0].imageUrl);
    console.log('[DEBUG] First product media:', products[0].media);
    (window as any).hasLoggedProducts = true;
  }

  // Create a map of product IDs to their active auctions
  const auctionMap = new Map();
  activeAuctions.forEach((auction: any) => {
    if (auction.auctionableType === 'book') {
      // Convert to string to ensure consistent comparison
      auctionMap.set(String(auction.auctionableId), auction);
    }
  });

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(getApiUrl(`api/vendor/products/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });

      if (res.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    
    const count = selectedProducts.size;
    if (!confirm(`Are you sure you want to delete ${count} product${count > 1 ? 's' : ''}?`)) return;

    try {
      const deletePromises = Array.from(selectedProducts).map(id =>
        fetch(getApiUrl(`api/vendor/products/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        })
      );

      await Promise.all(deletePromises);
      setSelectedProducts(new Set());
      setSelectAll(false);
      refetch();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set<number>(products.map((p: any) => p.id));
      setSelectedProducts(allIds);
      setSelectAll(true);
    }
  };

  const handleSelectProduct = (id: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === products.length && products.length > 0);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Products</h1>
            <p className="text-gray-600 mt-2">Manage your book listings and inventory</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition w-full sm:w-auto"
              >
                <FontAwesomeIcon icon={['fal', 'trash']} className="text-base" />
                Delete Selected ({selectedProducts.size})
              </button>
            )}
            <button
              onClick={() => setShowItemTypeModal(true)}
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 hover:bg-opacity-90 transition w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={['fal', 'search']}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by title, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="sold">Sold</option>
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Conditions</option>
            <option value="new">New</option>
            <option value="like-new">Like New</option>
            <option value="very-good">Very Good</option>
            <option value="good">Good</option>
            <option value="acceptable">Acceptable</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No products found</p>
          <Link
            href="/vendor/books/new"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 hover:bg-opacity-90 transition"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
            Add Your First Product
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                        aria-label="Select all products"
                      />
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Edit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product: any) => {
                    // Convert product.id to string for consistent comparison
                    const hasActiveAuction = auctionMap.has(String(product.id));
                    return (
                      <tr 
                        key={product.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/vendor/books/${product.id}/edit`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-12 overflow-hidden">
                              <CloudinaryImage
                                src={product.imageUrl}
                                alt={product.title}
                                width={96}
                                height={128}
                                className="w-full h-full"
                                fallbackIcon={['fal', 'book']}
                                fallbackText="No image"
                              />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {product.title}
                                </div>
                                {hasActiveAuction && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                    <FontAwesomeIcon icon={['fal', 'gavel']} className="text-xs" />
                                    AUCTION
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{product.author}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${parseFloat(product.price || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              product.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : product.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <FontAwesomeIcon icon={['fal', 'eye']} className="text-base mr-1" />
                            {product.views || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/vendor/books/${product.id}/edit`}
                            className="text-primary hover:text-secondary inline-flex items-center justify-center"
                          >
                            <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(page * 20, pagination.total)}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={['fal', 'chevron-left']} />
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter((pageNum) => {
                          // Show first, last, current, and adjacent pages
                          return (
                            pageNum === 1 ||
                            pageNum === pagination.totalPages ||
                            Math.abs(pageNum - page) <= 1
                          );
                        })
                        .map((pageNum, index, arr) => {
                          // Add ellipsis
                          const showEllipsisBefore = index > 0 && pageNum - arr[index - 1] > 1;

                          return (
                            <div key={pageNum} className="inline-flex">
                              {showEllipsisBefore && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => setPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageNum === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            </div>
                          );
                        })}

                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={['fal', 'chevron-right']} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Item Type Selection Modal */}
      <ItemTypeSelectionModal
        isOpen={showItemTypeModal}
        onClose={() => setShowItemTypeModal(false)}
      />
    </div>
  );
}
