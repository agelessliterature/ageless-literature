'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';

interface Product {
  id: string;
  title: string;
  price: number;
  type: 'book' | 'product';
  images: any[];
  author?: string;

  sku?: string;
  vendor: {
    id: string;
    shopName: string;
    shopUrl: string;
  } | null;
  condition?: string;
  category?: string;
  quantity?: number;
  status: string;
  description?: string;
  shortDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  getStatusBadgeColor: (status: string) => string;
}

export default function ProductDetailsDrawer({
  isOpen,
  onClose,
  product,
  onEdit,
  onDelete,
  formatPrice,
  formatDate,
  getStatusBadgeColor,
}: ProductDetailsDrawerProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  if (!isOpen || !product) return null;

  const images = product.images || [];
  const currentImage = images[selectedImageIndex];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={onClose}>
        <div
          className="w-full max-w-2xl bg-white h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={['fal', 'times']} className="text-lg" />
              </button>
            </div>

            {/* Images Gallery */}
            {images.length > 0 && (
              <div className="mb-6">
                {/* Main Image */}
                <div
                  className="relative w-full h-96 bg-gray-100 border border-gray-200 mb-4 cursor-pointer group"
                  onClick={() => setShowImageModal(true)}
                >
                  <CloudinaryImage
                    src={currentImage?.imageUrl || currentImage?.url || currentImage}
                    alt={`${product.title}`}
                    width={600}
                    height={400}
                    className="object-contain w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <FontAwesomeIcon
                        icon={['fal', 'expand']}
                        className="text-3xl text-white drop-shadow-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((image: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-full h-20 bg-gray-100 border-2 transition-all ${
                          selectedImageIndex === index
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Image
                          src={image?.imageUrl || image?.url || image}
                          alt={`${product.title} thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Title</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">{product.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Type</label>
                  <p className="mt-1 text-gray-900">
                    {product.type === 'book' ? 'Book' : 'Collectible'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Price</label>
                  <p className="mt-1 text-gray-900 font-semibold">{formatPrice(product.price)}</p>
                </div>
              </div>

              {product.type === 'book' && (
                <>
                  {(product as any).author && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Author</label>
                      <p className="mt-1 text-gray-900">{(product as any).author}</p>
                    </div>
                  )}
                </>
              )}

              {product.type === 'product' && (product as any).sku && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">SKU</label>
                  <p className="mt-1 text-gray-900">{(product as any).sku}</p>
                </div>
              )}

              {product.vendor && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Vendor</label>
                  <p className="mt-1 text-gray-900">{product.vendor.shopName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {product.condition && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Condition</label>
                    <p className="mt-1 text-gray-900">{product.condition}</p>
                  </div>
                )}

                {product.category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-gray-900">{product.category}</p>
                  </div>
                )}
              </div>

              {product.quantity !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Quantity</label>
                  <p className="mt-1 text-gray-900">{product.quantity}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span
                  className={`inline-flex mt-1 px-3 py-1 text-sm font-semibold ${getStatusBadgeColor(
                    product.status,
                  )}`}
                >
                  {product.status}
                </span>
              </div>

              {(product as any).shortDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Short Description
                  </label>
                  <p className="mt-1 text-gray-600">{(product as any).shortDescription}</p>
                </div>
              )}

              {(() => {
                const prod = product as any;
                let descText = '';

                // Try fullDescription first
                if (prod.fullDescription) {
                  if (typeof prod.fullDescription === 'object') {
                    descText = prod.fullDescription?.en || prod.fullDescription?.html || '';
                  } else {
                    descText = prod.fullDescription;
                  }
                }

                // Fall back to description
                if (!descText && prod.description) {
                  if (typeof prod.description === 'object') {
                    descText = prod.description?.en || prod.description?.html || '';
                  } else {
                    descText = prod.description;
                  }
                }

                if (!descText || descText.trim() === '') {
                  return null;
                }

                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <div
                      className="mt-1 text-gray-900 prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: descText.replace(/\\n/g, '<br>').replace(/\n/g, '<br>'),
                      }}
                    />
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(product.createdAt)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(product.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <a
                href={`https://dev.agelessliterature.com/products/${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${(product as any).sid || product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors text-center"
              >
                <FontAwesomeIcon icon={['fal', 'eye']} className="mr-2" />
                View Full
              </a>
              <button
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 transition-colors"
              >
                <FontAwesomeIcon icon={['fal', 'edit']} className="mr-2" />
                Edit Product
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDelete(product);
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <FontAwesomeIcon icon={['fal', 'trash']} className="mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && currentImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <FontAwesomeIcon icon={['fal', 'times']} className="text-3xl" />
          </button>

          <div className="relative max-h-full w-full h-full flex items-center justify-center">
            <Image
              src={currentImage?.url || currentImage}
              alt={product.title}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-4 transition-all"
              disabled={images.length <= 1}
            >
              <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-2xl" />
            </button>
          )}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-4 transition-all"
              disabled={images.length <= 1}
            >
              <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-2xl" />
            </button>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 text-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
