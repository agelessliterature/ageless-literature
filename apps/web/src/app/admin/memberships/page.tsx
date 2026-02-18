'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api-url';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
}

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  image?: string;
  name?: string;
}

interface Subscription {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused' | 'trialing';
  currentPeriodEnd: string;
  createdAt: string;
  plan: MembershipPlan;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl?: string | null;
    image?: string | null;
  };
}

export default function AdminMembershipsPage() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Create membership modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Payment options
  const [paymentOption, setPaymentOption] = useState<'user_method' | 'send_email' | 'skip'>(
    'user_method',
  );
  const [skipReason, setSkipReason] = useState('');
  const [userPaymentMethods, setUserPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // Edit membership modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('planId', planFilter);
      if (searchQuery) params.append('search', searchQuery);

      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${getApiUrl()}/api/admin/memberships/subscriptions?${params}`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setSubscriptions(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch plans for filter
  const fetchPlans = async () => {
    try {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${getApiUrl()}/api/admin/memberships/plans`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setPlans(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      setIsCancelling(true);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${getApiUrl()}/api/admin/memberships/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data.success) {
        alert('Subscription cancelled successfully');
        fetchSubscriptions();
      } else {
        alert(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  // Create subscription
  const handleCreateMembership = async () => {
    setCreateError('');
    if (!selectedUser || !selectedPlan) {
      setCreateError('Please select a user and a plan');
      return;
    }

    // Validate payment option
    if (paymentOption === 'skip' && !skipReason.trim()) {
      setCreateError('Please provide a reason for skipping payment');
      return;
    }

    if (paymentOption === 'user_method' && userPaymentMethods.length === 0) {
      setCreateError('User has no payment methods. Please choose another option.');
      return;
    }

    try {
      setIsCreating(true);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const payload: any = {
        userId: selectedUser.id,
        planId: selectedPlan,
        paymentOption,
      };

      if (paymentOption === 'user_method' && selectedPaymentMethod) {
        payload.paymentMethodId = selectedPaymentMethod;
      } else if (paymentOption === 'skip') {
        payload.skipReason = skipReason;
        payload.status = 'active'; // Admin can activate without payment
      }

      const res = await fetch(`${getApiUrl()}/api/admin/memberships/subscriptions/create`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        setSelectedUser(null);
        setSelectedPlan('');
        setUserSearch('');
        setSearchResults([]);
        setPaymentOption('user_method');
        setSkipReason('');
        setUserPaymentMethods([]);
        setSelectedPaymentMethod('');

        let message = 'Membership created successfully';
        if (paymentOption === 'send_email') {
          message += '. Payment setup email sent to user.';
        } else if (paymentOption === 'skip') {
          message += ' without payment.';
        }
        alert(message);
        fetchSubscriptions();
      } else {
        setCreateError(data.message || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Failed to create subscription:', error);
      setCreateError('Failed to create subscription');
    } finally {
      setIsCreating(false);
    }
  };

  // Search users
  const searchUsers = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(
        `${getApiUrl()}/api/admin/users?search=${encodeURIComponent(query)}&limit=10`,
        {
          headers,
          credentials: 'include',
        },
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data.users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleSelectUser = async (user: UserSearchResult) => {
    setSelectedUser(user);
    setUserSearch(`${user.firstName || ''} ${user.lastName || ''} (${user.email})`.trim());
    setSearchResults([]);

    // Fetch user's payment methods
    try {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${getApiUrl()}/api/admin/users/${user.id}/payment-methods`, {
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setUserPaymentMethods(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedPaymentMethod(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      setUserPaymentMethods([]);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchSubscriptions();
      fetchPlans();
    }
  }, [page, statusFilter, planFilter, session?.accessToken]);

  const handleSearch = () => {
    setPage(1);
    if (session?.accessToken) {
      fetchSubscriptions();
    }
  };

  // Open edit modal
  const openEditModal = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditPlan(subscription.plan.id);
    setEditStatus(subscription.status);
    setEditError('');
    setShowEditModal(true);
  };

  // Update subscription
  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    setEditError('');
    if (!editPlan) {
      setEditError('Please select a plan');
      return;
    }

    try {
      setIsUpdating(true);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(
        `${getApiUrl()}/api/admin/memberships/subscriptions/${editingSubscription.id}`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            planId: editPlan,
            status: editStatus,
          }),
        },
      );

      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        setEditingSubscription(null);
        setEditPlan('');
        setEditStatus('active');
        alert('Membership updated successfully');
        fetchSubscriptions();
      } else {
        setEditError(data.message || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
      setEditError('Failed to update subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Email', 'Name', 'Plan', 'Status', 'Created', 'Renewal Date'].join(','),
      ...subscriptions.map((sub) =>
        [
          sub.user.email,
          `"${sub.user.firstName || ''} ${sub.user.lastName || ''}"`,
          sub.plan.name,
          sub.status,
          new Date(sub.createdAt).toLocaleDateString(),
          new Date(sub.currentPeriodEnd).toLocaleDateString(),
        ].join(','),
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memberships-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    alert('CSV exported successfully');
  };

  const getStatusBadge = (status: Subscription['status']) => {
    const badges = {
      active: {
        color: 'bg-green-100 text-green-800',
        icon: ['fal', 'check-circle'] as [string, string],
        label: 'Active',
      },
      paused: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: ['fal', 'pause'] as [string, string],
        label: 'Paused',
      },
      cancelled: {
        color: 'bg-red-100 text-red-800',
        icon: ['fal', 'ban'] as [string, string],
        label: 'Cancelled',
      },
      expired: {
        color: 'bg-gray-100 text-gray-800',
        icon: ['fal', 'exclamation-triangle'] as [string, string],
        label: 'Expired',
      },
      past_due: {
        color: 'bg-orange-100 text-orange-800',
        icon: ['fal', 'exclamation-triangle'] as [string, string],
        label: 'Past Due',
      },
      trialing: {
        color: 'bg-blue-100 text-blue-800',
        icon: ['fal', 'crown'] as [string, string],
        label: 'Trial',
      },
    };
    const badge = badges[status];
    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium ${badge.color}`}
      >
        <FontAwesomeIcon icon={badge.icon} className="text-sm" />
        {badge.label}
      </span>
    );
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === 'active').length,
    paused: subscriptions.filter((s) => s.status === 'paused').length,
    cancelled: subscriptions.filter((s) => s.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Membership Management</h1>
        <p className="text-gray-600">Manage member subscriptions and plans</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paused</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.paused}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FontAwesomeIcon
                icon={['fal', 'search']}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
              <option value="past_due">Past Due</option>
              <option value="trialing">Trialing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Plans</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={['fal', 'file-export']} />
            Export CSV
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} />
            Add Member
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <ResponsiveDataView
          breakpoint="md"
          mobile={
            <div>
              {loading ? (
                <div className="px-6 py-12 text-center text-gray-500">Loading subscriptions...</div>
              ) : subscriptions.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">No subscriptions found</div>
              ) : (
                <MobileCardList gap="sm">
                  {subscriptions.map((subscription) => (
                    <MobileCard
                      key={subscription.id}
                      onClick={() => openEditModal(subscription)}
                      thumbnail={
                        subscription.user.profilePhotoUrl || subscription.user.image ? (
                          <img
                            src={subscription.user.profilePhotoUrl || subscription.user.image || ''}
                            alt={`${subscription.user.firstName} ${subscription.user.lastName}`}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                            {(() => {
                              const firstName = subscription.user.firstName || '';
                              const lastName = subscription.user.lastName || '';
                              if (firstName && lastName)
                                return `${firstName[0]}${lastName[0]}`.toUpperCase();
                              return subscription.user.email.substring(0, 2).toUpperCase();
                            })()}
                          </div>
                        )
                      }
                      title={`${subscription.user.firstName || ''} ${subscription.user.lastName || ''}`}
                      subtitle={subscription.user.email}
                      badge={getStatusBadge(subscription.status)}
                      details={[
                        {
                          label: 'Plan',
                          value: `${subscription.plan.name} ($${subscription.plan.price}/${subscription.plan.interval})`,
                        },
                        {
                          label: 'Renewal',
                          value: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
                        },
                      ]}
                      actions={[
                        {
                          label: 'Edit',
                          onClick: () => openEditModal(subscription),
                          variant: 'primary',
                        },
                        ...(subscription.status === 'active'
                          ? [
                              {
                                label: 'Cancel',
                                onClick: () => handleCancelSubscription(subscription.id),
                                variant: 'danger' as const,
                              },
                            ]
                          : []),
                      ]}
                    />
                  ))}
                </MobileCardList>
              )}
            </div>
          }
          desktop={
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renewal Date
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Loading subscriptions...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No subscriptions found
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((subscription) => (
                      <tr
                        key={subscription.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => openEditModal(subscription)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {subscription.user.profilePhotoUrl || subscription.user.image ? (
                              <div className="h-10 w-10 flex-shrink-0 rounded-full relative overflow-hidden">
                                <img
                                  src={
                                    subscription.user.profilePhotoUrl ||
                                    subscription.user.image ||
                                    ''
                                  }
                                  alt={`${subscription.user.firstName} ${subscription.user.lastName}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                                {(() => {
                                  const firstName = subscription.user.firstName || '';
                                  const lastName = subscription.user.lastName || '';
                                  if (firstName && lastName) {
                                    return `${firstName[0]}${lastName[0]}`.toUpperCase();
                                  }
                                  return subscription.user.email.substring(0, 2).toUpperCase();
                                })()}
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {subscription.user.firstName || ''}{' '}
                                {subscription.user.lastName || ''}
                              </div>
                              <div className="text-sm text-gray-500">{subscription.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {subscription.plan.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ${subscription.plan.price}/{subscription.plan.interval}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(subscription.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(subscription)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Edit Membership"
                            >
                              <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                            </button>
                            {subscription.status === 'active' && (
                              <button
                                onClick={() => handleCancelSubscription(subscription.id)}
                                disabled={isCancelling}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={['fal', 'ban']} className="mr-1" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          }
        />
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="px-4 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Membership Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Member</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedUser(null);
                  setSelectedPlan('');
                  setUserSearch('');
                  setSearchResults([]);
                  setCreateError('');
                  setPaymentOption('user_method');
                  setSkipReason('');
                  setUserPaymentMethods([]);
                  setSelectedPaymentMethod('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isCreating}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
                        >
                          {user.profilePhotoUrl || user.image ? (
                            <img
                              src={user.profilePhotoUrl || user.image}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-12 h-12 object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                              {(() => {
                                const firstName = user.firstName || '';
                                const lastName = user.lastName || '';
                                if (firstName && lastName) {
                                  return `${firstName[0]}${lastName[0]}`.toUpperCase();
                                }
                                return user.email.substring(0, 2).toUpperCase();
                              })()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Membership Plan
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isCreating}
                >
                  <option value="">Select a plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price}/{plan.interval}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Option */}
              {selectedUser && selectedPlan && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Option
                  </label>
                  <div className="space-y-3">
                    {/* Use User's Payment Method */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="user_method"
                        checked={paymentOption === 'user_method'}
                        onChange={(e) => setPaymentOption(e.target.value as any)}
                        disabled={isCreating}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Use User's Payment Method</div>
                        <div className="text-sm text-gray-500">
                          Charge using an existing payment method
                        </div>
                        {paymentOption === 'user_method' && (
                          <div className="mt-2">
                            {userPaymentMethods.length > 0 ? (
                              <select
                                value={selectedPaymentMethod}
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={isCreating}
                              >
                                {userPaymentMethods.map((pm) => (
                                  <option key={pm.id} value={pm.id}>
                                    {pm.brand?.toUpperCase()} ••••{pm.last4}
                                    {pm.isDefault && ' (Default)'}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                No payment methods found for this user
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Send Email to User */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="send_email"
                        checked={paymentOption === 'send_email'}
                        onChange={(e) => setPaymentOption(e.target.value as any)}
                        disabled={isCreating}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Send Email to User</div>
                        <div className="text-sm text-gray-500">
                          Send an email requesting payment setup
                        </div>
                      </div>
                    </label>

                    {/* Skip Payment */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value="skip"
                        checked={paymentOption === 'skip'}
                        onChange={(e) => setPaymentOption(e.target.value as any)}
                        disabled={isCreating}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Skip Payment (Free)</div>
                        <div className="text-sm text-gray-500">
                          Grant membership without charging
                        </div>
                        {paymentOption === 'skip' && (
                          <div className="mt-2">
                            <textarea
                              value={skipReason}
                              onChange={(e) => setSkipReason(e.target.value)}
                              placeholder="Reason for skipping payment (required)..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              disabled={isCreating}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedUser(null);
                    setSelectedPlan('');
                    setUserSearch('');
                    setSearchResults([]);
                    setCreateError('');
                    setPaymentOption('user_method');
                    setSkipReason('');
                    setUserPaymentMethods([]);
                    setSelectedPaymentMethod('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMembership}
                  disabled={!selectedUser || !selectedPlan || isCreating}
                  className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Membership'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Membership Modal */}
      {showEditModal && editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Edit Membership</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSubscription(null);
                  setEditPlan('');
                  setEditStatus('active');
                  setEditError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
              </button>
            </div>

            <div className="p-6">
              {editError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
                  {editError}
                </div>
              )}

              <div className="space-y-6">
                {/* User Info (Read-only) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member</label>
                  <div className="flex items-center gap-3">
                    {editingSubscription.user.profilePhotoUrl || editingSubscription.user.image ? (
                      <img
                        src={
                          editingSubscription.user.profilePhotoUrl ||
                          editingSubscription.user.image ||
                          ''
                        }
                        alt={`${editingSubscription.user.firstName} ${editingSubscription.user.lastName}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                        {(() => {
                          const firstName = editingSubscription.user.firstName || '';
                          const lastName = editingSubscription.user.lastName || '';
                          if (firstName && lastName) {
                            return `${firstName[0]}${lastName[0]}`.toUpperCase();
                          }
                          return editingSubscription.user.email.substring(0, 2).toUpperCase();
                        })()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {editingSubscription.user.firstName || ''}{' '}
                        {editingSubscription.user.lastName || ''}
                      </div>
                      <div className="text-sm text-gray-500">{editingSubscription.user.email}</div>
                    </div>
                  </div>
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Plan
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isUpdating}
                  >
                    <option value="">Select a plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}/{plan.interval}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isUpdating}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                    <option value="past_due">Past Due</option>
                    <option value="trialing">Trialing</option>
                  </select>
                </div>

                {/* Current Period Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created
                      </label>
                      <div className="text-sm text-gray-900">
                        {new Date(editingSubscription.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Renewal Date
                      </label>
                      <div className="text-sm text-gray-900">
                        {new Date(editingSubscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSubscription(null);
                      setEditPlan('');
                      setEditStatus('active');
                      setEditError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateSubscription}
                    disabled={!editPlan || isUpdating}
                    className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                  >
                    {isUpdating ? (
                      <>
                        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Membership'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
