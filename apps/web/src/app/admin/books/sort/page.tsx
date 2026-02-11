'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';

interface Book {
  id: number;
  title: string;
  author: string;
  price: string | number;
  menuOrder: number;
  status: string;
  media?: Array<{ url: string; type: string }>;
  vendor?: { id: number; storeName: string };
  categories?: Array<{ id: number; name: string; slug: string }>;
}

interface BooksResponse {
  success: boolean;
  data: Book[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function SortBooksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('published');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Track local reorder state
  const [localBooks, setLocalBooks] = useState<Book[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch books
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-books-sort', page, limit, search, category, status],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit,
        sortBy: 'menu_order',
        sortOrder: 'ASC',
      };
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;

      const { data } = await api.get<BooksResponse>('/admin/books', { params });
      return data;
    },
    staleTime: 0,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Category[] }>('/categories');
      return data.data;
    },
    staleTime: 60000,
  });

  // Update local state when data changes
  useEffect(() => {
    if (data?.data) {
      setLocalBooks(data.data);
      setHasChanges(false);
    }
  }, [data]);

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (items: Array<{ id: number; menuOrder: number }>) => {
      const { data } = await api.put('/admin/books/menu-order', { items });
      return data;
    },
    onSuccess: () => {
      setSaveStatus('success');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-books-sort'] });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    },
  });

  // DRAG & DROP handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newBooks = [...localBooks];
    const [draggedItem] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(dropIndex, 0, draggedItem);

    // Recalculate menu_order based on position
    // Use the page offset to maintain global ordering
    const baseOrder = (page - 1) * limit;
    const updated = newBooks.map((book, idx) => ({
      ...book,
      menuOrder: baseOrder + idx + 1,
    }));

    setLocalBooks(updated);
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move item up/down with buttons
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localBooks.length) return;

    const newBooks = [...localBooks];
    [newBooks[index], newBooks[newIndex]] = [newBooks[newIndex], newBooks[index]];

    const baseOrder = (page - 1) * limit;
    const updated = newBooks.map((book, idx) => ({
      ...book,
      menuOrder: baseOrder + idx + 1,
    }));

    setLocalBooks(updated);
    setHasChanges(true);
  };

  // Save order
  const handleSave = () => {
    setSaveStatus('saving');
    const items = localBooks.map((book) => ({
      id: book.id,
      menuOrder: book.menuOrder,
    }));
    saveMutation.mutate(items);
  };

  // Reset to original
  const handleReset = () => {
    if (data?.data) {
      setLocalBooks(data.data);
      setHasChanges(false);
    }
  };

  const pagination = data?.pagination ?? { total: 0, page: 1, limit, totalPages: 1 };
  const categories = categoriesData ?? [];

  const getImageUrl = (book: Book) => {
    const img = book.media?.find((m) => m.type === 'image');
    return img?.url || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sort Books (Menu Order)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop to reorder books. Changes are saved per page batch.
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
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
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

      {/* Status notices */}
      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'check-circle']} />
          Menu order saved successfully!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'exclamation-circle']} />
          Failed to save menu order. Please try again.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-4 gap-4">
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
              placeholder="Title or author..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-gray-500">
            Showing {localBooks.length} of {pagination.total.toLocaleString()} books
            {pagination.totalPages > 1 && ` (Page ${page} of ${pagination.totalPages})`}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-4xl text-blue-500" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error instanceof Error ? error.message : 'Failed to load books'}
        </div>
      )}

      {/* Sortable List */}
      {!isLoading && !isError && localBooks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[60px_80px_1fr_150px_100px_100px_80px] gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Order</div>
            <div></div>
            <div>Title / Author</div>
            <div>Category</div>
            <div>Price</div>
            <div>Status</div>
            <div>Move</div>
          </div>

          {/* Sortable Items */}
          {localBooks.map((book, index) => (
            <div
              key={book.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`grid grid-cols-[60px_80px_1fr_150px_100px_100px_80px] gap-2 px-4 py-3 border-b items-center transition-colors cursor-grab active:cursor-grabbing ${
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
                <span className="text-sm font-mono text-gray-500">{book.menuOrder}</span>
              </div>

              {/* Image */}
              <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {getImageUrl(book) ? (
                  <img
                    src={getImageUrl(book)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FontAwesomeIcon icon={['fal', 'book']} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* Title & Author */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                <p className="text-xs text-gray-500 truncate">{book.author}</p>
              </div>

              {/* Category */}
              <div className="text-xs text-gray-500 truncate">
                {book.categories?.map((c) => c.name).join(', ') || '—'}
              </div>

              {/* Price */}
              <div className="text-sm font-medium text-gray-900">
                ${Number(book.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>

              {/* Status */}
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    book.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : book.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {book.status}
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
                  disabled={index === localBooks.length - 1}
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages} ({pagination.total.toLocaleString()} books)
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

      {/* Sync from PROD section */}
      <SyncFromProd />
    </div>
  );
}

// ─── Sync from PROD Component ────────────────────────────────────────────

function SyncFromProd() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncOutput, setSyncOutput] = useState('');
  const queryClient = useQueryClient();

  const handleSync = async () => {
    if (!confirm('This will sync menu_order from PROD (read-only). Continue?')) return;

    setSyncStatus('syncing');
    setSyncOutput('');

    try {
      const { data } = await api.post('/admin/books/sync-menu-order');
      setSyncStatus('success');
      setSyncOutput(data.output || data.message || 'Sync completed');
      queryClient.invalidateQueries({ queryKey: ['admin-books-sort'] });
    } catch (err: any) {
      setSyncStatus('error');
      setSyncOutput(err.response?.data?.details || err.message || 'Sync failed');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sync from Production</h2>
          <p className="text-sm text-gray-500">
            Pull menu_order values from the production WordPress site (read-only). Only updates DEV.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncStatus === 'syncing'}
          className={`px-5 py-2.5 rounded font-medium text-sm text-white transition-colors ${
            syncStatus === 'syncing'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          {syncStatus === 'syncing' ? (
            <>
              <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
              Syncing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={['fal', 'sync']} className="mr-2" />
              Sync Menu Order from PROD
            </>
          )}
        </button>
      </div>

      {syncStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
          <p className="text-sm font-medium text-green-800 mb-2">Sync completed successfully</p>
          <pre className="text-xs text-green-700 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
            {syncOutput}
          </pre>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
          <p className="text-sm font-medium text-red-800 mb-2">Sync failed</p>
          <pre className="text-xs text-red-700 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
            {syncOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
