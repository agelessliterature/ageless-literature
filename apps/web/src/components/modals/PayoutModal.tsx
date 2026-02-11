'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface PayoutForm {
  amount: string;
  method: string;
  notes: string;
}

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  vendorName: string;
  availableBalance: number;
  payoutForm: PayoutForm;
  onFormChange: (form: PayoutForm) => void;
  formatCurrency: (amount: number) => string;
}

export default function PayoutModal({
  isOpen,
  onClose,
  onCreate,
  vendorName,
  availableBalance,
  payoutForm,
  onFormChange,
  formatCurrency,
}: PayoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create Payout</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 border border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>{vendorName}</strong>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Available Balance:{' '}
              <strong className="text-green-600">{formatCurrency(availableBalance)}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payout Amount <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={availableBalance}
              value={payoutForm.amount}
              onChange={(e) => onFormChange({ ...payoutForm, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={payoutForm.method}
              onChange={(e) => onFormChange({ ...payoutForm, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="stripe">Stripe Connect</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={payoutForm.notes}
              onChange={(e) => onFormChange({ ...payoutForm, notes: e.target.value })}
              rows={3}
              placeholder="Transaction ID, confirmation details..."
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
            onClick={onCreate}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark"
          >
            <FontAwesomeIcon icon={['fal', 'money-bill-wave']} className="mr-2 text-base" />
            Create Payout
          </button>
        </div>
      </div>
    </div>
  );
}
