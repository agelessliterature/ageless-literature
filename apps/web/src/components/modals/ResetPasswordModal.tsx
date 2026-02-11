'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  userEmail: string;
  newPassword: string;
  onPasswordChange: (password: string) => void;
  passwordError: string;
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  onReset,
  userEmail,
  newPassword,
  onPasswordChange,
  passwordError,
}: ResetPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Reset password for <strong>{userEmail}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
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
            onClick={onReset}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark"
          >
            <FontAwesomeIcon icon={['fal', 'key']} className="mr-2 text-base" />
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}
