'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface TrackingNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  trackingNumber: string;
  onTrackingChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function TrackingNumberModal({
  isOpen,
  onClose,
  orderNumber,
  trackingNumber,
  onTrackingChange,
  onSubmit,
  isSubmitting,
}: TrackingNumberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold text-primary mb-4">Add Tracking Number</h3>
        <p className="text-sm text-gray-600 mb-4">Order #{orderNumber}</p>
        <input
          type="text"
          placeholder="Enter tracking number"
          value={trackingNumber}
          onChange={(e) => onTrackingChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 mb-4 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <div className="flex gap-3">
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-primary text-white px-4 py-2 hover:bg-opacity-90 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2 text-base" />
                Updating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fal', 'truck']} className="mr-2 text-base" />
                Submit
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
