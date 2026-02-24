'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import type { IconPrefix, IconName } from '@/types/fontawesome';
import { getApiUrl } from '@/lib/api-url';
import api from '@/lib/api';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ProductDetailsDrawer from '@/components/modals/ProductDetailsDrawer';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import CSVImportWizard from '@/components/import/CSVImportWizard';

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
  menuOrder?: number;
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
  const [statusFilter, setStatusFilter] = useState('published');
  const [vendorFilter, setVendorFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('menuOrder');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

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
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [statusAction, setStatusAction] = useState<'published' | 'draft' | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [statusCounts, setStatusCounts] = useState<{
    all: number;
    published: number;
    draft: number;
    sold: number;
    archived: number;
  } | null>(null);

  // Sort mode state
  const [sortMode, setSortMode] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [saveOrderStatus, setSaveOrderStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const preSortSettings = useRef({
    sortBy: 'menuOrder',
    sortOrder: 'ASC' as 'ASC' | 'DESC',
    typeFilter: '',
    perPage: 20,
    statusFilter: 'published',
  });

  // Get API URL using utility function
  const API_URL = getApiUrl();

  // Load vendors for filter
  useEffect(() => {
    if (status === 'authenticated') {
      fetchVendors();
      fetchStatusCounts();
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

  const fetchStatusCounts = async () => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
      const statuses = ['published', 'draft', 'sold', 'archived'];
      const [allRes, ...statusRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/products?page=1&limit=1`, {
          headers,
          credentials: 'include',
        }).then((r) => r.json()),
        ...statuses.map((s) =>
          fetch(`${API_URL}/api/admin/products?page=1&limit=1&status=${s}`, {
            headers,
            credentials: 'include',
          }).then((r) => r.json()),
        ),
      ]);
      setStatusCounts({
        all: allRes.pagination?.total ?? 0,
        published: statusRes[0].pagination?.total ?? 0,
        draft: statusRes[1].pagination?.total ?? 0,
        sold: statusRes[2].pagination?.total ?? 0,
        archived: statusRes[3].pagination?.total ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch status counts:', err);
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

      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });

      const data = await res.json();

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
      return;
    }

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

      const res = await fetch(url, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: 'archived' }),
      });

      const data = await res.json();

      if (data.success) {
        setShowDeleteModal(false);
        setSelectedProduct(null);
        await fetchProducts();
      } else {
        setError(data.message || 'Failed to archive product');
        setShowDeleteModal(false);
      }
    } catch (err: any) {
      console.error('[confirmDelete] Error:', err);
      setError(err.message || 'Failed to archive product');
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

  // ─── Sort Mode Handlers ────────────────────────────────────────

  const enterSortMode = () => {
    preSortSettings.current = {
      sortBy,
      sortOrder,
      typeFilter,
      perPage: pagination.perPage,
      statusFilter,
    };
    setSortMode(true);
    setSortBy('menuOrder');
    setSortOrder('ASC');
    setTypeFilter('book');
    setStatusFilter('published');
    setSearchTerm('');
    setVendorFilter('');
    setMinPrice('');
    setMaxPrice('');
    setPagination((p) => ({ ...p, currentPage: 1, perPage: 100 }));
    setHasOrderChanges(false);
    setSaveOrderStatus('idle');
  };

  const exitSortMode = () => {
    if (hasOrderChanges) {
      if (!confirm('You have unsaved changes. Exit sort mode?')) return;
    }
    const prev = preSortSettings.current;
    setSortMode(false);
    setSortBy(prev.sortBy);
    setSortOrder(prev.sortOrder);
    setTypeFilter(prev.typeFilter);
    setStatusFilter(prev.statusFilter);
    setPagination((p) => ({ ...p, currentPage: 1, perPage: prev.perPage }));
    setHasOrderChanges(false);
    setSaveOrderStatus('idle');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Sync localProducts when products change in sort mode
  useEffect(() => {
    if (sortMode && products.length > 0) {
      setLocalProducts([...products]);
      setHasOrderChanges(false);
    }
  }, [products, sortMode]);

  const handleSortDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleSortDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleSortDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newProducts = [...localProducts];
    const [draggedItem] = newProducts.splice(draggedIndex, 1);
    newProducts.splice(dropIndex, 0, draggedItem);

    const baseOrder = (pagination.currentPage - 1) * pagination.perPage;
    const updated = newProducts.map((product, idx) => ({
      ...product,
      menuOrder: baseOrder + idx + 1,
    }));

    setLocalProducts(updated);
    setHasOrderChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSortDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveSortItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localProducts.length) return;

    const newProducts = [...localProducts];
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];

    const baseOrder = (pagination.currentPage - 1) * pagination.perPage;
    const updated = newProducts.map((product, idx) => ({
      ...product,
      menuOrder: baseOrder + idx + 1,
    }));

    setLocalProducts(updated);
    setHasOrderChanges(true);
  };

  const handleSaveOrder = async () => {
    setSaveOrderStatus('saving');
    try {
      const items = localProducts.map((p) => ({
        id: Number(p.id),
        menuOrder: p.menuOrder || 0,
      }));
      await api.put('/admin/books/menu-order', { items });
      setSaveOrderStatus('success');
      setHasOrderChanges(false);
      setTimeout(() => setSaveOrderStatus('idle'), 3000);
    } catch (err) {
      setSaveOrderStatus('error');
      setTimeout(() => setSaveOrderStatus('idle'), 5000);
    }
  };

  const handleResetOrder = () => {
    setLocalProducts([...products]);
    setHasOrderChanges(false);
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
      {/* Sort Mode Banner */}
      {sortMode && (
        <div className="mb-4 bg-blue-50 border border-blue-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={['fal', 'sort']} className="text-blue-600" />
            <span className="font-medium text-blue-900">Sort Mode</span>
            <span className="text-sm text-blue-700">
              — Drag and drop to reorder books. Changes are saved per page batch.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasOrderChanges && (
              <button
                onClick={handleResetOrder}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSaveOrder}
              disabled={!hasOrderChanges || saveOrderStatus === 'saving'}
              className={`px-5 py-1.5 text-sm font-medium text-white transition-colors ${
                hasOrderChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saveOrderStatus === 'saving' ? (
                <>
                  <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Order'
              )}
            </button>
            <button
              onClick={exitSortMode}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-700 hover:bg-red-50"
            >
              Exit Sort
            </button>
          </div>
        </div>
      )}

      {/* Save/Error Status Notices */}
      {saveOrderStatus === 'success' && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'check-circle']} />
          Menu order saved successfully!
        </div>
      )}
      {saveOrderStatus === 'error' && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'exclamation-circle']} />
          Failed to save menu order. Please try again.
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {sortMode ? 'Sort Books (Menu Order)' : 'Products'}
          </h1>
          <p className="text-gray-600 mt-1">
            {sortMode
              ? `Showing ${localProducts.length} of ${pagination.total.toLocaleString()} books${pagination.totalPages > 1 ? ` (Page ${pagination.currentPage} of ${pagination.totalPages})` : ''}`
              : 'Manage all books and collectible products'}
          </p>
        </div>
        {!sortMode && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={enterSortMode}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 transition-colors flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <FontAwesomeIcon icon={['fal', 'sort']} />
              Sort Books
            </button>
            <button
              onClick={() => setShowImportWizard(true)}
              className="px-4 py-2 bg-white text-primary border border-primary transition-colors flex items-center justify-center gap-2 hover:bg-primary/5"
            >
              <FontAwesomeIcon icon={['fal', 'file-csv']} />
              Import CSV
            </button>
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
        )}
      </div>

      {/* Status Count Tabs */}
      {!sortMode && (
        <div className="flex flex-wrap items-center gap-1 text-sm mb-4 border-b border-gray-200 pb-3">
          {[
            { key: '', label: 'All' },
            { key: 'published', label: 'Published' },
            { key: 'draft', label: 'Drafts' },
            { key: 'sold', label: 'Sold' },
            { key: 'archived', label: 'Archived' },
          ].map((tab, i) => {
            const countKey =
              tab.key === '' ? 'all' : (tab.key as keyof NonNullable<typeof statusCounts>);
            return (
              <span key={tab.key} className="flex items-center">
                {i > 0 && <span className="text-gray-300 mx-1">|</span>}
                <button
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPagination((p) => ({ ...p, currentPage: 1 }));
                  }}
                  className={`px-1 py-1 transition-colors ${
                    statusFilter === tab.key
                      ? 'font-semibold text-gray-900'
                      : 'text-blue-600 hover:underline'
                  }`}
                >
                  {tab.label}
                  {statusCounts?.[countKey] !== undefined
                    ? ` (${statusCounts[countKey].toLocaleString()})`
                    : ''}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search and Filters */}
      {!sortMode && (
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

            {/* Sort By */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_');
                setSortBy(field);
                setSortOrder(order as 'ASC' | 'DESC');
                setPagination((p) => ({ ...p, currentPage: 1 }));
              }}
              className="px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black bg-white text-sm"
            >
              <option value="menuOrder_ASC">Featured Order</option>
              <option value="createdAt_DESC">Newest First</option>
              <option value="createdAt_ASC">Oldest First</option>
              <option value="price_ASC">Price: Low → High</option>
              <option value="price_DESC">Price: High → Low</option>
              <option value="title_ASC">Title: A → Z</option>
              <option value="title_DESC">Title: Z → A</option>
            </select>

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
                  <option value="sold">Sold</option>
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
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-4">{error}</div>
      )}

      {/* Sort Mode: Drag & Drop View */}
      {sortMode && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <FontAwesomeIcon
                icon={['fal', 'spinner-third']}
                spin
                className="text-4xl text-blue-500"
              />
            </div>
          ) : localProducts.length === 0 ? (
            <div className="bg-white border border-gray-200 px-6 py-12 text-center text-gray-500">
              No books found
            </div>
          ) : (
            <div className="bg-white border border-gray-200 overflow-hidden">
              {/* Sort Table Header */}
              <div className="hidden lg:grid grid-cols-[60px_80px_1fr_120px_100px_80px] gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div>Order</div>
                <div></div>
                <div>Title / Author</div>
                <div>Price</div>
                <div>Status</div>
                <div>Move</div>
              </div>

              {/* Desktop: Sortable Rows */}
              <div className="hidden lg:block">
                {localProducts.map((product, index) => {
                  const primaryImage =
                    product.images?.find((img: any) => img.isPrimary || img.is_primary) ||
                    product.images?.[0];
                  const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;

                  return (
                    <div
                      key={product.id}
                      draggable
                      onDragStart={() => handleSortDragStart(index)}
                      onDragOver={(e) => handleSortDragOver(e, index)}
                      onDrop={(e) => handleSortDrop(e, index)}
                      onDragEnd={handleSortDragEnd}
                      className={`grid grid-cols-[60px_80px_1fr_120px_100px_80px] gap-2 px-4 py-3 border-b items-center transition-colors cursor-grab active:cursor-grabbing ${
                        draggedIndex === index
                          ? 'bg-blue-50 opacity-50'
                          : dragOverIndex === index
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {/* Order Number */}
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={['fal', 'grip-vertical']}
                          className="text-gray-400"
                        />
                        <span className="text-sm font-mono text-gray-500">
                          {product.menuOrder || index + 1}
                        </span>
                      </div>

                      {/* Image */}
                      <div className="w-14 h-14 bg-gray-100 overflow-hidden flex-shrink-0">
                        <CloudinaryImage
                          src={imageUrl}
                          alt={product.title}
                          width={128}
                          height={128}
                          className="w-full h-full"
                          fallbackIcon={['fal', 'book']}
                        />
                      </div>

                      {/* Title & Author */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.title}
                        </p>
                        {product.author && (
                          <p className="text-xs text-gray-500 truncate">by {product.author}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(product.price)}
                      </div>

                      {/* Status */}
                      <div>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeColor(product.status)}`}
                        >
                          {product.status}
                        </span>
                      </div>

                      {/* Move buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveSortItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-xs" />
                        </button>
                        <button
                          onClick={() => moveSortItem(index, 'down')}
                          disabled={index === localProducts.length - 1}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-xs" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile: Sortable Cards */}
              <div className="lg:hidden">
                {localProducts.map((product, index) => {
                  const primaryImage =
                    product.images?.find((img: any) => img.isPrimary || img.is_primary) ||
                    product.images?.[0];
                  const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;

                  return (
                    <div
                      key={product.id}
                      draggable
                      onDragStart={() => handleSortDragStart(index)}
                      onDragOver={(e) => handleSortDragOver(e, index)}
                      onDrop={(e) => handleSortDrop(e, index)}
                      onDragEnd={handleSortDragEnd}
                      className={`flex items-center gap-3 px-4 py-3 border-b cursor-grab active:cursor-grabbing ${
                        draggedIndex === index
                          ? 'bg-blue-50 opacity-50'
                          : dragOverIndex === index
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={['fal', 'grip-vertical']}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <span className="text-sm font-mono text-gray-500 w-8 flex-shrink-0">
                        {product.menuOrder || index + 1}
                      </span>
                      <div className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0">
                        <CloudinaryImage
                          src={imageUrl}
                          alt={product.title}
                          width={80}
                          height={80}
                          className="w-full h-full"
                          fallbackIcon={['fal', 'book']}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.title}
                        </p>
                        {product.author && (
                          <p className="text-xs text-gray-500 truncate">{product.author}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveSortItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-xs" />
                        </button>
                        <button
                          onClick={() => moveSortItem(index, 'down')}
                          disabled={index === localProducts.length - 1}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-xs" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sort Mode Pagination */}
          {!loading && localProducts.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 border-t-0">
              <p className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages} (
                {pagination.total.toLocaleString()} books)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (hasOrderChanges && !confirm('You have unsaved changes. Switch page?'))
                      return;
                    setPagination((p) => ({ ...p, currentPage: Math.max(1, p.currentPage - 1) }));
                  }}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={['fal', 'chevron-left']} className="mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => {
                    if (hasOrderChanges && !confirm('You have unsaved changes. Switch page?'))
                      return;
                    setPagination((p) => ({
                      ...p,
                      currentPage: Math.min(p.totalPages, p.currentPage + 1),
                    }));
                  }}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <FontAwesomeIcon icon={['fal', 'chevron-right']} className="ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Products Table (Normal Mode) */}
      {!sortMode && (
        <div className="bg-white border border-gray-200">
          <ResponsiveDataView
            breakpoint="lg"
            mobile={
              <div>
                {loading ? (
                  <div className="px-6 py-12 text-center text-gray-500">Loading products...</div>
                ) : products.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">No products found</div>
                ) : (
                  <MobileCardList gap="sm">
                    {products.map((product) => {
                      const primaryImage =
                        product.images?.find((img: any) => img.isPrimary || img.is_primary) ||
                        product.images?.[0];
                      const imageUrl = primaryImage?.url || primaryImage?.imageUrl || primaryImage;
                      return (
                        <MobileCard
                          key={product.id}
                          onClick={() => handleViewDetails(product)}
                          thumbnail={
                            <CloudinaryImage
                              src={imageUrl}
                              alt={product.title}
                              width={128}
                              height={128}
                              className="w-full h-full"
                              fallbackIcon={
                                product.type === 'book' ? ['fal', 'book'] : ['fal', 'box']
                              }
                            />
                          }
                          title={product.title}
                          subtitle={
                            product.author
                              ? `by ${product.author}`
                              : product.sku
                                ? `SKU: ${product.sku}`
                                : undefined
                          }
                          badge={
                            <div className="flex flex-col gap-1 items-end">
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeColor(product.status)}`}
                              >
                                {product.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {product.type === 'book' ? 'Book' : 'Collectible'}
                              </span>
                            </div>
                          }
                          details={[
                            { label: 'Vendor', value: product.vendor?.shopName || 'No vendor' },
                            { label: 'Created', value: formatDate(product.createdAt) },
                          ]}
                          primaryMetric={{ label: 'Price', value: formatPrice(product.price) }}
                        >
                          <div
                            className="mt-3 flex flex-wrap gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {product.status === 'draft' && (
                              <button
                                onClick={() => handleToggleStatus(product, 'published')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 min-h-[36px]"
                              >
                                <FontAwesomeIcon icon={['fal', 'check-circle']} /> Publish
                              </button>
                            )}
                            {product.status === 'published' && (
                              <button
                                onClick={() => handleToggleStatus(product, 'draft')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded hover:bg-orange-200 min-h-[36px]"
                              >
                                <FontAwesomeIcon icon={['fal', 'minus-circle']} /> Unpublish
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetails(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[36px]"
                            >
                              <FontAwesomeIcon icon={['fal', 'eye']} /> View
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 min-h-[36px]"
                            >
                              <FontAwesomeIcon icon={['fal', 'edit']} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200 min-h-[36px]"
                            >
                              <FontAwesomeIcon icon={['fal', 'archive']} /> Archive
                            </button>
                          </div>
                        </MobileCard>
                      );
                    })}
                  </MobileCardList>
                )}
              </div>
            }
            desktop={
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
                        const imageUrl =
                          primaryImage?.url || primaryImage?.imageUrl || primaryImage;

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
                              <div className="text-sm font-medium text-gray-900">
                                {product.title}
                              </div>
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
                                <div className="text-sm text-gray-900">
                                  {product.vendor.shopName}
                                </div>
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
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                  className="text-amber-600 hover:text-amber-900"
                                  title="Archive"
                                >
                                  <FontAwesomeIcon icon={['fal', 'archive']} />
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
            }
          />

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
      )}

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

      {/* CSV Import Wizard */}
      <CSVImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onComplete={() => fetchProducts()}
        role="admin"
      />
    </div>
  );
}
