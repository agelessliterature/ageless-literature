'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface ApproveVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  vendorName: string;
}

export default function ApproveVendorModal({
  isOpen,
  onClose,
  onApprove,
  vendorName,
}: ApproveVendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Approve Vendor</h2>
          <p className="text-gray-600 mb-4">
            Are you sure you want to approve <strong>{vendorName}</strong>? The vendor will receive
            an approval email and can start selling.
          </p>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            <FontAwesomeIcon icon={['fal', 'check']} className="mr-2 text-base" />
            Approve Vendor
          </button>
        </div>
      </div>
    </div>
  );
}
