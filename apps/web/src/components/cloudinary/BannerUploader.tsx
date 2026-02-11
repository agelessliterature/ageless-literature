'use client';

/**
 * BannerUploader Component
 * Custom branded banner uploader with cropping and direct Cloudinary upload
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface BannerUploaderProps {
  currentBanner?: string | null;
  onUploadSuccess: (result: { url: string; publicId: string }) => void;
  onUploadError?: (error: any) => void;
  folder: string;
  aspectRatio?: '3:1' | '4:1' | '16:9';
  buttonText?: string;
  className?: string;
  showPreview?: boolean;
}

export default function BannerUploader({
  currentBanner,
  onUploadSuccess,
  onUploadError,
  folder,
  aspectRatio = '4:1',
  buttonText = 'Upload Banner',
  className = '',
  showPreview = true,
}: BannerUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentBanner || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentBanner || null);
  }, [currentBanner]);

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case '3:1':
        return 3;
      case '4:1':
        return 4;
      case '16:9':
        return 16 / 9;
      default:
        return 4;
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas is empty'));
          }
        },
        'image/jpeg',
        0.95,
      );
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, or WebP.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10000000) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels || !selectedFile) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName) {
      setError(
        'Cloudinary cloud name is not configured. Please add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to your .env file.',
      );
      return;
    }

    if (!uploadPreset) {
      setError(
        'Cloudinary upload preset is not configured. Please add NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env file.',
      );
      return;
    }

    setUploading(true);
    setShowCropper(false);

    try {
      // Create cropped image
      const croppedBlob = await createCroppedImage(imageToCrop, croppedAreaPixels);

      // Create file from blob
      const croppedFile = new File([croppedBlob], selectedFile.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Create preview
      const previewUrl = URL.createObjectURL(croppedBlob);
      setPreview(previewUrl);

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `Upload failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setPreview(data.secure_url);
      onUploadSuccess({ url: data.secure_url, publicId: data.public_id });
      setUploading(false);
      setImageToCrop(null);
      setSelectedFile(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload banner. Please try again.';
      setError(errorMessage);
      setUploading(false);
      setImageToCrop(null);
      setSelectedFile(null);
      if (onUploadError) {
        onUploadError(err);
      }
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setSelectedFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`banner-uploader ${className}`}>
      {showPreview && preview && !showCropper && (
        <div className="relative mb-4 w-full group">
          <div className="relative w-full border-2 border-gray-300 shadow-sm group-hover:border-secondary transition-colors">
            <Image
              src={preview}
              alt="Banner Preview"
              width={800}
              height={200}
              className="w-full h-auto object-cover"
              style={{
                aspectRatio: aspectRatio.replace(':', '/'),
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white py-0.5 px-2 hover:bg-red-600 shadow-sm transition"
              title="Remove banner"
            >
              <FontAwesomeIcon icon={['fal', 'times']} className="text-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {showCropper && imageToCrop && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={['fal', 'crop']} className="text-base mr-2 text-secondary" />
                Crop Banner
              </h3>
              <button onClick={handleCropCancel} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
              </button>
            </div>

            <div className="relative h-96 bg-gray-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={getAspectRatio()}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCropCancel}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="px-4 py-2 bg-secondary text-white text-sm font-medium hover:bg-opacity-90 transition flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={['fal', 'check']} className="text-base" />
                  Crop & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
      >
        {uploading ? (
          <>
            <FontAwesomeIcon icon={['fal', 'spinner-third']} className="text-base animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={['fal', 'image']} className="text-base" />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="mt-3 bg-gray-50 px-3 py-2 border border-gray-200">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Max size:</span> 10MB •{' '}
          <span className="font-semibold">Recommended:</span>{' '}
          {aspectRatio === '4:1' ? '2000x500' : aspectRatio === '3:1' ? '1800x600' : '1920x1080'}px
        </p>
      </div>
    </div>
  );
}
