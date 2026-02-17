'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import api from '@/lib/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  parentId: number | null;
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Category[] }>('/categories');
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const filteredCategories = data?.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete category');
      }
    }
  };

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Manage book categories and subcategories</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="bg-primary text-white px-6 py-2 hover:bg-primary-dark transition-colors flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto"
        >
          <FontAwesomeIcon icon={['fal', 'plus']} />
          Add Category
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <FontAwesomeIcon
            icon={['fal', 'search']}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-4xl text-primary" />
        </div>
      )}

      {/* Categories Table */}
      {!isLoading && (
        <ResponsiveDataView
          breakpoint="md"
          mobile={
            <MobileCardList gap="md">
              {filteredCategories?.map((category) => (
                <MobileCard
                  key={category.id}
                  onClick={() => (window.location.href = `/admin/categories/${category.id}/edit`)}
                  thumbnail={
                    <CloudinaryImage
                      src={category.imageUrl}
                      alt={category.name}
                      width={80}
                      height={80}
                      className="w-full h-full"
                      fallbackIcon={['fal', 'folder']}
                    />
                  }
                  title={category.name}
                  subtitle={category.slug}
                  details={[
                    { label: 'Description', value: category.description || 'No description' },
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      href: `/admin/categories/${category.id}/edit`,
                      variant: 'primary',
                    },
                    {
                      label: 'Delete',
                      onClick: () => handleDelete(category.id, category.name),
                      variant: 'danger',
                    },
                  ]}
                />
              ))}
              {filteredCategories?.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">No categories found</div>
              )}
            </MobileCardList>
          }
          desktop={
            <div className="bg-white shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Slug
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCategories?.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50 cursor-pointer">
                        <td
                          className="px-3 sm:px-6 py-4 whitespace-nowrap"
                          onClick={() =>
                            (window.location.href = `/admin/categories/${category.id}/edit`)
                          }
                        >
                          <div className="flex items-center">
                            <div className="h-10 w-10 mr-2 flex-shrink-0 overflow-hidden">
                              <CloudinaryImage
                                src={category.imageUrl}
                                alt={category.name}
                                width={80}
                                height={80}
                                className="w-full h-full"
                                fallbackIcon={['fal', 'folder']}
                              />
                            </div>
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          </div>
                        </td>
                        <td
                          className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          onClick={() =>
                            (window.location.href = `/admin/categories/${category.id}/edit`)
                          }
                        >
                          {category.slug}
                        </td>
                        <td
                          className="px-3 sm:px-6 py-4 text-sm text-gray-500"
                          onClick={() =>
                            (window.location.href = `/admin/categories/${category.id}/edit`)
                          }
                        >
                          {category.description ? (
                            <span className="line-clamp-2">{category.description}</span>
                          ) : (
                            <span className="text-gray-400 italic">No description</span>
                          )}
                        </td>
                        <td
                          className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/admin/categories/${category.id}/edit`}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <FontAwesomeIcon icon={['fal', 'edit']} className="mr-1" />
                          </Link>
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteMutation.isPending}
                          >
                            <FontAwesomeIcon icon={['fal', 'trash']} className="mr-1" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCategories?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                          No categories found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
