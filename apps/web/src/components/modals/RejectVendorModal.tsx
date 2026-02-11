'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface RejectVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: () => void;
  vendorName: string;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
}

export default function RejectVendorModal({
  isOpen,
  onClose,
  onReject,
  vendorName,
  rejectionReason,
  onReasonChange,
}: RejectVendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Reject Vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Reject application for <strong>{vendorName}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
              placeholder="This reason will be sent to the vendor via email..."
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            <FontAwesomeIcon icon={['fal', 'ban']} className="mr-2 text-base" />
            Reject Application
          </button>
        </div>
      </div>
    </div>
  );
}
