'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ItemTypeSelectionModal from '@/components/modals/ItemTypeSelectionModal';
import Pagination from '@/components/shared/Pagination';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/format';

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

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

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
    return <PageLoading message="Loading products..." fullPage={false} />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const products = productsData?.data || [];
  const pagination = productsData?.pagination || {};
  const activeAuctions = auctionsData || [];

  // Create a map of product IDs to their active auctions
  const auctionMap = new Map();
  activeAuctions.forEach((auction: any) => {
    if (auction.auctionableType === 'book') {
      // Convert to string to ensure consistent comparison
      auctionMap.set(String(auction.auctionableId), auction);
    }
  });

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;

    const count = selectedProducts.size;
    if (!confirm(`Are you sure you want to delete ${count} product${count > 1 ? 's' : ''}?`))
      return;

    try {
      const deletePromises = Array.from(selectedProducts).map((id) =>
        fetch(getApiUrl(`api/vendor/products/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }),
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
            <option value="archived">Deleted</option>
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
        <PageLoading message="Loading products..." fullPage={false} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={['fal', 'books']}
          title="No products found"
          description="Start adding products to your inventory"
          actionLabel="Add Your First Product"
          actionHref="/vendor/books/new"
        />
      ) : (
        <>
          <ResponsiveDataView
            breakpoint="md"
            mobile={
              <MobileCardList gap="md">
                {products.map((product: any) => {
                  const hasActiveAuction = auctionMap.has(String(product.id));
                  const statusColors: Record<string, string> = {
                    published: 'bg-green-100 text-green-800',
                    draft: 'bg-yellow-100 text-yellow-800',
                    sold: 'bg-red-100 text-red-800',
                    archived: 'bg-gray-200 text-gray-600',
                  };
                  return (
                    <MobileCard
                      key={product.id}
                      onClick={() => router.push(`/vendor/books/${product.id}/edit`)}
                      thumbnail={
                        <div className="w-12 h-16 flex-shrink-0 overflow-hidden rounded">
                          <CloudinaryImage
                            src={product.imageUrl}
                            alt={product.title}
                            width={96}
                            height={128}
                            className="w-full h-full"
                            fallbackIcon={['fal', 'book']}
                            fallbackText="No img"
                          />
                        </div>
                      }
                      title={product.title}
                      subtitle={product.author}
                      checkbox={
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                        />
                      }
                      badge={
                        <div className="flex items-center gap-1.5">
                          {hasActiveAuction && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded">
                              <FontAwesomeIcon icon={['fal', 'gavel']} className="text-[10px]" />
                              AUCTION
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[product.status] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {product.status === 'archived' ? 'Deleted' : product.status}
                          </span>
                        </div>
                      }
                      details={[
                        { label: 'Price', value: formatMoney(product.price, { fromCents: false }) },
                        {
                          label: 'Qty',
                          value: product.trackQuantity !== false ? product.quantity || 0 : '∞',
                        },
                        {
                          label: 'Views',
                          value: (
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={['fal', 'eye']} className="text-xs" />
                              {product.views || 0}
                            </span>
                          ),
                        },
                      ]}
                      actions={[
                        {
                          label: 'Edit',
                          icon: <FontAwesomeIcon icon={['fal', 'edit']} className="text-xs" />,
                          href: `/vendor/books/${product.id}/edit`,
                          variant: 'primary' as const,
                        },
                        ...(product.status === 'sold' && product.quantity > 0
                          ? [
                              {
                                label: 'Relist',
                                icon: (
                                  <FontAwesomeIcon icon={['fal', 'redo']} className="text-xs" />
                                ),
                                variant: 'secondary' as const,
                                onClick: async () => {
                                  if (confirm('Relist this product as available for purchase?')) {
                                    try {
                                      const res = await fetch(
                                        getApiUrl(`api/vendor/products/${product.id}/relist`),
                                        {
                                          method: 'POST',
                                          headers: {
                                            Authorization: `Bearer ${session?.accessToken}`,
                                          },
                                        },
                                      );
                                      if (res.ok) refetch();
                                      else {
                                        const error = await res.json();
                                        alert(error.message || 'Failed to relist product');
                                      }
                                    } catch (error) {
                                      console.error('Relist failed:', error);
                                      alert('Failed to relist product');
                                    }
                                  }
                                },
                              },
                            ]
                          : []),
                      ]}
                    />
                  );
                })}
              </MobileCardList>
            }
            desktop={
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                            aria-label="Select all products"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product: any) => {
                        const hasActiveAuction = auctionMap.has(String(product.id));
                        return (
                          <tr
                            key={product.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/vendor/books/${product.id}/edit`)}
                          >
                            <td
                              className="px-6 py-4 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
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
                                        <FontAwesomeIcon
                                          icon={['fal', 'gavel']}
                                          className="text-xs"
                                        />
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
                                {formatMoney(product.price, { fromCents: false })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.trackQuantity !== false ? product.quantity || 0 : '∞'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  product.status === 'published'
                                    ? 'bg-green-100 text-green-800'
                                    : product.status === 'draft'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : product.status === 'sold'
                                        ? 'bg-red-100 text-red-800'
                                        : product.status === 'archived'
                                          ? 'bg-gray-200 text-gray-600'
                                          : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {product.status === 'archived' ? 'Deleted' : product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-500">
                                <FontAwesomeIcon icon={['fal', 'eye']} className="text-base mr-1" />
                                {product.views || 0}
                              </div>
                            </td>
                            <td
                              className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  href={`/vendor/books/${product.id}/edit`}
                                  className="text-primary hover:text-secondary inline-flex items-center justify-center"
                                  title="Edit"
                                >
                                  <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                                </Link>
                                {product.status === 'sold' && product.quantity > 0 && (
                                  <button
                                    onClick={async () => {
                                      if (
                                        confirm('Relist this product as available for purchase?')
                                      ) {
                                        try {
                                          const res = await fetch(
                                            getApiUrl(`api/vendor/products/${product.id}/relist`),
                                            {
                                              method: 'POST',
                                              headers: {
                                                Authorization: `Bearer ${session?.accessToken}`,
                                              },
                                            },
                                          );
                                          if (res.ok) refetch();
                                          else {
                                            const error = await res.json();
                                            alert(error.message || 'Failed to relist product');
                                          }
                                        } catch (error) {
                                          console.error('Relist failed:', error);
                                          alert('Failed to relist product');
                                        }
                                      }
                                    }}
                                    className="text-green-600 hover:text-green-800 inline-flex items-center justify-center"
                                    title="Relist product"
                                  >
                                    <FontAwesomeIcon icon={['fal', 'redo']} className="text-base" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            }
          />

          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total || 0}
            itemsPerPage={20}
            onPageChange={setPage}
            className="mt-6"
          />
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
