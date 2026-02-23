'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import ImageUploader from '@/components/shared/ImageUploader';
import { ProductFormData, Product } from '@/types/Product';
import api from '@/lib/api';
import RichTextEditor from '@/components/forms/RichTextEditor';

const PRODUCT_CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'];

interface ProductFormProps {
  product?: Product;
  isEdit?: boolean;
}

export default function ProductForm({ product, isEdit = false }: ProductFormProps) {
  const router = useRouter();

  // Transform product images to ImageUploader format
  const initialImages = product?.images
    ? Array.isArray(product.images)
      ? product.images.map((img: any) =>
          typeof img === 'string'
            ? {
                url: img,
                publicId: img.split('/').pop() || '',
                thumbnail: img,
              }
            : {
                url: img.url || img.imageUrl || img,
                publicId: img.publicId || img.url?.split('/').pop() || '',
                thumbnail: img.thumbnail || img.thumbnailUrl || img.url || img.imageUrl || img,
              },
        )
      : []
    : [];

  const [images, setImages] =
    useState<Array<{ url: string; publicId: string; thumbnail?: string }>>(initialImages);
  const [categoryIds, setCategoryIds] = useState<number[]>(
    product?.categories?.map((c) => c.id) || [],
  );
  const [includeShortDescription, setIncludeShortDescription] = useState<boolean>(
    !!product?.shortDescription,
  );
  const [includeCondition, setIncludeCondition] = useState<boolean>(!!product?.condition);
  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    title: product?.title || '',
    description:
      typeof product?.description === 'object'
        ? (product?.description as any)?.en || (product?.description as any)?.html || ''
        : product?.description || '',
    shortDescription: (typeof product?.shortDescription === 'object'
      ? (product?.shortDescription as any)?.en || (product?.shortDescription as any)?.html || ''
      : product?.shortDescription || ''
    )
      .replace(/<[^>]*>/g, '')
      .trim(),
    price: product?.price?.toString() || '',
    condition: product?.condition || undefined,
    quantity: product?.quantity || 1,
    artist: product?.artist || '',
    yearMade: product?.yearMade || undefined,
    materials: product?.materials || '',
    dimensions: product?.dimensions || '',
    status: (product?.status as 'draft' | 'published') || 'draft',
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (isEdit && product?.id) {
        const response = await api.put(`/vendor/collectibles/${product.id}`, data);
        return response.data;
      } else {
        const response = await api.post('/vendor/collectibles', data);
        return response.data;
      }
    },
    onSuccess: () => {
      router.push('/vendor/collectibles');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'An error occurred');
    },
  });

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      alert('Please add at least one image');
      return;
    }

    // Sanitize numeric fields: convert empty strings and NaN to null
    const sanitizeNumeric = (val: any): number | null => {
      if (val === '' || val === undefined || val === null) return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    };

    const dataToSubmit: ProductFormData = {
      ...(formData as ProductFormData),
      price: String(sanitizeNumeric(formData.price) ?? 0),
      quantity: sanitizeNumeric(formData.quantity) ?? 1,
      tags: Array.isArray((formData as any).tags) ? (formData as any).tags : [],
      images,
      status,
      categoryIds,
      isSigned: (formData as any).isSigned ?? false,
      isAuthenticated: (formData as any).isAuthenticated ?? false,
      // Only include shortDescription if checkbox is checked
      shortDescription: includeShortDescription ? formData.shortDescription : undefined,
      // Only include condition if checkbox is checked
      condition: includeCondition ? formData.condition : undefined,
    };

    mutation.mutate(dataToSubmit);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form className="space-y-6">
      {/* Top Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, 'draft')}
          disabled={mutation.isPending}
          className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, 'published')}
          disabled={mutation.isPending}
          className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {mutation.isPending
            ? isEdit
              ? 'Updating...'
              : 'Publishing...'
            : isEdit
              ? 'Update'
              : 'Publish Now'}
        </button>
      </div>
      {/* Top Section: Title, Descriptions & Images */}
      <div className="bg-white shadow p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Title and Descriptions (3 columns on large screens) */}
          <div className="lg:col-span-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g., Original Victorian Era Oil Painting"
                required
              />
            </div>

            {/* Checkbox to include short description */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeShortDescription"
                checked={includeShortDescription}
                onChange={(e) => setIncludeShortDescription(e.target.checked)}
                className="h-4 w-4 text-black border-gray-300 focus:ring-black"
              />
              <label
                htmlFor="includeShortDescription"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Add a short description
              </label>
              <span
                className="inline-block text-gray-400 hover:text-gray-600 cursor-help"
                title="A brief description (1-2 sentences) that will appear in product listings and search results. The full description will be shown on the product detail page."
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
            </div>

            {/* Short Description Field - Conditionally Rendered */}
            {includeShortDescription && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description
                </label>
                <textarea
                  value={formData.shortDescription || ''}
                  onChange={(e) => handleChange('shortDescription', e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black h-20"
                  placeholder="Brief description for listings (1-2 sentences)"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.shortDescription?.length || 0}/200 characters
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={formData.description || ''}
                onChange={(value) => handleChange('description', value)}
                placeholder="Detailed description of the item..."
              />
            </div>
          </div>

          {/* Right: Images (1 column on large screens) */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images <span className="text-red-500">*</span>
            </label>
            <ImageUploader images={images} onChange={setImages} />
          </div>
        </div>
      </div>

      {/* Price & Basic Info Section */}
      <div className="bg-white shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Pricing & Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (USD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="includeCondition"
                checked={includeCondition}
                onChange={(e) => setIncludeCondition(e.target.checked)}
                className="h-4 w-4 text-black border-gray-300 focus:ring-black"
              />
              <label
                htmlFor="includeCondition"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Add condition?
              </label>
            </div>
            {includeCondition && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => handleChange('condition', e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {PRODUCT_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Categories Section - Checkboxes */}
      <div className="bg-white shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(categoriesData?.data || []).map((category: any) => (
            <label
              key={category.id}
              className="flex items-center gap-2 p-3 border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setCategoryIds([...categoryIds, category.id]);
                  } else {
                    setCategoryIds(categoryIds.filter((id) => id !== category.id));
                  }
                }}
                className="h-4 w-4 text-black border-gray-300 focus:ring-black"
              />
              <span className="text-sm text-gray-900">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Item Details */}
      <div className="bg-white shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Item Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Artist/Creator</label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => handleChange('artist', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year Made</label>
            <input
              type="text"
              value={formData.yearMade}
              onChange={(e) => handleChange('yearMade', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., 1850 or 1850-1860"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Materials</label>
          <input
            type="text"
            value={formData.materials}
            onChange={(e) => handleChange('materials', e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="e.g., Oil on Canvas, Brass, Paper"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
          <input
            type="text"
            value={formData.dimensions}
            onChange={(e) => handleChange('dimensions', e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            placeholder='e.g., 24" x 36" x 2"'
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, 'draft')}
          disabled={mutation.isPending}
          className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, 'published')}
          disabled={mutation.isPending}
          className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {mutation.isPending
            ? isEdit
              ? 'Updating...'
              : 'Publishing...'
            : isEdit
              ? 'Update'
              : 'Publish Now'}
        </button>
      </div>
    </form>
  );
}
