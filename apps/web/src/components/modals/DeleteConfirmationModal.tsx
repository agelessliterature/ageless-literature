'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Archive Item</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to archive &quot;{itemName}&quot;? It will be moved to archived
          status and hidden from the storefront.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <FontAwesomeIcon icon={['fal', 'archive']} className="mr-2 text-base" />
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
