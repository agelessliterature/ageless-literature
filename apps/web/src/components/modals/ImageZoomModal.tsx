'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{ url: string; thumbnail?: string }>;
  initialIndex: number;
}

export default function ImageZoomModal({
  isOpen,
  onClose,
  images,
  initialIndex,
}: ImageZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    resetZoom();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    resetZoom();
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 50, y: 50 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
    if (zoom <= 1.5) {
      setPosition({ x: 50, y: 50 });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    if (isDragging && zoom > 1) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPosition((prev) => ({
        x: Math.max(0, Math.min(100, prev.x + (deltaX / imageRef.current!.offsetWidth) * 100)),
        y: Math.max(0, Math.min(100, prev.y + (deltaY / imageRef.current!.offsetHeight) * 100)),
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (zoom > 1) {
      // Magnifier effect - follow mouse
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPosition({ x, y });
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
      resetZoom();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={() => {
          onClose();
          resetZoom();
        }}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
        aria-label="Close modal"
      >
        <FontAwesomeIcon icon={['fal', 'times'] as [string, string]} className="text-4xl" />
      </button>

      {/* Zoom controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-50">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          className="bg-white/90 hover:bg-white text-gray-800 w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom in"
        >
          <FontAwesomeIcon icon={['fal', 'plus'] as [string, string]} className="text-xl" />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="bg-white/90 hover:bg-white text-gray-800 w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom out"
        >
          <FontAwesomeIcon icon={['fal', 'minus'] as [string, string]} className="text-xl" />
        </button>
        <button
          onClick={resetZoom}
          disabled={zoom === 1}
          className="bg-white/90 hover:bg-white text-gray-800 px-4 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reset zoom"
        >
          Reset
        </button>
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-800 px-4 py-2 z-50">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 px-4 bg-white/90 hover:bg-white w-14 h-14 flex items-center justify-center z-50"
            aria-label="Previous image"
          >
            <FontAwesomeIcon
              icon={['fal', 'chevron-left'] as [string, string]}
              className="text-2xl text-gray-800"
            />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 px-4 bg-white/90 hover:bg-white w-14 h-14 flex items-center justify-center z-50"
            aria-label="Next image"
          >
            <FontAwesomeIcon
              icon={['fal', 'chevron-right'] as [string, string]}
              className="text-2xl text-gray-800"
            />
          </button>
        </>
      )}

      {/* Main image */}
      <div className="relative w-full h-full flex items-center justify-center p-20">
        <div
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ width: '90vw', maxWidth: '1400px', height: '80vh', maxHeight: '900px' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
          >
            <img
              ref={imageRef}
              src={images[currentIndex]?.url}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      {zoom > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-800 px-4 py-2 text-sm">
          {isDragging ? 'Dragging...' : 'Move mouse to pan • Click and drag to move'}
        </div>
      )}
    </div>
  );
}
