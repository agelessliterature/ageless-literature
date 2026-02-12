'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { MultiImageUploader } from '@/components/cloudinary';
import CategoryMultiSelect from '@/components/forms/CategoryMultiSelect';
import { Category } from '@/types/Product';
import { getApiUrl } from '@/lib/api-url';

interface ImageItem {
  url: string;
  publicId?: string;
  thumbnail?: string;
  blob?: Blob;
  fileName?: string;
}

export default function NewProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const API_URL = getApiUrl();

  const productType = searchParams.get('type') || 'book';

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    salePrice: '',
    quantity: '1',
    condition: 'Good',
    conditionNotes: '',
    category: '',
    description: '',
    shortDescription: '',
    vendorId: '',
    status: 'published',
    tags: '',
    // Book-specific
    author: '',
    isbn: '',
    // Product-specific
    sku: '',
    artist: '',
    yearMade: '',
    origin: '',
    materials: '',
    dimensions: '',
    weight: '',
    isSigned: false,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVendors();
      fetchCategories();
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

      const res = await fetch(`${API_URL}/api/admin/vendors?page=1&limit=1000&status=active`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      let vendorsList = [];
      if (data.success && Array.isArray(data.data)) {
        vendorsList = data.data;
      } else if (data.success && data.data?.vendors && Array.isArray(data.data.vendors)) {
        vendorsList = data.data.vendors;
      } else {
        console.error('Unexpected vendors data structure:', data);
      }

      // Filter to only active vendors
      vendorsList = vendorsList.filter((v) => v.status === 'active' || v.status === 'approved');
      setVendors(vendorsList);

      // Auto-select current user's vendor if they have one
      if (vendorsList.length > 0 && session?.user?.id) {
        const userVendor = vendorsList.find(
          (v) => v.user?.id === session.user.id || v.userId === session.user.id,
        );
        if (userVendor && !formData.vendorId) {
          setFormData((prev) => ({ ...prev, vendorId: userVendor.id }));
        }
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
      setVendors([]);
    }
  };

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      // First create the product to get the ID
      const res = await fetch(`${API_URL}/api/admin/products`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          type: productType,
          ...formData,
          images: [], // Empty for now
          categoryIds,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || `Failed to create ${productType === 'book' ? 'book' : 'product'}`);
        return;
      }

      const productId = data.data.id;
      const vendorId = formData.vendorId || 'admin';

      // Upload images to Cloudinary with proper folder structure
      const uploadedImages = await Promise.all(
        images.map(async (image) => {
          if (image.blob) {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
            const folder = `uploads/${productType === 'book' ? 'books' : 'products'}/${vendorId}/${productId}`;

            const formData = new FormData();
            formData.append('file', image.blob, image.fileName);
            formData.append('upload_preset', uploadPreset!);
            formData.append('folder', folder);

            const response = await fetch(
              `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
              {
                method: 'POST',
                body: formData,
              },
            );

            const uploadData = await response.json();
            return {
              url: uploadData.secure_url,
              publicId: uploadData.public_id,
              thumbnail: uploadData.thumbnail_url || uploadData.secure_url,
            };
          }
          return image;
        }),
      );

      // Update product with uploaded images
      const updateRes = await fetch(`${API_URL}/api/admin/products/${productId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          type: productType,
          ...formData,
          images: uploadedImages,
        }),
      });

      const updateData = await updateRes.json();

      if (updateData.success) {
        setSuccess(`${productType === 'book' ? 'Book' : 'Product'} created successfully!`);
        setTimeout(() => {
          router.push('/admin/products');
        }, 1500);
      } else {
        setError(updateData.message || 'Failed to update images');
      }
    } catch (err: any) {
      setError(err.message || `Failed to create ${productType === 'book' ? 'book' : 'product'}`);
    } finally {
      setSaving(false);
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/products')}
          className="text-gray-600 hover:text-gray-900"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create New {productType === 'book' ? 'Book' : 'Product'}
          </h1>
          <p className="text-gray-600 mt-1">Admin - Products - Create New</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-6">{error}</div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 mb-6">
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'images'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Images
            </button>
            {productType === 'product' && (
              <button
                type="button"
                onClick={() => setActiveTab('additional')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'additional'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Additional Info
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              {/* Book Author */}
              {productType === 'book' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              )}

              {/* Product Artist */}
              {productType === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Artist</label>
                  <input
                    type="text"
                    name="artist"
                    value={formData.artist}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              )}

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              {productType === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="Optional discount price"
                    className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <CategoryMultiSelect
                  selectedCategories={categoryIds}
                  onChange={setCategoryIds}
                  categories={categories}
                  label="Categories"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor *</label>
                <select
                  name="vendorId"
                  value={formData.vendorId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.shopName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows={2}
                  maxLength={200}
                  placeholder="Brief description for listings"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.shortDescription.length}/200 characters
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Detailed description of the item"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              {formData.condition && formData.condition !== 'New' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition Notes
                  </label>
                  <textarea
                    name="conditionNotes"
                    value={formData.conditionNotes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Detailed description of the item's condition"
                    className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              )}
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images *
              </label>
              <MultiImageUploader
                images={images}
                onChange={setImages}
                maxImages={10}
                deferredUpload={true}
                buttonText="Add Images"
              />
              {images.length === 0 && (
                <p className="text-xs text-red-600 mt-1">At least one image is required</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Images will be uploaded to Cloudinary when you create the product
              </p>
            </div>
          )}

          {/* Additional Info Tab (Products Only) */}
          {activeTab === 'additional' && productType === 'product' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year Made</label>
                <input
                  type="text"
                  name="yearMade"
                  value={formData.yearMade}
                  onChange={handleChange}
                  placeholder="e.g., 1950"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  placeholder="e.g., France, Italy"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Materials</label>
                <input
                  type="text"
                  name="materials"
                  value={formData.materials}
                  onChange={handleChange}
                  placeholder="e.g., Wood, Metal, Leather"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                <input
                  type="text"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                  placeholder="e.g., 10 x 12 x 5 inches"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                <input
                  type="text"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="e.g., 2 lbs"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="Comma-separated tags"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div className="flex items-center gap-6 md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isSigned"
                    checked={formData.isSigned}
                    onChange={handleChange}
                    className="text-base text-blue-600 border-gray-300 focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Is Signed</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isAuthenticated"
                    checked={formData.isAuthenticated}
                    onChange={handleChange}
                    className="text-base text-blue-600 border-gray-300 focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Is Authenticated</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || images.length === 0}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-base" />
                Creating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fal', 'save']} className="text-base" />
                Create {productType === 'book' ? 'Book' : 'Product'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
