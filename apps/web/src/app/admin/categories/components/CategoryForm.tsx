'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
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

interface CategoryFormProps {
  category?: Category;
  onSuccess: () => void;
}

export default function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [parentId, setParentId] = useState<string>(category?.parentId?.toString() || '');
  const [imageUrl, setImageUrl] = useState(category?.imageUrl || '');
  const [imagePublicId, setImagePublicId] = useState(category?.imagePublicId || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch all categories for parent selection
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Category[] }>('/categories');
      return data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (category) {
        return api.put(`/categories/${category.id}`, data);
      }
      return api.post('/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onSuccess();
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ageless-literature');
      formData.append('folder', 'categories');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setImageUrl(data.secure_url);
      setImagePublicId(data.public_id);
    } catch (error) {
      setUploadError('Failed to upload image');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePublicId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await saveMutation.mutateAsync({
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        imagePublicId: imagePublicId || null,
        parentId: parentId ? parseInt(parentId) : null,
      });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save category');
    }
  };

  // Filter out current category from parent options (can't be its own parent)
  const parentOptions = categories?.filter((cat) => cat.id !== category?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="e.g., Rare Books, First Editions"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="Brief description of this category..."
        />
      </div>

      {/* Parent Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">None (Top Level)</option>
          {parentOptions?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Optional: Select a parent category to create a subcategory
        </p>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>

        {imageUrl ? (
          <div className="relative inline-block">
            <div className="w-[200px] h-[200px] overflow-hidden">
              <CloudinaryImage
                src={imageUrl}
                alt="Category"
                width={200}
                height={200}
                className="w-full h-full"
              />
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-600 text-white p-2 hover:bg-red-700"
            >
              <FontAwesomeIcon icon={['fal', 'times']} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              {uploading ? (
                <FontAwesomeIcon
                  icon={['fal', 'spinner-third']}
                  spin
                  className="text-4xl text-gray-400 mb-2"
                />
              ) : (
                <FontAwesomeIcon
                  icon={['fal', 'cloud-upload']}
                  className="text-4xl text-gray-400 mb-2"
                />
              )}
              <span className="text-sm text-gray-600">
                {uploading ? 'Uploading...' : 'Click to upload image'}
              </span>
            </label>
            {uploadError && <p className="text-red-600 text-sm mt-2">{uploadError}</p>}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">Recommended: Square images, minimum 400x400px</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={saveMutation.isPending || uploading}
          className="bg-primary text-white px-6 py-2 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? (
            <>
              <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
              Saving...
            </>
          ) : (
            <>{category ? 'Update Category' : 'Create Category'}</>
          )}
        </button>
        <button
          type="button"
          onClick={onSuccess}
          className="border border-gray-300 text-gray-700 px-6 py-2 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
