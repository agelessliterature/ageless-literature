'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
}

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Plan[];
  currentPlanId: string;
  currentPlanPrice: number;
  onChangePlan: (planId: string) => void;
  isPending: boolean;
}

export default function ChangePlanModal({
  isOpen,
  onClose,
  plans,
  currentPlanId,
  currentPlanPrice,
  onChangePlan,
  isPending,
}: ChangePlanModalProps) {
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
            className="bg-white p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Change Your Plan</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
              </button>
            </div>
            <div className="space-y-4">
              {plans
                .filter((plan) => plan.id !== currentPlanId)
                .map((plan) => {
                  const isUpgrade = plan.price > currentPlanPrice;
                  return (
                    <div
                      key={plan.id}
                      className="border border-gray-200 p-4 hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg">{plan.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-primary">${plan.price}</div>
                          <div className="text-xs text-gray-500">per {plan.interval}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => onChangePlan(plan.id)}
                        disabled={isPending}
                        className={`w-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 mt-3 ${
                          isUpgrade
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <FontAwesomeIcon
                              icon={['fal', 'spinner-third']}
                              spin
                              className="mr-2"
                            />
                            Changing...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={['fal', 'arrow-up']} className="mr-2" />
                            {isUpgrade ? 'Upgrade' : 'Switch'} to {plan.name}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
