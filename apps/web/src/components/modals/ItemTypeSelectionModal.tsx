'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface ItemTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ItemTypeSelectionModal({ isOpen, onClose }: ItemTypeSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full p-8">
        <h3 className="text-2xl font-bold text-primary mb-2">What would you like to list?</h3>
        <p className="text-gray-600 mb-6">
          Choose the type of item you want to add to your inventory
        </p>

        <div className="space-y-4">
          <Link
            href="/vendor/books/new"
            className="flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-primary transition group"
          >
            <FontAwesomeIcon
              icon={['fal', 'book-open']}
              className="text-3xl text-primary group-hover:text-secondary"
            />
            <div className="flex-1">
              <h4 className="font-semibold text-lg text-gray-900">Book</h4>
              <p className="text-sm text-gray-600">List a rare or collectible book</p>
            </div>
          </Link>

          <Link
            href="/vendor/products/new"
            className="flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-primary transition group"
          >
            <FontAwesomeIcon
              icon={['fal', 'box']}
              className="text-3xl text-primary group-hover:text-secondary"
            />
            <div className="flex-1">
              <h4 className="font-semibold text-lg text-gray-900">Collectible / Product</h4>
              <p className="text-sm text-gray-600">
                List art, manuscripts, maps, vintage items, memorabilia, etc.
              </p>
            </div>
          </Link>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-gray-200 text-gray-700 px-4 py-2 hover:bg-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
