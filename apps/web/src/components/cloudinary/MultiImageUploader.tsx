'use client';

/**
 * MultiImageUploader Component
 * Native file upload with cropping and direct Cloudinary upload
 * Supports multiple images with sorting and removal
 */

import { useState, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface ImageItem {
  url: string;
  publicId?: string;
  thumbnail?: string;
  blob?: Blob; // For deferred uploads
  fileName?: string;
}

interface MultiImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  folder?: string;
  maxImages?: number;
  aspectRatio?: '1:1' | '4:3' | '16:9';
  buttonText?: string;
  className?: string;
  deferredUpload?: boolean; // If true, don't upload immediately
}

export default function MultiImageUploader({
  images,
  onChange,
  folder = 'products',
  maxImages = 10,
  aspectRatio = '1:1',
  buttonText = 'Upload Images',
  className = '',
  deferredUpload = false,
}: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case '1:1':
        return 1;
      case '4:3':
        return 4 / 3;
      case '16:9':
        return 16 / 9;
      default:
        return 1;
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const validFiles: File[] = [];

    // Validate all files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type for ${file.name}. Please upload JPG, PNG, WebP, or GIF.`);
        continue;
      }

      if (file.size > 5000000) {
        setError(`${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }

      // Check if we have room for more images
      if (images.length + validFiles.length >= maxImages) {
        setError(`Maximum ${maxImages} images allowed.`);
        break;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Set up queue and start with first file
    setFileQueue(validFiles);
    setCurrentFileIndex(0);
    setError(null);

    // Load first file for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setSelectedFile(validFiles[0]);
      setShowCropper(true);
    };
    reader.readAsDataURL(validFiles[0]);
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels || !selectedFile) return;

    setUploading(true);

    try {
      // Create cropped image
      const croppedBlob = await createCroppedImage(imageToCrop, croppedAreaPixels);

      let newImage: ImageItem;

      if (deferredUpload) {
        // Store blob for later upload
        const previewUrl = URL.createObjectURL(croppedBlob);
        newImage = {
          url: previewUrl,
          blob: croppedBlob,
          fileName: selectedFile.name,
        };
      } else {
        // Immediate upload to Cloudinary
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

        // Create file from blob
        const croppedFile = new File([croppedBlob], selectedFile.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

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
          let errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
          } catch {
            // Use the default error message if parsing fails
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();

        newImage = {
          url: data.secure_url,
          publicId: data.public_id,
          thumbnail: data.thumbnail_url || data.secure_url,
        };
      }

      onChange([...images, newImage]);

      // Check if there are more files in the queue
      const nextIndex = currentFileIndex + 1;
      if (nextIndex < fileQueue.length) {
        // Load next file for cropping
        setCurrentFileIndex(nextIndex);
        const nextFile = fileQueue[nextIndex];
        setSelectedFile(nextFile);

        const reader = new FileReader();
        reader.onload = () => {
          setImageToCrop(reader.result as string);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setUploading(false);
          setShowCropper(true);
        };
        reader.readAsDataURL(nextFile);
      } else {
        // All files processed
        setUploading(false);
        setShowCropper(false);
        setImageToCrop(null);
        setSelectedFile(null);
        setFileQueue([]);
        setCurrentFileIndex(0);
        setError(null);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
      setError(errorMessage);
      setUploading(false);
      setShowCropper(false);
      setImageToCrop(null);
      setSelectedFile(null);
      setFileQueue([]);
      setCurrentFileIndex(0);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setSelectedFile(null);
    setFileQueue([]);
    setCurrentFileIndex(0);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`multi-image-uploader ${className}`}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group border-2 border-gray-300 shadow-sm overflow-hidden"
            >
              <Image
                src={image.url}
                alt={`Upload ${index + 1}`}
                width={200}
                height={200}
                className="w-full h-40 object-cover"
                unoptimized
              />

              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 shadow-sm">
                  Primary
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setViewerImageIndex(index);
                    setShowImageViewer(true);
                  }}
                  className="p-2 bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm"
                  title="View image"
                >
                  <FontAwesomeIcon icon={['fal', 'eye']} className="text-base" />
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    className="p-2 bg-white text-gray-700 hover:bg-gray-100 transition shadow-sm"
                    title="Move up"
                  >
                    <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-base" />
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    className="p-2 bg-white text-gray-700 hover:bg-gray-100 transition shadow-sm"
                    title="Move down"
                  >
                    <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-base" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-2 bg-red-500 text-white hover:bg-red-600 transition shadow-sm"
                  title="Remove"
                >
                  <FontAwesomeIcon icon={['fal', 'trash']} className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cropper Modal */}
      {showCropper && imageToCrop && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={['fal', 'crop']} className="text-base mr-2 text-primary" />
                Crop Image{' '}
                {fileQueue.length > 1 && `(${currentFileIndex + 1} of ${fileQueue.length})`}
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
                  disabled={uploading}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <FontAwesomeIcon
                        icon={['fal', 'spinner-third']}
                        className="text-base animate-spin"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={['fal', 'check']} className="text-base" />
                      Crop & Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && images.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center"
          onClick={() => setShowImageViewer(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowImageViewer(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-[70] bg-black bg-opacity-50 w-10 h-10 flex items-center justify-center transition"
          >
            <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
          </button>

          {/* Previous Button */}
          {viewerImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerImageIndex(viewerImageIndex - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-[70] bg-black bg-opacity-50 w-12 h-12 flex items-center justify-center transition"
            >
              <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-3xl" />
            </button>
          )}

          {/* Next Button */}
          {viewerImageIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerImageIndex(viewerImageIndex + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-[70] bg-black bg-opacity-50 w-12 h-12 flex items-center justify-center transition"
            >
              <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-3xl" />
            </button>
          )}

          {/* Image Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2">
            {viewerImageIndex + 1} / {images.length}
          </div>

          {/* Image */}
          <div
            className="relative w-full h-full flex items-center justify-center p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[viewerImageIndex].url}
              alt={`Image ${viewerImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Upload Button */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
        >
          {uploading ? (
            <>
              <FontAwesomeIcon icon={['fal', 'spinner-third']} className="text-base animate-spin" />
              <span>{deferredUpload ? 'Processing...' : 'Uploading...'}</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={['fal', 'camera']} className="text-base" />
              <span>
                {buttonText} ({images.length}/{maxImages})
              </span>
            </>
          )}
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-3 bg-gray-50 px-3 py-2 border border-gray-200">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Max size:</span> 5MB •{' '}
          <span className="font-semibold">Formats:</span> JPG, PNG, WebP, GIF •{' '}
          <span className="font-semibold">First image:</span> Primary
        </p>
      </div>
    </div>
  );
}
