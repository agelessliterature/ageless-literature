'use client';

import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';

interface ImageItem {
  url: string;
  publicId: string;
  thumbnail?: string;
}

interface NativeImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  vendorId: string;
  productType?: 'book' | 'product';
}

export default function NativeImageUploader({
  images,
  onChange,
  maxImages = 10,
  vendorId,
  productType = 'product',
}: NativeImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!vendorId) {
      alert('Please select a vendor first before uploading images');
      return;
    }

    const remainingSlots = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vendorId', vendorId);
        formData.append('productType', productType);

        const response = await fetch(getApiUrl('api/upload'), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return {
          url: data.url,
          publicId: data.publicId,
          thumbnail: data.thumbnail || data.url,
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedImages]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload one or more images');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index];

    // Delete from server
    try {
      await fetch(
        getApiUrl(`api/upload?publicId=${imageToRemove.publicId}&productType=${productType}`),
        {
          method: 'DELETE',
        },
      );
    } catch (error) {
      console.error('Delete error:', error);
    }

    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onChange(newImages);
  };

  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    onChange(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group border overflow-hidden">
            <img src={image.url} alt={`Upload ${index + 1}`} className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  className="py-2 px-4 bg-white hover:bg-gray-100"
                  title="Move up"
                >
                  <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-base" />
                </button>
              )}
              {index < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  className="py-2 px-4 bg-white hover:bg-gray-100"
                  title="Move down"
                >
                  <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-base" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-2 px-4 bg-red-500 text-white hover:bg-red-600"
                title="Remove"
              >
                <FontAwesomeIcon icon={['fal', 'trash']} className="text-base" />
              </button>
            </div>
            {index === 0 && (
              <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                Primary
              </div>
            )}
          </div>
        ))}
      </div>

      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-lg p-8 text-center transition ${
            dragOver && vendorId
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary'
          } ${uploading || !vendorId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => vendorId && !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploading || !vendorId}
          />
          <FontAwesomeIcon
            icon={uploading ? ['fal', 'spinner-third'] : ['fal', 'upload']}
            spin={uploading}
            className="text-3xl text-gray-400 mb-2"
          />
          <p className="text-gray-600">
            {!vendorId
              ? 'Select a vendor first to upload images'
              : uploading
                ? 'Uploading...'
                : `Click or drag images here (${images.length}/${maxImages})`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Supports: JPG, PNG, WEBP, GIF (max 5MB each)</p>
        </div>
      )}
    </div>
  );
}
