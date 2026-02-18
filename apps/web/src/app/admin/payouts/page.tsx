/**
 * Admin Payouts Management Page
 * Create and manage vendor payouts manually
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import MarkPaidModal from '@/components/modals/MarkPaidModal';
import CreatePayoutPlaceholderModal from '@/components/modals/CreatePayoutPlaceholderModal';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';

interface Payout {
  id: string;
  amount: string;
  method: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  transactionId?: string;
  vendor: {
    id: string;
    shopName: string;
    shopUrl: string;
  };
}

export default function AdminPayoutsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  // Fetch payouts
  const { data: payoutsData, isLoading } = useQuery({
    queryKey: ['admin-payouts', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/admin/payouts?${params.toString()}`);
      return response.data;
    },
    enabled: session?.user?.role === 'admin',
  });

  // Fetch payout stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-payout-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/payouts/stats');
      return response.data;
    },
    enabled: session?.user?.role === 'admin',
  });

  // Mark payout as paid
  const markPaidMutation = useMutation({
    mutationFn: async (data: { id: string; transactionId: string; payoutNotes?: string }) => {
      return api.patch(`/admin/payouts/${data.id}/mark-paid`, {
        transactionId: data.transactionId,
        payoutNotes: data.payoutNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payout-stats'] });
      toast.success('Payout marked as paid');
      setShowMarkPaidModal(false);
      setSelectedPayout(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark payout as paid');
    },
  });

  // Cancel payout
  const cancelMutation = useMutation({
    mutationFn: async (data: { id: string; reason: string }) => {
      return api.patch(`/admin/payouts/${data.id}/cancel`, { reason: data.reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payout-stats'] });
      toast.success('Payout cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel payout');
    },
  });

  // Redirect if not admin (after hooks)
  if (session?.user?.role !== 'admin') {
    router.push('/');
    return null;
  }

  const payouts = payoutsData?.data || [];
  const stats = statsData?.data || {};

  const handleMarkPaid = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!selectedPayout) return;

    markPaidMutation.mutate({
      id: selectedPayout.id,
      transactionId: formData.get('transactionId') as string,
      payoutNotes: formData.get('payoutNotes') as string,
    });
  };

  const handleCancel = (payout: Payout) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    cancelMutation.mutate({ id: payout.id, reason });
  };

  const exportCSV = () => {
    // Simple CSV export
    const csv = [
      ['ID', 'Vendor', 'Amount', 'Method', 'Status', 'Created', 'Transaction ID'].join(','),
      ...payouts.map((p: Payout) =>
        [
          p.id,
          p.vendor.shopName,
          p.amount,
          p.method,
          p.status,
          new Date(p.createdAt).toLocaleDateString(),
          p.transactionId || '',
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Vendor Payouts</h1>
            <p className="text-gray-600 mt-2">Manage manual vendor payouts</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={exportCSV}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-4 py-2 hover:bg-gray-200 transition"
            >
              <FontAwesomeIcon icon={['fal', 'download']} className="text-xl" />
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 hover:bg-primary-dark transition"
            >
              <FontAwesomeIcon icon={['fal', 'plus']} className="text-xl" />
              Create Payout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Payouts</p>
              <p className="text-2xl font-bold text-primary">{stats.totalPayouts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'money-bill-wave']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-primary">
                ${parseFloat(stats.totalAmount || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'dollar-sign']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Paid Out</p>
              <p className="text-2xl font-bold text-primary">
                ${parseFloat(stats.totalPaid || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-primary">
                ${parseFloat(stats.totalPending || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 flex items-center justify-center">
              <FontAwesomeIcon icon={['fal', 'clock']} className="text-white text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'processing', 'paid', 'failed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium transition ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Payouts Table */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading payouts...</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-500 flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={['fal', 'money-bill-wave']} className="text-white text-2xl" />
          </div>
          <p className="text-gray-500 mb-4">No payouts found</p>
          <p className="text-sm text-gray-400">
            {statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No payouts have been created yet'}
          </p>
        </div>
      ) : (
        <ResponsiveDataView
          breakpoint="md"
          mobile={
            <MobileCardList gap="md">
              {payouts.map((payout: Payout) => (
                <MobileCard
                  key={payout.id}
                  onClick={() => router.push(`/admin/vendors/${payout.vendor.id}`)}
                  title={payout.vendor.shopName}
                  subtitle={`/${payout.vendor.shopUrl}`}
                  badge={
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${payout.status === 'paid' ? 'bg-green-100 text-green-800' : payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : payout.status === 'failed' || payout.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                    >
                      <FontAwesomeIcon
                        icon={
                          payout.status === 'paid'
                            ? (['fal', 'check-circle'] as [string, string])
                            : payout.status === 'failed' || payout.status === 'cancelled'
                              ? (['fal', 'times-circle'] as [string, string])
                              : (['fal', 'clock'] as [string, string])
                        }
                        className="text-[10px]"
                      />
                      {payout.status}
                    </span>
                  }
                  details={[
                    { label: 'Method', value: payout.method },
                    { label: 'Created', value: new Date(payout.createdAt).toLocaleDateString() },
                    {
                      label: 'Transaction ID',
                      value: (
                        <span className="font-mono text-xs">{payout.transactionId || '-'}</span>
                      ),
                    },
                  ]}
                  primaryMetric={{
                    label: 'Amount',
                    value: `$${parseFloat(payout.amount).toFixed(2)}`,
                  }}
                >
                  {payout.status === 'pending' && (
                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowMarkPaidModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 min-h-[36px]"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => handleCancel(payout)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </MobileCard>
              ))}
            </MobileCardList>
          }
          desktop={
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payouts.map((payout: Payout) => (
                      <tr
                        key={payout.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/admin/vendors/${payout.vendor.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{payout.vendor.shopName}</p>
                            <p className="text-sm text-gray-500">/{payout.vendor.shopUrl}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-lg font-bold text-gray-900">
                            ${parseFloat(payout.amount).toFixed(2)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs">
                            {payout.method}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs flex items-center gap-1 w-fit ${payout.status === 'paid' ? 'bg-green-100 text-green-800' : payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : payout.status === 'failed' || payout.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                          >
                            {payout.status === 'paid' ? (
                              <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-sm" />
                            ) : payout.status === 'failed' || payout.status === 'cancelled' ? (
                              <FontAwesomeIcon icon={['fal', 'times-circle']} className="text-sm" />
                            ) : (
                              <FontAwesomeIcon icon={['fal', 'clock']} className="text-sm" />
                            )}
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                          {payout.transactionId || '-'}
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            {payout.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPayout(payout);
                                    setShowMarkPaidModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleCancel(payout)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          }
        />
      )}

      {/* Mark Paid Modal */}
      <MarkPaidModal
        isOpen={showMarkPaidModal && selectedPayout !== null}
        onClose={() => {
          setShowMarkPaidModal(false);
          setSelectedPayout(null);
        }}
        onSubmit={handleMarkPaid}
        vendorName={selectedPayout?.vendor.shopName || ''}
        amount={selectedPayout?.amount || '0'}
        isPending={markPaidMutation.isPending}
      />

      {/* Create Payout Modal */}
      <CreatePayoutPlaceholderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
          queryClient.invalidateQueries({ queryKey: ['admin-payout-stats'] });
        }}
      />
    </div>
  );
}
