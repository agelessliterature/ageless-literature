'use client';

import { formatMoney } from '@/lib/format';

interface CreateVendorPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  vendorName: string;
  availableBalance: number;
  isPending: boolean;
}

export default function CreateVendorPayoutModal({
  isOpen,
  onClose,
  onSubmit,
  vendorName,
  availableBalance,
  isPending,
}: CreateVendorPayoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Vendor Payout</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Vendor: <strong>{vendorName}</strong>
          </p>
          <p className="mb-4 text-sm">
            Available Balance:{' '}
            <span className="text-xl font-bold text-green-600">
              {formatMoney(availableBalance)}
            </span>
          </p>
          <form onSubmit={onSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                step="0.01"
                max={parseFloat(String(availableBalance || 0))}
                required
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="method"
                required
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Select method</option>
                <option value="stripe">Stripe Connect</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Details
              </label>
              <input
                type="text"
                name="accountDetails"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="email@example.com or last 4 digits"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes to Vendor
              </label>
              <textarea
                name="vendorNotes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Optional message to vendor..."
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
                {isPending ? 'Creating...' : 'Create Payout'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
