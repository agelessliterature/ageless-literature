/**
 * Admin Vendor Detail Page
 * View detailed vendor information and manage approval status
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import adminApi from '@/lib/admin-api-client';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import { formatPhoneDisplay } from '@/lib/phoneUtils';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import VendorRejectionModal from '@/components/modals/VendorRejectionModal';
import CreateVendorPayoutModal from '@/components/modals/CreateVendorPayoutModal';

export default function AdminVendorDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Only run queries after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch vendor details - middleware ensures user is admin
  const {
    data: vendorData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-vendor', id],
    queryFn: async () => {
      const session = await getSession();
      const { data } = await adminApi.get(`/admin/vendors/${id}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return data.data;
    },
    enabled: !!id && isMounted,
  });

  // Set admin notes when data loads
  useEffect(() => {
    if (vendorData?.adminNotes) {
      setAdminNotes(vendorData.adminNotes);
    }
  }, [vendorData?.adminNotes]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const session = await getSession();
      const { data } = await adminApi.post(
        `/admin/vendors/${id}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Vendor approved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-vendor', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve vendor');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const session = await getSession();
      const { data } = await adminApi.post(
        `/admin/vendors/${id}/reject`,
        { reason },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Vendor rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-vendor', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      setShowRejectModal(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject vendor');
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const session = await getSession();
      const { data } = await adminApi.patch(
        `/admin/vendors/${id}/notes`,
        { notes },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Admin notes updated');
      queryClient.invalidateQueries({ queryKey: ['admin-vendor', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update notes');
    },
  });

  // Create payout mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (payoutData: {
      vendorId: string;
      amount: number;
      method: string;
      accountDetails?: string;
      vendorNotes?: string;
    }) => {
      const session = await getSession();
      const { data } = await adminApi.post('/admin/payouts', payoutData, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Payout created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-vendor', id] });
      setShowPayoutModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create payout');
    },
  });

  const handleApprove = () => {
    if (confirm(`Approve vendor "${vendorData?.shopName}"?`)) {
      approveMutation.mutate();
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectMutation.mutate(rejectionReason);
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(adminNotes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading vendor details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FontAwesomeIcon
              icon={['fal', 'circle-xmark']}
              className="text-6xl text-red-500 mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Vendor</h2>
            <p className="text-gray-600 mb-4">
              {(error as any)?.response?.data?.message || 'Failed to load vendor details'}
            </p>
            <Link
              href="/admin/vendors"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
            >
              <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
              Back to Vendors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No vendor data found</p>
            <Link
              href="/admin/vendors"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium mt-4"
            >
              <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
              Back to Vendors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      suspended: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button and Actions */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/admin/vendors"
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
            Back to Vendors
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/admin/vendors/${id}/edit`}
              className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition flex items-center gap-2"
            >
              <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
              Edit
            </Link>
            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete vendor "${vendorData?.shopName}"? This action cannot be undone.`,
                  )
                ) {
                  toast.error('Delete functionality not yet implemented');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition flex items-center gap-2"
            >
              <FontAwesomeIcon icon={['fal', 'trash']} className="text-base" />
              Delete
            </button>
          </div>
        </div>

        {/* Banner and Profile Section */}
        <div className="bg-white border border-gray-200 shadow-sm mb-4 overflow-hidden">
          {/* Banner */}
          <div className="h-48 w-full relative overflow-hidden bg-gradient-to-r from-primary to-primary-dark">
            {vendorData.bannerUrl ? (
              <CloudinaryImage
                src={vendorData.bannerUrl}
                alt={`${vendorData.shopName} banner`}
                width={1270}
                height="auto"
                className="w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-600 via-secondary/50 to-gray-600" />
            )}
          </div>

          {/* Profile Photo/Logo and Header Info */}
          <div className="px-6 pb-6">
            <div className="flex items-start gap-6 -mt-16 relative">
              {/* Logo/Profile Photo */}
              <div className="flex-shrink-0 relative z-10">
                <div className="w-32 h-32 border-4 border-white shadow-lg bg-white overflow-hidden">
                  <CloudinaryImage
                    src={vendorData.logoUrl}
                    alt={vendorData.shopName}
                    width={256}
                    height={256}
                    className="w-full h-full"
                    fallbackIcon={['fal', 'store']}
                    fallbackText={vendorData.shopName.charAt(0).toUpperCase()}
                  />
                </div>
              </div>

              {/* Header Info */}
              <div className="flex-1 pt-20">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{vendorData.shopName}</h1>
                    <p className="text-sm text-gray-600 mt-1">/{vendorData.shopUrl}</p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold border ${getStatusColor(vendorData.status)}`}
                  >
                    {vendorData.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">
                {vendorData.user?.firstName} {vendorData.user?.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <FontAwesomeIcon icon={['fal', 'envelope']} className="text-base" />
                {vendorData.user?.email}
              </p>
            </div>
            {vendorData.phoneNumber && (
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <FontAwesomeIcon icon={['fal', 'phone']} className="text-base" />
                  {formatPhoneDisplay(vendorData.phoneNumber)}
                </p>
              </div>
            )}
            {vendorData.websiteUrl && (
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <a
                  href={vendorData.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={['fal', 'globe']} className="text-base" />
                  {vendorData.websiteUrl}
                </a>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Applied On</p>
              <p className="font-medium text-gray-900">
                {new Date(vendorData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Social Links */}
        {(vendorData.phoneNumber ||
          vendorData.websiteUrl ||
          vendorData.socialFacebook ||
          vendorData.socialTwitter ||
          vendorData.socialInstagram ||
          vendorData.socialLinkedin) && (
          <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendorData.phoneNumber && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <FontAwesomeIcon icon={['fal', 'phone']} className="text-base" />
                    {formatPhoneDisplay(vendorData.phoneNumber)}
                  </p>
                </div>
              )}
              {vendorData.websiteUrl && (
                <div>
                  <p className="text-sm text-gray-500">Website</p>
                  <a
                    href={vendorData.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['fal', 'globe']} className="text-base" />
                    {vendorData.websiteUrl}
                  </a>
                </div>
              )}
              {vendorData.socialFacebook && (
                <div>
                  <p className="text-sm text-gray-500">Facebook</p>
                  <a
                    href={vendorData.socialFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['fab', 'facebook']} className="text-base" />
                    {vendorData.socialFacebook}
                  </a>
                </div>
              )}
              {vendorData.socialTwitter && (
                <div>
                  <p className="text-sm text-gray-500">Twitter/X</p>
                  <a
                    href={vendorData.socialTwitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['fab', 'x-twitter']} className="text-base" />
                    {vendorData.socialTwitter}
                  </a>
                </div>
              )}
              {vendorData.socialInstagram && (
                <div>
                  <p className="text-sm text-gray-500">Instagram</p>
                  <a
                    href={vendorData.socialInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['fab', 'instagram']} className="text-base" />
                    {vendorData.socialInstagram}
                  </a>
                </div>
              )}
              {vendorData.socialLinkedin && (
                <div>
                  <p className="text-sm text-gray-500">LinkedIn</p>
                  <a
                    href={vendorData.socialLinkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={['fab', 'linkedin']} className="text-base" />
                    {vendorData.socialLinkedin}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Business Description */}
        <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{vendorData.businessDescription}</p>
        </div>

        {/* Sample Files */}
        {vendorData.sampleFiles && vendorData.sampleFiles.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sample Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vendorData.sampleFiles.map((url: string, index: number) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={url}
                    alt={`Sample ${index + 1}`}
                    className="w-full h-32 object-cover border border-gray-200 hover:border-primary transition"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Financial Information */}
        {vendorData.earningsSummary && (
          <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={['fal', 'dollar-sign']} className="text-xl" />
              Financial Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${parseFloat(vendorData.earningsSummary.totalGross || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Platform Commission (8%)</p>
                <p className="text-2xl font-bold text-red-600">
                  ${parseFloat(vendorData.earningsSummary.totalCommission || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor Earnings (92%)</p>
                <p className="text-2xl font-bold text-green-600">
                  ${parseFloat(vendorData.earningsSummary.totalEarnings || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendorData.earningsSummary.totalTransactions || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Balance & Payout */}
        <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={['fal', 'money-bills']} className="text-xl" />
            Vendor Balance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-500">Available for Payout</p>
              <p className="text-3xl font-bold text-green-600">
                ${parseFloat(vendorData.balanceAvailable || 0).toFixed(2)}
              </p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="text-sm text-gray-500">Pending (Not Settled)</p>
              <p className="text-3xl font-bold text-yellow-600">
                ${parseFloat(vendorData.balancePending || 0).toFixed(2)}
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-500">Lifetime Earnings</p>
              <p className="text-3xl font-bold text-blue-600">
                ${parseFloat(vendorData.lifetimeVendorEarnings || 0).toFixed(2)}
              </p>
            </div>
          </div>
          {parseFloat(vendorData.balanceAvailable || 0) > 0 && (
            <button
              onClick={() => setShowPayoutModal(true)}
              className="w-full md:w-auto bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition flex items-center gap-2 justify-center"
            >
              <FontAwesomeIcon icon={['fal', 'money-bills']} className="text-base" />
              Create Payout
            </button>
          )}
        </div>

        {/* Admin Notes */}
        <div className="bg-white border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Notes (Internal Only)</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Add internal notes about this vendor..."
          />
          <button
            onClick={handleSaveNotes}
            disabled={updateNotesMutation.isPending}
            className="mt-3 px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
          >
            {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
          </button>
        </div>

        {/* Rejection Reason */}
        {vendorData.status === 'rejected' && vendorData.rejectionReason && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">Rejection Reason</h3>
            <p className="text-red-800">{vendorData.rejectionReason}</p>
          </div>
        )}

        {/* Action Buttons */}
        {vendorData.status === 'pending' && (
          <div className="bg-white border border-gray-200 shadow-sm p-6 flex gap-4">
            <button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="flex-1 bg-green-600 text-white py-2 px-4 text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {approveMutation.isPending ? (
                'Approving...'
              ) : (
                <>
                  <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-base" />
                  Approve Vendor
                </>
              )}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={rejectMutation.isPending}
              className="flex-1 bg-red-600 text-white py-2 px-4 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={['fal', 'times-circle']} className="text-base" />
              Reject Vendor
            </button>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      <VendorRejectionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
        }}
        onReject={handleReject}
        vendorName={vendorData?.shopName || ''}
        rejectionReason={rejectionReason}
        onReasonChange={setRejectionReason}
        isPending={rejectMutation.isPending}
      />

      {/* Create Payout Modal */}
      <CreateVendorPayoutModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          createPayoutMutation.mutate({
            vendorId: vendorData?.id || '',
            amount: parseFloat(formData.get('amount') as string),
            method: formData.get('method') as string,
            accountDetails: formData.get('accountDetails') as string,
            vendorNotes: formData.get('vendorNotes') as string,
          });
        }}
        vendorName={vendorData?.shopName || ''}
        availableBalance={vendorData?.balanceAvailable || 0}
        isPending={createPayoutMutation.isPending}
      />
    </div>
  );
}
