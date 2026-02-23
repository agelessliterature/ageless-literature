'use client';

import { useState, useRef, useEffect } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface ImageItem {
  url: string;
  publicId: string;
  thumbnail?: string;
}

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, maxImages = 10 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  // Use a ref to always have the latest images array, avoiding stale closure issues
  // when multiple uploads fire onSuccess in quick succession
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleUploadSuccess = (result: any) => {
    const newImage: ImageItem = {
      url: result.info.secure_url,
      publicId: result.info.public_id,
      thumbnail: result.info.thumbnail_url || result.info.secure_url,
    };
    const updated = [...imagesRef.current, newImage];
    imagesRef.current = updated;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {images.map((image, index) => (
          <div key={index} className="relative group border rounded overflow-hidden aspect-[4/3]">
            <img
              src={image.url}
              alt={`Upload ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  title="Move up"
                >
                  <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-base" />
                </button>
              )}
              {index < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  title="Move down"
                >
                  <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-base" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
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
        <CldUploadWidget
          uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ageless-lit'}
          options={{ multiple: true, maxFiles: maxImages - images.length }}
          onSuccess={handleUploadSuccess}
          onOpen={() => setUploading(true)}
          onClose={() => setUploading(false)}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition disabled:opacity-50"
            >
              <FontAwesomeIcon icon={['fal', 'upload']} className="text-3xl text-gray-400 mb-2" />
              <p className="text-gray-600">
                {uploading
                  ? 'Uploading...'
                  : 'Click to upload images'}
              </p>
            </button>
          )}
        </CldUploadWidget>
      )}
    </div>
  );
}
