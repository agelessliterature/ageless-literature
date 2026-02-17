'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { formatMoney } from '@/lib/format';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

export default function WithdrawModal({ isOpen, onClose, availableBalance }: WithdrawModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-primary">Request Withdrawal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
          </button>
        </div>
        <div className="mb-6">
          <p className="text-gray-600 mb-2">Available Balance:</p>
          <p className="text-3xl font-bold text-green-600">{formatMoney(availableBalance)}</p>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Withdrawals are processed within 2-3 business days to your configured payout method.
        </p>
        <div className="flex gap-3">
          <Link
            href="/vendor/withdrawals/new"
            className="flex-1 bg-primary text-white px-4 py-2 text-center hover:bg-opacity-90 transition"
          >
            Continue
          </Link>
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
