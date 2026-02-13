'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import ImageUploader from '@/components/shared/ImageUploader';
import { BookFormData, Book } from '@/types/Book';
import api from '@/lib/api';
import { getApiUrl } from '@/lib/api-url';
import RichTextEditor from '@/components/forms/RichTextEditor';

const BOOK_CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'];
const BOOK_BINDINGS = ['Hardcover', 'Softcover', 'Leather', 'Cloth', 'Paper'];

interface BookFormProps {
  book?: Book;
  isEdit?: boolean;
}

export default function BookForm({ book, isEdit = false }: BookFormProps) {
  const router = useRouter();
  const API_URL = getApiUrl();
  const [images, setImages] = useState<
    Array<{ url: string; publicId: string; thumbnail?: string }>
  >(book?.images || []);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>(
    [],
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    book?.categories?.map((c) => c.id) || [],
  );
  const [includeShortDescription, setIncludeShortDescription] = useState<boolean>(
    !!book?.shortDescription,
  );
  const [formData, setFormData] = useState<Partial<BookFormData>>({
    title: book?.title || '',
    author: book?.author || '',
    description:
      typeof book?.description === 'object'
        ? (book?.description as any)?.en || (book?.description as any)?.html || ''
        : book?.description || '',
    shortDescription: (typeof book?.shortDescription === 'object'
      ? (book?.shortDescription as any)?.en || (book?.shortDescription as any)?.html || ''
      : book?.shortDescription || ''
    )
      .replace(/<[^>]*>/g, '')
      .trim(),
    price: book?.price?.toString() || '',
    condition: book?.condition || 'Good',
    quantity: book?.quantity || 1,
    isbn: book?.isbn || '',
    publisher: book?.publisher || '',
    publicationYear: book?.publicationYear || undefined,
    edition: book?.edition || '',
    language: book?.language || 'English',
    binding: book?.binding || 'Hardcover',
    status: (book?.status as 'draft' | 'active' | 'sold') || 'draft',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: BookFormData) => {
      if (isEdit && book?.id) {
        const response = await api.put(`/vendor/products/${book.id}`, data);
        return response.data;
      } else {
        const response = await api.post('/vendor/products', data);
        return response.data;
      }
    },
    onSuccess: () => {
      router.push('/vendor/books');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'An error occurred');
    },
  });

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'active') => {
    e.preventDefault();

    if (!formData.title || !formData.author || !formData.description || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      alert('Please add at least one image');
      return;
    }

    const dataToSubmit: BookFormData = {
      ...(formData as BookFormData),
      categoryIds: selectedCategoryIds,
      images,
      status,
      // Only include shortDescription if checkbox is checked
      shortDescription: includeShortDescription ? formData.shortDescription : undefined,
    };

    mutation.mutate(dataToSubmit);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form className="space-y-6">
      {/* Top Section: Title, Author, Descriptions & Images */}
      <div className="bg-white shadow p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Title, Author and Descriptions (3 columns on large screens) */}
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
                placeholder="e.g., Pride and Prejudice"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g., Jane Austen"
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

            {/* Short Description - Conditionally Rendered */}
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
                placeholder="Detailed description of the book..."
              />
            </div>
          </div>

          {/* Right: Images (1 column on large screens) */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images <span className="text-red-500">*</span>
            </label>
            <ImageUploader images={images} onChange={setImages} maxImages={10} />
            <p className="text-xs text-gray-500 mt-2">
              Upload up to 10 images. The first image will be the primary image.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing & Basic Info */}
      <div className="bg-white shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Pricing & Categories</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
            <div className="border border-gray-300 rounded max-h-48 overflow-y-auto p-2">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategoryIds((prev) => [...prev, cat.id]);
                      } else {
                        setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                      }
                    }}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-gray-500 py-2">Loading categories...</p>
              )}
            </div>
            {selectedCategoryIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedCategoryIds.length} category{selectedCategoryIds.length > 1 ? 'ies' : 'y'}{' '}
                selected
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.condition}
              onChange={(e) => handleChange('condition', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {BOOK_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (USD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value))}
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
              onChange={(e) => handleChange('quantity', parseInt(e.target.value))}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Book Details */}
      <div className="bg-white shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Book Details</h2>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
            <input
              type="text"
              value={formData.publisher}
              onChange={(e) => handleChange('publisher', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., Penguin Books"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Publication Year</label>
            <input
              type="text"
              value={formData.publicationYear}
              onChange={(e) => handleChange('publicationYear', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., 1813"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Edition</label>
            <input
              type="text"
              value={formData.edition}
              onChange={(e) => handleChange('edition', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., First Edition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., English"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Binding</label>
            <select
              value={formData.binding}
              onChange={(e) => handleChange('binding', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {BOOK_BINDINGS.map((binding) => (
                <option key={binding} value={binding}>
                  {binding}
                </option>
              ))}
            </select>
          </div>
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
          onClick={(e) => handleSubmit(e, 'active')}
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
