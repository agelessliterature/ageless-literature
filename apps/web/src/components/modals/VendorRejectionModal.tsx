'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface VendorRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: () => void;
  vendorName: string;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
  isPending: boolean;
}

export default function VendorRejectionModal({
  isOpen,
  onClose,
  onReject,
  vendorName,
  rejectionReason,
  onReasonChange,
  isPending,
}: VendorRejectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reject Vendor Application</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Vendor: <strong>{vendorName}</strong>
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Please provide a clear reason for rejection..."
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              disabled={isPending || !rejectionReason.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <FontAwesomeIcon
                    icon={['fal', 'spinner-third']}
                    spin
                    className="mr-2 text-base"
                  />
                  Rejecting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={['fal', 'ban']} className="mr-2 text-base" />
                  Reject Application
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
