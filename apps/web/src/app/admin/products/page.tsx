'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import type { IconPrefix, IconName } from '@/types/fontawesome';
import { getApiUrl } from '@/lib/api-url';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ProductDetailsDrawer from '@/components/modals/ProductDetailsDrawer';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';

interface Product {
  id: string;
  title: string;
  type: 'book' | 'product';
  price: number;
  vendor: {
    id: string;
    shopName: string;
    shopUrl: string;
  } | null;
  status: string;
  condition?: string;
  category?: string;
  author?: string;
  isbn?: string;
  sku?: string;
  quantity?: number;
  images: any[];
  createdAt: string;
  updatedAt: string;
}

interface Vendor {
  id: string;
  shopName: string;
  shopUrl: string;
}

interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function AdminProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter/Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Pagination
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    perPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState<'published' | 'draft' | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Get API URL using utility function
  const API_URL = getApiUrl();

  // Load vendors for filter
  useEffect(() => {
    if (status === 'authenticated') {
      fetchVendors();
    }
  }, [status]);

  const fetchVendors = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${API_URL}/api/admin/vendors?page=1&limit=1000`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        // API returns { data: { vendors: [], pagination: {} } }
        setVendors(data.data.vendors || data.data || []);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  };

  // Fetch products
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProducts();
    }
  }, [
    status,
    pagination.currentPage,
    searchTerm,
    typeFilter,
    statusFilter,
    vendorFilter,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
  ]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.perPage.toString(),
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (vendorFilter) params.append('vendorId', vendorFilter);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const url = `${API_URL}/api/admin/products?${params}`;
      console.log('[ProductsPage] Fetching from:', url);

      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });

      console.log('[ProductsPage] Response status:', res.status);
      const data = await res.json();
      console.log('[ProductsPage] Response data:', data);

      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Failed to load products');
      }
    } catch (err: any) {
      console.error('[ProductsPage] Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const handleViewDetails = async (product: Product) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${API_URL}/api/admin/products/${product.id}?type=${product.type}`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setSelectedProduct(data.data);
        setShowDetailsDrawer(true);
      }
    } catch (err) {
      console.error('Failed to load product details:', err);
    }
  };

  const handleEdit = (product: Product) => {
    router.push(`/admin/products/${product.id}/edit?type=${product.type}`);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) {
      console.log('[confirmDelete] No selected product');
      return;
    }

    console.log(
      '[confirmDelete] Deleting product:',
      selectedProduct.id,
      'Type:',
      selectedProduct.type,
    );
    setLoading(true);
    setError('');

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const url = `${API_URL}/api/admin/products/${selectedProduct.id}?type=${selectedProduct.type}`;
      console.log('[confirmDelete] DELETE request to:', url);

      const res = await fetch(url, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      console.log('[confirmDelete] Response status:', res.status);
      const data = await res.json();
      console.log('[confirmDelete] Response data:', data);

      if (data.success) {
        setShowDeleteModal(false);
        setSelectedProduct(null);
        await fetchProducts();
      } else {
        setError(data.message || 'Failed to delete product');
        setShowDeleteModal(false);
      }
    } catch (err: any) {
      console.error('[confirmDelete] Error:', err);
      setError(err.message || 'Failed to delete product');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (product: Product, newStatus: 'published' | 'draft') => {
    setSelectedProduct(product);
    setStatusAction(newStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedProduct || !statusAction) return;

    setLoading(true);
    setError('');

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(
        `${API_URL}/api/admin/products/${selectedProduct.id}?type=${selectedProduct.type}`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            status: statusAction,
          }),
        },
      );

      const data = await res.json();

      if (data.success) {
        setShowStatusModal(false);
        setSelectedProduct(null);
        setStatusAction(null);
        await fetchProducts();
      } else {
        setError(data.message || 'Failed to update status');
        setShowStatusModal(false);
      }
    } catch (err: any) {
      console.error('[confirmStatusChange] Error:', err);
      setError(err.message || 'Failed to update status');
      setShowStatusModal(false);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setVendorFilter('');
    setMinPrice('');
    setMaxPrice('');
    setPagination({ ...pagination, currentPage: 1 });
  };

  const getSortIcon = (field: string): [IconPrefix, IconName] => {
    if (sortBy !== field) return ['fal', 'sort'];
    return sortOrder === 'ASC' ? ['fal', 'sort-up'] : ['fal', 'sort-down'];
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-primary" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/admin/login');
    return null;
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage all books and collectible products</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => router.push('/admin/products/new?type=book')}
            className="px-4 py-2 bg-primary text-white transition-colors flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} />
            Add Book
          </button>
          <button
            onClick={() => router.push('/admin/products/new?type=product')}
            className="px-4 py-2 bg-primary text-white transition-colors flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 mb-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FontAwesomeIcon
                icon={['fal', 'search']}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, author, SKU..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={['fal', 'filter']} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">All Types</option>
                <option value="book">Books</option>
                <option value="product">Collectibles</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.shopName}
                  </option>
                ))}
              </select>
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
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="$10,000"
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-4">{error}</div>
      )}

      {/* Products Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Title
                    <FontAwesomeIcon icon={getSortIcon('title')} className="text-xs" />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price
                    <FontAwesomeIcon icon={getSortIcon('price')} className="text-xs" />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Created
                    <FontAwesomeIcon icon={getSortIcon('createdAt')} className="text-xs" />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  // Find primary image or fall back to first image
                  const primaryImage =
                    product.images?.find((img: any) => img.isPrimary || img.is_primary) ||
                    product.images?.[0];
                  const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;

                  return (
                    <tr 
                      key={product.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(product)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-16 w-16 bg-gray-100 flex items-center justify-center overflow-hidden">
                          <CloudinaryImage
                            src={imageUrl}
                            alt={product.title}
                            width={128}
                            height={128}
                            className="w-128 h-128"
                            fallbackIcon={
                              product.type === 'book' ? ['fal', 'book'] : ['fal', 'box']
                            }
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                        {product.author && (
                          <div className="text-sm text-gray-500">by {product.author}</div>
                        )}
                        {product.sku && (
                          <div className="text-xs text-gray-400">SKU: {product.sku}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-2 text-sm text-gray-700">
                          <FontAwesomeIcon
                            icon={product.type === 'book' ? ['fal', 'book'] : ['fal', 'box']}
                            className="text-gray-400"
                          />
                          {product.type === 'book' ? 'Book' : 'Collectible'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.vendor ? (
                          <div className="text-sm text-gray-900">{product.vendor.shopName}</div>
                        ) : (
                          <span className="text-sm text-gray-400">No vendor</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold ${getStatusBadgeColor(
                            product.status,
                          )}`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(product.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {product.status === 'draft' && (
                            <button
                              onClick={() => handleToggleStatus(product, 'published')}
                              className="text-green-600 hover:text-green-900"
                              title="Publish"
                            >
                              <FontAwesomeIcon icon={['fal', 'check-circle']} />
                            </button>
                          )}
                          {product.status === 'published' && (
                            <button
                              onClick={() => handleToggleStatus(product, 'draft')}
                              className="text-orange-600 hover:text-orange-900"
                              title="Unpublish (Set to Draft)"
                            >
                              <FontAwesomeIcon icon={['fal', 'minus-circle']} />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={['fal', 'eye']} />
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Edit"
                          >
                            <FontAwesomeIcon icon={['fal', 'edit']} />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={['fal', 'trash']} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && products.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })
                  }
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })
                  }
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.currentPage - 1) * pagination.perPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.perPage, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex shadow-sm -space-x-px">
                    <button
                      onClick={() =>
                        setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })
                      }
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={['fal', 'chevron-left']} />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first, last, current, and adjacent pages
                        return (
                          page === 1 ||
                          page === pagination.totalPages ||
                          Math.abs(page - pagination.currentPage) <= 1
                        );
                      })
                      .map((page, index, arr) => {
                        // Add ellipsis
                        const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;

                        return (
                          <div key={page} className="inline-flex">
                            {showEllipsisBefore && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            )}
                            <button
                              onClick={() => setPagination({ ...pagination, currentPage: page })}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pagination.currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}

                    <button
                      onClick={() =>
                        setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })
                      }
                      disabled={!pagination.hasNextPage}
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
      </div>

      {/* Details Drawer */}
      <ProductDetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        product={selectedProduct}
        onEdit={handleEdit}
        onDelete={handleDelete}
        formatPrice={formatPrice}
        formatDate={formatDate}
        getStatusBadgeColor={getStatusBadgeColor}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProduct(null);
        }}
        onConfirm={confirmDelete}
        itemName={selectedProduct?.title || ''}
      />

      {/* Status Change Confirmation Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  statusAction === 'published' ? 'bg-green-100' : 'bg-orange-100'
                }`}
              >
                <FontAwesomeIcon
                  icon={['fal', statusAction === 'published' ? 'check-circle' : 'minus-circle']}
                  className={`text-xl ${
                    statusAction === 'published' ? 'text-green-600' : 'text-orange-600'
                  }`}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {statusAction === 'published' ? 'Publish Product' : 'Unpublish Product'}
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                {statusAction === 'published' ? (
                  <>
                    Are you sure you want to <strong className="text-green-600">publish</strong>{' '}
                    this product?
                  </>
                ) : (
                  <>
                    Are you sure you want to <strong className="text-orange-600">unpublish</strong>{' '}
                    this product?
                  </>
                )}
              </p>
              <p className="text-sm font-medium text-gray-900 mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                {selectedProduct?.title}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                {statusAction === 'published'
                  ? 'This will make the product visible to customers on the storefront.'
                  : 'This will hide the product from customers and set its status to draft.'}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedProduct(null);
                  setStatusAction(null);
                }}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={loading}
                className={`px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2 ${
                  statusAction === 'published'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={['fal', 'spinner-third']} spin />
                    {statusAction === 'published' ? 'Publishing...' : 'Unpublishing...'}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={['fal', statusAction === 'published' ? 'check' : 'minus']}
                    />
                    {statusAction === 'published' ? 'Publish' : 'Unpublish'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
