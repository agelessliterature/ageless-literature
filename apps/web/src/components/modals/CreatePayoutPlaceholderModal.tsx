'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatMoney } from '@/lib/format';

interface CreatePayoutPlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Vendor {
  id: string;
  shopName: string;
  shopUrl: string;
  balanceAvailable: number;
  preferredPayoutMethod?: string;
  user?: {
    email: string;
    name?: string;
  };
}

export default function CreatePayoutPlaceholderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePayoutPlaceholderModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedVendor?.preferredPayoutMethod) {
      setMethod(selectedVendor.preferredPayoutMethod);
    }
  }, [selectedVendor]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/vendors?limit=1000&status=approved,active');
      if (response.data.success) {
        const vendorData = response.data.data?.vendors || response.data.data || [];
        setVendors(vendorData);
      }
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!method) {
      toast.error('Please select a payout method');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/admin/payouts', {
        vendorId: selectedVendor.id,
        amount: parseFloat(amount),
        method,
        notes,
      });

      if (response.data.success) {
        toast.success('Payout created successfully');
        onSuccess?.();
        handleClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create payout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedVendor(null);
    setAmount('');
    setMethod('');
    setNotes('');
    setSearchQuery('');
    onClose();
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.shopUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <h3 className="text-xl font-bold text-gray-900">Create Payout</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vendor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Vendor *
              </label>

              {!selectedVendor ? (
                <>
                  <div className="relative mb-3">
                    <FontAwesomeIcon
                      icon={['fal', 'search']}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search vendors by name, shop URL, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="border border-gray-300 max-h-64 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center text-gray-500">Loading vendors...</div>
                    ) : filteredVendors.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No vendors found</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredVendors.map((vendor) => (
                          <button
                            key={vendor.id}
                            type="button"
                            onClick={() => setSelectedVendor(vendor)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{vendor.shopName}</div>
                                <div className="text-sm text-gray-500">/{vendor.shopUrl}</div>
                                {vendor.user?.email && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {vendor.user.email}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatMoney(vendor.balanceAvailable)}
                                </div>
                                <div className="text-xs text-gray-500">Available</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="border border-gray-300 p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{selectedVendor.shopName}</div>
                      <div className="text-sm text-gray-500">/{selectedVendor.shopUrl}</div>
                      {selectedVendor.preferredPayoutMethod && (
                        <div className="text-xs text-gray-600 mt-1">
                          <FontAwesomeIcon icon={['fal', 'credit-card']} className="mr-1" />
                          Preferred: {selectedVendor.preferredPayoutMethod}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedVendor(null)}
                      className="text-sm text-primary hover:text-primary-dark"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Available Balance:</span>
                      <span className="font-bold text-green-600">
                        {formatMoney(selectedVendor.balanceAvailable)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedVendor && (
              <>
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedVendor.balanceAvailable}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {amount && parseFloat(amount) > selectedVendor.balanceAvailable && (
                    <p className="text-xs text-red-600 mt-1">Amount exceeds available balance</p>
                  )}
                </div>

                {/* Payout Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Method *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  >
                    <option value="">Select method</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Add any additional notes about this payout..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !amount ||
                      !method ||
                      parseFloat(amount) > selectedVendor.balanceAvailable
                    }
                    className="flex-1 px-6 py-3 bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                  >
                    {submitting ? (
                      <>
                        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={['fal', 'check']} className="mr-2" />
                        Create Payout
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
