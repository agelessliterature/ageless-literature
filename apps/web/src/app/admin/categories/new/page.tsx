'use client';

import { useRouter } from 'next/navigation';
import CategoryForm from '../components/CategoryForm';

export default function NewCategoryPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New Category</h1>
        <p className="text-gray-600 mt-1">Create a new book category</p>
      </div>

      <div className="bg-white shadow p-6">
        <CategoryForm onSuccess={() => router.push('/admin/categories')} />
      </div>
    </div>
  );
}
