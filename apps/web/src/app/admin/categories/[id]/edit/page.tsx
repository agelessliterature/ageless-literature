'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import CategoryForm from '../../components/CategoryForm';
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

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const categoryId = parseInt(params.id);

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Category }>(
        `/categories/${categoryId}`,
      );
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-4xl text-primary" />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Category not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Category</h1>
        <p className="text-gray-600 mt-1">Update category details</p>
      </div>

      <div className="bg-white shadow p-6">
        <CategoryForm category={category} onSuccess={() => router.push('/admin/categories')} />
      </div>
    </div>
  );
}
