'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import type { IconName, IconPrefix } from '@/types/fontawesome';

interface CloudinaryImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number | 'auto';
  className?: string;
  fallbackIcon?: [IconPrefix, IconName];
  fallbackText?: string;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'cover' | 'contain';
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  reducedMotion?: boolean; // For better mobile performance
}

/**
 * CloudinaryImage component that automatically applies Cloudinary transformations
 * for optimized image delivery. Falls back to regular image handling for non-Cloudinary URLs.
 *
 * @param src - Image URL (Cloudinary or regular)
 * @param alt - Alt text for the image
 * @param width - Desired width for Cloudinary transformation
 * @param height - Desired height for Cloudinary transformation
 * @param className - CSS classes to apply
 * @param fallbackIcon - FontAwesome icon to show if no image [prefix, name]
 * @param fallbackText - Text to show if no image (used with fallbackIcon)
 * @param quality - Image quality (default: 85)
 * @param sizes - Responsive sizes attribute for Next.js Image
 * @param fill - Whether to use fill mode (ignores width/height)
 * @param objectFit - Object fit style (default: 'cover')
 * @param priority - Load image with high priority (disables lazy loading)
 * @param loading - Loading strategy: 'lazy' (default) or 'eager'
 * @param placeholder - Show blur placeholder while loading (default: 'blur' for Cloudinary)
 */
export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackIcon = ['fal', 'image'],
  fallbackText,
  quality = 75,
  sizes,
  fill = false,
  objectFit = 'cover',
  priority = false,
  loading,
  placeholder,
  reducedMotion = false,
}: CloudinaryImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imageRef = useRef<HTMLDivElement>(null);

  // If no src, show fallback
  if (!src || hasError) {
    return (
      <div
        ref={imageRef}
        className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 transition-colors ${className}`}
        style={!fill ? { width, height: height === 'auto' ? 'auto' : height } : undefined}
      >
        <FontAwesomeIcon icon={fallbackIcon} className="text-4xl mb-2" />
        {fallbackText && <span className="text-xs text-center px-2">{fallbackText}</span>}
      </div>
    );
  }

  // Apply Cloudinary transformation if it's a Cloudinary URL
  let optimizedSrc = src;
  const isCloudinary =
    typeof src === 'string' && src.includes('cloudinary.com') && src.includes('/upload/');

  if (isCloudinary) {
    // Check if transformations already exist
    if (!src.match(/\/upload\/[^/]*c_/)) {
      // Build transformation string with progressive loading, auto format, and DPR
      // Enhanced for mobile performance
      const baseTransforms = 'q_auto:best,f_auto,fl_progressive,dpr_auto';

      // Additional mobile-specific optimizations
      const mobileOptimizations = 'fl_immutable_cache,fl_preserve_transparency';

      if (height === 'auto') {
        // Use c_scale for auto height (maintains aspect ratio)
        optimizedSrc = src.replace(
          /\/upload\//,
          `/upload/c_scale,w_${width},${baseTransforms},${mobileOptimizations}/`,
        );
      } else {
        // Use c_fill for specific dimensions with smart gravity
        // Add face detection for better cropping
        optimizedSrc = src.replace(
          /\/upload\//,
          `/upload/c_fill,w_${width},h_${height},g_face:auto,${baseTransforms},${mobileOptimizations}/`,
        );
      }
    }
  }

  // Generate low-quality blur placeholder for Cloudinary images
  const blurDataURL =
    isCloudinary && (placeholder === 'blur' || (placeholder === undefined && isCloudinary))
      ? src.replace(/\/upload\//, '/upload/w_20,q_auto:low,f_auto,e_blur:1000/')
      : undefined;

  // Determine loading strategy with mobile considerations
  const loadingStrategy = loading || (priority ? 'eager' : 'lazy');
  const usePlaceholder = blurDataURL ? 'blur' : 'empty';

  // Enhanced mobile-specific sizes if not provided
  const mobileSizes =
    sizes ||
    (fill
      ? '(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw'
      : width <= 400
        ? '(max-width: 640px) 100vw, 400px'
        : `(max-width: 640px) 100vw, ${width}px`);

  // Image event handlers for better UX
  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Enhanced class names with reduced motion support
  const imageClasses = `
    ${className} 
    object-${objectFit}
    ${isLoading ? 'animate-pulse' : ''}
    ${reducedMotion ? '' : 'transition-opacity duration-300'}
    ${isLoading && !reducedMotion ? 'opacity-75' : 'opacity-100'}
  `
    .trim()
    .replace(/\s+/g, ' ');

  // Always use Next.js Image component for better optimization
  // For fill mode
  if (fill) {
    return (
      <div ref={imageRef} className="relative">
        <Image
          src={optimizedSrc}
          alt={alt}
          fill
          quality={quality}
          sizes={mobileSizes}
          className={imageClasses}
          unoptimized={!isCloudinary}
          priority={priority}
          loading={loadingStrategy}
          placeholder={usePlaceholder}
          blurDataURL={blurDataURL}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // For explicit dimensions
  return (
    <div ref={imageRef} className="relative">
      <Image
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height === 'auto' ? width : height}
        quality={quality}
        sizes={mobileSizes}
        className={imageClasses}
        unoptimized={!isCloudinary}
        priority={priority}
        loading={loadingStrategy}
        placeholder={usePlaceholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
