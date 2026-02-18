'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { MultiImageUploader } from '@/components/cloudinary';
import AuctionModal from '@/components/modals/AuctionModal';
import RichTextEditor from '@/components/forms/RichTextEditor';
import { Category } from '@/types/Product';
import { getApiUrl } from '@/lib/api-url';

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const API_URL = getApiUrl();

  const productId = params.id as string;
  const productType = searchParams.get('type') || 'product';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<
    Array<{ url: string; publicId?: string; thumbnail?: string }>
  >([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [activeAuction, setActiveAuction] = useState<any>(null);
  const [checkingAuction, setCheckingAuction] = useState(false);
  const [includeShortDescription, setIncludeShortDescription] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    salePrice: '',
    quantity: '',
    condition: '',
    conditionNotes: '',
    category: '',
    description: '',
    shortDescription: '',
    vendorId: '',
    status: 'draft',
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
      fetchProduct();
      fetchActiveAuction();
    }
  }, [status, productId]);

  const fetchVendors = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${API_URL}/api/admin/vendors?page=1&limit=1000`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVendors(data.data);
      } else if (data.success && data.data?.vendors && Array.isArray(data.data.vendors)) {
        setVendors(data.data.vendors);
      } else {
        console.error('Unexpected vendors data structure:', data);
        setVendors([]);
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

  const fetchActiveAuction = async () => {
    try {
      setCheckingAuction(true);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const url = `${API_URL}/api/auctions/active?productId=${productId}&productType=${productType}`;

      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success && data.data) {
        setActiveAuction(data.data);
      } else {
        setActiveAuction(null);
      }
    } catch (err) {
      console.error('Failed to check for active auction:', err);
      setActiveAuction(null);
    } finally {
      setCheckingAuction(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${API_URL}/api/admin/products/${productId}?type=${productType}`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        const product = data.data;
        setProduct(product); // Store the full product object
        setImages(product.images || []);
        // Set categoryIds from product.categories
        setCategoryIds(product.categories?.map((c: any) => c.id) || []);
        // Extract HTML from JSONB format if needed
        const descriptionHtml =
          typeof product.description === 'object'
            ? product.description?.en || product.description?.html || ''
            : product.description || '';

        // Short description should be plain text - strip any HTML if present
        let shortDescText =
          typeof product.shortDescription === 'object'
            ? product.shortDescription?.en || product.shortDescription?.html || ''
            : product.shortDescription || product.short_description || '';

        // Strip HTML tags from short description
        shortDescText = shortDescText.replace(/<[^>]*>/g, '').trim();

        setFormData({
          title: product.title || '',
          price: product.price?.toString() || '',
          salePrice: product.salePrice?.toString() || product.sale_price?.toString() || '',
          quantity: product.quantity?.toString() || '',
          condition: product.condition || '',
          conditionNotes: product.conditionNotes || product.condition_notes || '',
          category: product.category || '',
          description: descriptionHtml,
          shortDescription: shortDescText,
          vendorId: product.vendorId || product.vendor_id || '',
          status: product.status || 'draft',
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
          author: product.author || '',
          isbn: product.isbn || '',
          sku: product.sku || '',
          artist: product.artist || '',
          yearMade: product.yearMade?.toString() || product.year_made?.toString() || '',
          origin: product.origin || '',
          materials: product.materials || '',
          dimensions: product.dimensions || '',
          weight: product.weight?.toString() || '',
          isSigned: product.isSigned || product.is_signed || false,
          isAuthenticated: product.isAuthenticated || product.is_authenticated || false,
        });
        // Set includeShortDescription based on whether product has a short description
        setIncludeShortDescription(!!shortDescText);
      } else {
        setError(data.message || 'Failed to load product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
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

      // Prepare data to submit, conditionally including shortDescription
      const submitData = {
        type: productType,
        ...formData,
        // Only include shortDescription if checkbox is checked
        shortDescription: includeShortDescription ? formData.shortDescription : '',
        images,
        categoryIds,
      };

      const res = await fetch(`${API_URL}/api/admin/products/${productId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Product updated successfully!');
        setTimeout(() => {
          router.push('/admin/products');
        }, 1500);
      } else {
        setError(data.message || 'Failed to update product');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-primary" />
          <p className="text-gray-600 mt-4">Loading product...</p>
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/products')}
            className="text-gray-600 hover:text-gray-900"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Edit {productType === 'book' ? 'Book' : 'Product'}
            </h1>
            <p className="text-gray-600 mt-1">Admin - Products - Edit Product</p>
          </div>
        </div>

        {product && (
          <button
            type="button"
            onClick={() => {
              if (activeAuction) {
                router.push(`/admin/auctions/${activeAuction.id}`);
              } else {
                setShowAuctionModal(true);
              }
            }}
            disabled={checkingAuction}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon
              icon={['fal', checkingAuction ? 'spinner-third' : 'gavel']}
              spin={checkingAuction}
            />
            {checkingAuction ? 'Checking...' : activeAuction ? 'Edit Auction' : 'Create Auction'}
          </button>
        )}
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
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6">
        {/* Top Section: Title, Description & Images */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Left: Title and Descriptions (3 columns on large screens) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Title */}
            <div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  placeholder="Brief description for listings (1-2 sentences, plain text)"
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.shortDescription.length}/200 characters
                </p>
              </div>
            )}

            {/* Full Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Detailed description of the item..."
              />
            </div>
          </div>

          {/* Right: Photo Uploads (1 column on large screens) */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images *</label>
            <MultiImageUploader
              images={images}
              onChange={setImages}
              folder={`products/${productType}/${productId}`}
              maxImages={10}
            />
            {images.length === 0 && (
              <p className="text-xs text-red-600 mt-1">At least one image is required</p>
            )}
          </div>
        </div>

        {/* Price & Basic Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
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
                placeholder="Discounted price"
                className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
              />
              {formData.salePrice &&
                parseFloat(formData.salePrice) >= parseFloat(formData.price || '0') && (
                  <p className="text-xs text-red-600 mt-1">
                    Sale price should be less than regular price
                  </p>
                )}
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
              <option value="">Select Condition</option>
              <option value="Fine">Fine</option>
              <option value="Near Fine">Near Fine</option>
              <option value="Very Good">Very Good</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
        </div>

        {/* Categories Section - Checkboxes */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">Categories</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((category) => (
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

        {/* Additional Fields Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Book-specific fields */}
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

          {/* Product-specific fields */}
          {productType === 'product' && (
            <>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Artist</label>
                <input
                  type="text"
                  name="artist"
                  value={formData.artist}
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

              <div className="flex items-center gap-4">
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
            </>
          )}

          {productType === 'product' && (
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
          )}

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
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {productType === 'product' && formData.condition && (
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

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <FontAwesomeIcon icon={['fal', 'spinner-third']} spin />
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fal', 'save']} />
                Save Changes
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Auction Modal */}
      {showAuctionModal && product && (
        <AuctionModal
          isOpen={showAuctionModal}
          onClose={() => setShowAuctionModal(false)}
          item={product}
          itemType={productType as 'book' | 'product'}
        />
      )}
    </div>
  );
}
