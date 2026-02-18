'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Pagination from '@/components/shared/Pagination';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ItemTypeSelectionModal from '@/components/modals/ItemTypeSelectionModal';
import { getApiUrl } from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';

export default function VendorCollectiblesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vendor-collectibles', page, search, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      });

      const res = await fetch(getApiUrl(`api/vendor/collectibles?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch collectibles');
      return await res.json();
    },
    enabled: !!session,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  if (status === 'loading')
    return <PageLoading message="Loading collectibles..." fullPage={false} />;
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const collectibles = data?.data || [];
  const pagination = data?.pagination || {};

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this collectible?')) return;
    try {
      await fetch(getApiUrl(`api/vendor/collectibles/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/vendor/dashboard"
          className="text-primary hover:text-secondary mb-4 inline-block"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary">My Collectibles</h1>
            <p className="text-gray-600 mt-2">
              Manage your collectible items (art, manuscripts, vintage items, etc.)
            </p>
          </div>
          <button
            onClick={() => setShowItemTypeModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 hover:bg-opacity-90"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={['fal', 'search']}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search collectibles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border"
          >
            <option value="all">All Categories</option>
            <option value="Art">Art</option>
            <option value="Painting">Painting</option>
            <option value="Manuscript">Manuscript</option>
            <option value="Map">Map</option>
            <option value="Vintage">Vintage</option>
            <option value="Memorabilia">Memorabilia</option>
          </select>
        </div>
      </div>

      {/* Collectibles Grid */}
      {isLoading ? (
        <PageLoading message="Loading collectibles..." fullPage={false} />
      ) : collectibles.length === 0 ? (
        <EmptyState
          icon={['fal', 'box']}
          title="No collectibles yet"
          description="Add your first collectible to start selling"
          actionLabel="Add Collectible"
          actionHref="/vendor/collectibles/new"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collectibles.map((item: any) => (
              <div
                key={item.id}
                className="bg-white border overflow-hidden hover:shadow-lg transition"
              >
                <div className="w-full h-48 overflow-hidden">
                  <CloudinaryImage
                    src={item.images?.[0]?.url}
                    alt={item.title}
                    width={400}
                    height={300}
                    className="w-full h-full"
                    fallbackIcon={['fal', 'box']}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                  <p className="text-lg font-bold text-primary mb-4">${item.price}</p>
                  <div className="flex gap-2">
                    <Link
                      href={`/vendor/collectibles/${item.id}/edit`}
                      className="flex-1 text-center bg-primary text-white py-2 hover:bg-opacity-90"
                    >
                      <FontAwesomeIcon icon={['fal', 'edit']} className="mr-2" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50"
                    >
                      <FontAwesomeIcon icon={['fal', 'trash']} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
