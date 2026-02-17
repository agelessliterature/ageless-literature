'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { formatMoney } from '@/lib/format';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  vendorName: string;
  amount: string;
  isPending: boolean;
}

export default function MarkPaidModal({
  isOpen,
  onClose,
  onSubmit,
  vendorName,
  amount,
  isPending,
}: MarkPaidModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Mark Payout as Paid</h3>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor: {vendorName}
            </label>
            <p className="text-2xl font-bold text-gray-900">{formatMoney(amount)}</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID *</label>
            <input
              type="text"
              name="transactionId"
              required
              className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="TXN123456789"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              name="payoutNotes"
              rows={3}
              className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <FontAwesomeIcon
                    icon={['fal', 'spinner-third']}
                    spin
                    className="mr-2 text-base"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={['fal', 'check']} className="mr-2 text-base" />
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
