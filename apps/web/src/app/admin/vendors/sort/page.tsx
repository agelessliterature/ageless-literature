'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';

interface Vendor {
  id: number;
  shopName: string;
  shopUrl: string;
  menuOrder: number;
  status: string;
  logoUrl?: string | null;
  user?: { email: string; firstName?: string; lastName?: string };
}

interface VendorsResponse {
  success: boolean;
  data: {
    vendors: Vendor[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export default function SortVendorsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  const [localVendors, setLocalVendors] = useState<Vendor[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-vendors-sort', page, limit, search, status],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit,
        sortBy: 'menuOrder',
        sortOrder: 'ASC',
      };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get<VendorsResponse>('/admin/vendors', { params });
      return res.data;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (data?.data?.vendors) {
      setLocalVendors(data.data.vendors);
      setHasChanges(false);
    }
  }, [data]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  };

  const saveMutation = useMutation({
    mutationFn: async (items: Array<{ id: number; menuOrder: number }>) => {
      const res = await api.put('/admin/vendors/menu-order', { items });
      return res.data;
    },
    onSuccess: () => {
      setSaveStatus('success');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-vendors-sort'] });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    },
  });

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const updated = [...localVendors];
    const [dragged] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, dragged);
    const base = (page - 1) * limit;
    setLocalVendors(updated.map((v, i) => ({ ...v, menuOrder: base + i + 1 })));
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localVendors.length) return;
    const updated = [...localVendors];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const base = (page - 1) * limit;
    setLocalVendors(updated.map((v, i) => ({ ...v, menuOrder: base + i + 1 })));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaveStatus('saving');
    saveMutation.mutate(localVendors.map((v) => ({ id: v.id, menuOrder: v.menuOrder })));
  };

  const handleReset = () => {
    if (data?.data?.vendors) {
      setLocalVendors(data.data.vendors);
      setHasChanges(false);
    }
  };

  const pagination = data?.data?.pagination ?? { total: 0, page: 1, limit, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a
            href="/admin/vendors"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1"
          >
            <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-xs" />
            Back to Vendors
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Sort Vendors (Menu Order)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop to reorder vendors. Order controls display priority in shop listings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 rounded"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className={`px-6 py-2 text-sm font-medium rounded text-white transition-colors ${
              hasChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Order'
            )}
          </button>
        </div>
      </div>

      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'check-circle']} />
          Vendor menu order saved successfully!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'exclamation-circle']} />
          Failed to save menu order. Please try again.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <div className="relative">
            <FontAwesomeIcon
              icon={['fal', 'search']}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Store name or URL..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-gray-500">
            Showing {localVendors.length} of {pagination.total.toLocaleString()} vendors
            {pagination.totalPages > 1 && ` (Page ${page} of ${pagination.totalPages})`}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <FontAwesomeIcon
            icon={['fal', 'spinner-third']}
            spin
            className="text-4xl text-blue-500"
          />
        </div>
      )}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error instanceof Error ? error.message : 'Failed to load vendors'}
        </div>
      )}

      {/* Sortable List */}
      {!isLoading && !isError && localVendors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[52px_48px_1fr_160px_90px_72px] gap-2 px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Order</div>
            <div></div>
            <div>Store</div>
            <div>Email</div>
            <div>Status</div>
            <div>Move</div>
          </div>

          {localVendors.map((vendor, index) => (
            <div
              key={vendor.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`grid grid-cols-[52px_48px_1fr_160px_90px_72px] gap-2 px-3 py-1.5 border-b items-center transition-colors cursor-grab active:cursor-grabbing ${
                draggedIndex === index
                  ? 'bg-blue-50 opacity-50'
                  : dragOverIndex === index
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white hover:bg-gray-50'
              }`}
            >
              {/* Order Number */}
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={['fal', 'grip-vertical']} className="text-gray-400" />
                <span className="text-sm font-mono text-gray-500">{vendor.menuOrder}</span>
              </div>

              {/* Logo */}
              <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {vendor.logoUrl ? (
                  <img src={vendor.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FontAwesomeIcon icon={['fal', 'store']} className="text-gray-300 text-xs" />
                  </div>
                )}
              </div>

              {/* Store Name & URL */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{vendor.shopName}</p>
                <p className="text-xs text-gray-400 truncate">/{vendor.shopUrl}</p>
              </div>

              {/* Email */}
              <div className="text-xs text-gray-500 truncate">{vendor.user?.email ?? '—'}</div>

              {/* Status */}
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    vendor.status === 'active' || vendor.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : vendor.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : vendor.status === 'suspended'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {vendor.status}
                </span>
              </div>

              {/* Move buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-xs" />
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === localVendors.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && localVendors.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
          No vendors found.
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages} ({pagination.total.toLocaleString()} vendors)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={['fal', 'chevron-left']} className="mr-1" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <FontAwesomeIcon icon={['fal', 'chevron-right']} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
