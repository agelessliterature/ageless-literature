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
import CSVImportWizard from '@/components/import/CSVImportWizard';

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
  const [sortOption, setSortOption] = useState('createdAt_DESC');
  const [auctionFilter, setAuctionFilter] = useState<'all' | 'auction' | 'non-auction'>('all');
  const [page, setPage] = useState(1);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
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
    queryKey: ['vendor-products', page, search, statusFilter, conditionFilter, sortOption],
    queryFn: async () => {
      const [sortBy, sortOrder] = sortOption.split('_');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
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

  // Fetch auctions for products (active + upcoming so draft auction books show correct price)
  const { data: auctionsData } = useQuery({
    queryKey: ['vendor-auctions-for-books'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/auctions?limit=500'), {
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

  // Create a map of book IDs to their active/upcoming auctions
  const auctionMap = new Map();
  activeAuctions.forEach((auction: any) => {
    if (auction.auctionableType === 'book' && ['active', 'upcoming'].includes(auction.status)) {
      auctionMap.set(String(auction.auctionableId), auction);
    }
  });

  // Apply auction filter client-side
  const filteredProducts = products.filter((p: any) => {
    if (auctionFilter === 'auction') return auctionMap.has(String(p.id));
    if (auctionFilter === 'non-auction') return !auctionMap.has(String(p.id));
    return true;
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

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedProducts.size === 0) return;
    const count = selectedProducts.size;
    const label = newStatus === 'published' ? 'publish' : 'set to draft';
    if (
      !confirm(
        `${label.charAt(0).toUpperCase() + label.slice(1)} ${count} product${count > 1 ? 's' : ''}?`,
      )
    )
      return;
    try {
      await Promise.all(
        Array.from(selectedProducts).map((id) =>
          fetch(getApiUrl(`api/vendor/products/${id}/status`), {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
          }),
        ),
      );
      setSelectedProducts(new Set());
      setSelectAll(false);
      refetch();
    } catch {
      alert(`Failed to ${label} products`);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set<number>(filteredProducts.map((p: any) => p.id));
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
    setSelectAll(newSelected.size === filteredProducts.length && filteredProducts.length > 0);
  };

  const handleStatusChange = async (productId: number, newStatus: string) => {
    if (
      newStatus === 'archived' &&
      !confirm('Archive this product? It will be hidden from your shop.')
    )
      return;
    try {
      const res = await fetch(getApiUrl(`api/vendor/products/${productId}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to update status');
      } else {
        refetch();
      }
    } catch {
      alert('Failed to update status');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '999' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (conditionFilter !== 'all') params.set('condition', conditionFilter);
      const res = await fetch(getApiUrl(`api/vendor/products?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const result = await res.json();
      const allProducts: any[] = result.data || [];

      const q = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      const headers = [
        'Title',
        'Author',
        'ISBN',
        'Price',
        'Sale Price',
        'Quantity',
        'Condition',
        'Status',
        'Views',
      ];
      const rows = allProducts.map((p: any) => [
        q(p.title),
        q(p.author),
        q(p.isbn || ''),
        p.price ?? 0,
        p.salePrice ?? '',
        p.trackQuantity !== false ? (p.quantity ?? 0) : '',
        p.condition || '',
        p.status || '',
        p.views ?? 0,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV. Please try again.');
    }
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
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {selectedProducts.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto p-2 bg-primary/5 border border-primary/20 rounded">
                <span className="text-sm font-medium text-primary pl-1">
                  {selectedProducts.size} selected
                </span>
                <button
                  onClick={() => handleBulkStatusChange('published')}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 text-sm hover:bg-green-700 transition rounded"
                >
                  <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-sm" />
                  Publish
                </button>
                <button
                  onClick={() => handleBulkStatusChange('draft')}
                  className="flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-1.5 text-sm hover:bg-yellow-600 transition rounded"
                >
                  <FontAwesomeIcon icon={['fal', 'file-alt']} className="text-sm" />
                  Set Draft
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700 transition rounded"
                >
                  <FontAwesomeIcon icon={['fal', 'trash']} className="text-sm" />
                  Delete
                </button>
              </div>
            )}
            <button
              onClick={() => setShowImportWizard(true)}
              className="flex items-center justify-center gap-2 bg-white text-primary border border-primary px-4 py-2 hover:bg-primary/5 transition w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={['fal', 'file-csv']} className="text-base" />
              Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-white text-primary border border-primary px-4 py-2 hover:bg-primary/5 transition w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={['fal', 'file-export']} className="text-base" />
              Export CSV
            </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
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

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="sold">Sold</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="createdAt_DESC">Newest First</option>
            <option value="createdAt_ASC">Oldest First</option>
            <option value="price_DESC">Price: High → Low</option>
            <option value="price_ASC">Price: Low → High</option>
            <option value="title_ASC">Title: A → Z</option>
            <option value="title_DESC">Title: Z → A</option>
          </select>

          {/* Condition */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Conditions</option>
            <option value="Fine">Fine</option>
            <option value="Near Fine">Near Fine</option>
            <option value="Very Good">Very Good</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>

        {/* Auction Toggle */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm text-gray-500 mr-1">Show:</span>
          {(['all', 'auction', 'non-auction'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setAuctionFilter(opt)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                auctionFilter === opt
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt === 'all'
                ? 'All Listings'
                : opt === 'auction'
                  ? '🔨 In Auction'
                  : 'Not in Auction'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <PageLoading message="Loading products..." fullPage={false} />
      ) : filteredProducts.length === 0 ? (
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
                {filteredProducts.map((product: any) => {
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
                        {
                          label: hasActiveAuction ? 'Starting Bid' : 'Price',
                          value: hasActiveAuction
                            ? formatMoney(
                                parseFloat(
                                  auctionMap.get(String(product.id))?.startingBid ||
                                    auctionMap.get(String(product.id))?.startingPrice ||
                                    0,
                                ),
                                { fromCents: false },
                              )
                            : formatMoney(product.price, { fromCents: false }),
                        },
                        {
                          label: 'Qty',
                          value: product.trackQuantity !== false ? product.quantity || 0 : '∞',
                        },
                        {
                          label: 'Status',
                          value: (
                            <select
                              value={product.status === 'sold' ? 'sold' : product.status}
                              onChange={(e) => handleStatusChange(product.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs font-semibold px-2 py-1 rounded border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                                product.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : product.status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : product.status === 'sold'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              <option value="published">✓ Published</option>
                              <option value="draft">◷ Draft</option>
                              {product.status === 'sold' && <option value="sold">Sold</option>}
                              <option value="archived">✕ Archive / Delete</option>
                            </select>
                          ),
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
                      {filteredProducts.map((product: any) => {
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
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-secondary text-white">
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
                                {hasActiveAuction
                                  ? formatMoney(
                                      parseFloat(
                                        auctionMap.get(String(product.id))?.startingBid ||
                                          auctionMap.get(String(product.id))?.startingPrice ||
                                          0,
                                      ),
                                      { fromCents: false },
                                    )
                                  : formatMoney(product.price, { fromCents: false })}
                              </div>
                              {hasActiveAuction && (
                                <div className="text-xs text-purple-600">starting bid</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.trackQuantity !== false ? product.quantity || 0 : '∞'}
                              </div>
                            </td>
                            <td
                              className="px-6 py-4 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={product.status}
                                onChange={(e) => handleStatusChange(product.id, e.target.value)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full border border-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                                  product.status === 'published'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : product.status === 'draft'
                                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                      : product.status === 'sold'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                              >
                                <option value="published">✓ Published</option>
                                <option value="draft">◷ Draft</option>
                                {product.status === 'sold' && <option value="sold">Sold</option>}
                                <option value="archived">✕ Archive / Delete</option>
                              </select>
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

      {/* CSV Import Wizard */}
      <CSVImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onComplete={() => refetch()}
        role="vendor"
      />
    </div>
  );
}
