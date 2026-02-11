'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface CancelMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelAtPeriodEnd: () => void;
  onCancelImmediately: () => void;
  isPending: boolean;
  currentPeriodEnd: string;
}

export default function CancelMembershipModal({
  isOpen,
  onClose,
  onCancelAtPeriodEnd,
  onCancelImmediately,
  isPending,
  currentPeriodEnd,
}: CancelMembershipModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cancel Membership</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              We are sorry to see you go. How would you like to proceed?
            </p>
            <div className="space-y-3">
              <button
                onClick={onCancelAtPeriodEnd}
                disabled={isPending}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
              >
                <div className="font-semibold mb-1">Cancel at Period End</div>
                <div className="text-sm text-gray-500">
                  Keep access until {new Date(currentPeriodEnd).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={onCancelImmediately}
                disabled={isPending}
                className="w-full px-4 py-3 border border-red-600 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50 text-left"
              >
                <div className="font-semibold mb-1">Cancel Immediately</div>
                <div className="text-sm text-red-500">Lose access right away</div>
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                Keep My Membership
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
