'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api-url';
import api from '@/lib/api';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import ApproveVendorModal from '@/components/modals/ApproveVendorModal';
import RejectVendorModal from '@/components/modals/RejectVendorModal';
import SuspendVendorModal from '@/components/modals/SuspendVendorModal';
import PayoutModal from '@/components/modals/PayoutModal';
import FeaturedVendorModal from '@/components/modals/FeaturedVendorModal';
import CreateVendorModal from '@/components/modals/CreateVendorModal';

interface Vendor {
  id: string;
  shopName: string;
  shopUrl: string;
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'suspended' | 'archived';
  commissionRate: number;
  balanceAvailable: number;
  balancePending: number;
  lifetimeGrossSales: number;
  lifetimeCommissionTaken: number;
  lifetimeVendorEarnings: number;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  approvedAt?: string;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  bannerUrl?: string | null;
  bannerPublicId?: string | null;
  isFeatured?: boolean;
  featuredStartDate?: string | null;
  featuredEndDate?: string | null;
  featuredPriority?: number;
  menuOrder?: number;
  user: {
    id: string; // UUID
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    provider?: 'credentials' | 'google' | 'apple';
  };
}

interface UserSearchResult {
  id: string; // UUID
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  provider?: 'credentials' | 'google' | 'apple';
}

interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function VendorsAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    perPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [commissionFilter, setCommissionFilter] = useState('');
  const [sortBy, setSortBy] = useState('menuOrder');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Sort mode
  const [sortMode, setSortMode] = useState(false);
  const [localVendors, setLocalVendors] = useState<Vendor[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [saveOrderStatus, setSaveOrderStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const preSortSettings = useRef({
    sortBy: 'menuOrder',
    sortOrder: 'ASC' as 'ASC' | 'DESC',
    statusFilter: '',
    perPage: 20,
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Form states
  const [createMode, setCreateMode] = useState<'existing' | 'new'>('existing');
  const [createForm, setCreateForm] = useState({
    userId: '',
    shopName: '',
    shopUrl: '',
    commissionRate: 8, // Store as percentage for UI
    status: 'pending',
    adminNotes: '',
    // For new user creation
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [createError, setCreateError] = useState('');

  const [rejectionReason, setRejectionReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    method: 'manual',
    notes: '',
  });
  const [featuredForm, setFeaturedForm] = useState({
    isFeatured: false,
    featuredStartDate: '',
    featuredEndDate: '',
    featuredPriority: 0,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    totalSales: 0,
    totalCommissions: 0,
    totalBalanceAvailable: 0,
    payoutsCompleted: 0,
  });

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.perPage.toString(),
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (commissionFilter) params.append('commissionType', commissionFilter);

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(`${getApiUrl()}/api/admin/vendors?${params}`, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setVendors(data.data.vendors);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(`${getApiUrl()}/api/admin/vendors/stats`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchVendors();
    }
  }, [pagination.currentPage, statusFilter, sortBy, sortOrder, session?.accessToken]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchStats();
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (sortMode && vendors.length > 0) {
      setLocalVendors([...vendors]);
      setHasOrderChanges(false);
    }
  }, [vendors, sortMode]);

  // Search users for vendor creation
  const handleUserSearch = async (query: string) => {
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

      const response = await fetch(
        `${getApiUrl()}/api/admin/vendors/search-users?q=${encodeURIComponent(query)}`,
        {
          headers,
          credentials: 'include',
        },
      );
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Failed to search vendors:', error);
    }
  };

  // Handle create vendor
  const openCreateModal = () => {
    setCreateMode('existing');
    setCreateForm({
      userId: '',
      shopName: '',
      shopUrl: '',
      commissionRate: 8,
      status: 'pending',
      adminNotes: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    });
    setUserSearch('');
    setSearchResults([]);
    setSelectedUser(null);
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setCreateForm({ ...createForm, userId: user.id }); // Already a string (UUID)
    setUserSearch(user.email);
    setSearchResults([]);
  };

  const handleCreateVendor = async () => {
    setCreateError('');

    if (createMode === 'existing') {
      // Validate existing user mode
      if (!createForm.userId || !createForm.shopName || !createForm.shopUrl) {
        setCreateError('Please select a user and provide shop name and URL');
        return;
      }

      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        const response = await fetch(`${getApiUrl()}/api/admin/vendors/create`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            userId: createForm.userId, // Keep as string (UUID)
            shopName: createForm.shopName,
            shopUrl: createForm.shopUrl,
            commissionRate: createForm.commissionRate / 100, // Convert to decimal
            status: createForm.status,
            adminNotes: createForm.adminNotes,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setShowCreateModal(false);
          fetchVendors();
          fetchStats();
          alert('Vendor created successfully');
        } else {
          setCreateError(data.message || 'Failed to create vendor');
        }
      } catch (error) {
        setCreateError('Failed to create vendor');
      }
    } else {
      // Validate new user mode
      if (
        !createForm.email ||
        !createForm.password ||
        !createForm.shopName ||
        !createForm.shopUrl
      ) {
        setCreateError('All required fields must be filled');
        return;
      }

      if (createForm.password.length < 8) {
        setCreateError('Password must be at least 8 characters');
        return;
      }

      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        const response = await fetch(`${getApiUrl()}/api/admin/vendors/create-with-user`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            user: {
              email: createForm.email,
              password: createForm.password,
              firstName: createForm.firstName,
              lastName: createForm.lastName,
            },
            vendor: {
              shopName: createForm.shopName,
              shopUrl: createForm.shopUrl,
              commissionRate: createForm.commissionRate / 100, // Convert to decimal
              status: createForm.status,
              adminNotes: createForm.adminNotes,
            },
          }),
        });

        const data = await response.json();

        if (data.success) {
          setShowCreateModal(false);
          fetchVendors();
          fetchStats();
          alert('User and vendor created successfully');
        } else {
          setCreateError(data.message || 'Failed to create user and vendor');
        }
      } catch (error) {
        setCreateError('Failed to create user and vendor');
      }
    }
  };

  // Handle search
  const handleVendorSearch = () => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchVendors();
  };

  // Handle approve
  const openApproveModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowApproveModal(true);
  };

  const handleApproveVendor = async () => {
    if (!selectedVendor) return;

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(
        `${getApiUrl()}/api/admin/vendors/${selectedVendor.id}/approve`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
        },
      );

      const data = await response.json();

      if (data.success) {
        setShowApproveModal(false);
        fetchVendors();
        fetchStats();
      } else {
        alert(data.message || 'Failed to approve vendor');
      }
    } catch (error) {
      alert('Failed to approve vendor');
    }
  };

  // Handle reject
  const openRejectModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectVendor = async () => {
    if (!selectedVendor || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(`${getApiUrl()}/api/admin/vendors/${selectedVendor.id}/reject`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await response.json();

      if (data.success) {
        setShowRejectModal(false);
        fetchVendors();
        fetchStats();
      } else {
        alert(data.message || 'Failed to reject vendor');
      }
    } catch (error) {
      alert('Failed to reject vendor');
    }
  };

  // Handle suspend
  const openSuspendModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setSuspendReason('');
    setShowSuspendModal(true);
  };

  const handleSuspendVendor = async () => {
    if (!selectedVendor) return;

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(
        `${getApiUrl()}/api/admin/vendors/${selectedVendor.id}/suspend`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ reason: suspendReason }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setShowSuspendModal(false);
        fetchVendors();
        fetchStats();
      } else {
        alert(data.message || 'Failed to suspend vendor');
      }
    } catch (error) {
      alert('Failed to suspend vendor');
    }
  };

  // Handle payout
  const openPayoutModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setPayoutForm({
      amount: '',
      method: 'manual',
      notes: '',
    });
    setShowPayoutModal(true);
  };

  const handleCreatePayout = async () => {
    if (!selectedVendor) return;

    const amount = parseFloat(payoutForm.amount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payout amount');
      return;
    }

    if (amount > selectedVendor.balanceAvailable) {
      alert(`Amount exceeds available balance ($${selectedVendor.balanceAvailable.toFixed(2)})`);
      return;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(
        `${getApiUrl()}/api/admin/vendors/${selectedVendor.id}/payouts`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payoutForm),
        },
      );

      const data = await response.json();

      if (data.success) {
        setShowPayoutModal(false);
        fetchVendors();
        fetchStats();
        alert('Payout created successfully');
      } else {
        alert(data.message || 'Failed to create payout');
      }
    } catch (error) {
      alert('Failed to create payout');
    }
  };

  // Handle featured vendor
  const openFeaturedModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFeaturedForm({
      isFeatured: vendor.isFeatured || false,
      featuredStartDate: vendor.featuredStartDate
        ? new Date(vendor.featuredStartDate).toISOString().slice(0, 16)
        : '',
      featuredEndDate: vendor.featuredEndDate
        ? new Date(vendor.featuredEndDate).toISOString().slice(0, 16)
        : '',
      featuredPriority: vendor.featuredPriority || 0,
    });
    setShowFeaturedModal(true);
  };

  const handleUpdateFeatured = async () => {
    if (!selectedVendor) return;

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(
        `${getApiUrl()}/api/admin/vendors/${selectedVendor.id}/featured`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            isFeatured: featuredForm.isFeatured,
            featuredStartDate: featuredForm.featuredStartDate || null,
            featuredEndDate: featuredForm.featuredEndDate || null,
            featuredPriority: featuredForm.featuredPriority,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setShowFeaturedModal(false);
        fetchVendors();
        alert('Featured status updated successfully');
      } else {
        alert(data.message || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Update featured error:', error);
      alert('Failed to update featured status');
    }
  };

  // ─── Sort Mode ────────────────────────────────────────────────

  const enterSortMode = () => {
    preSortSettings.current = { sortBy, sortOrder, statusFilter, perPage: pagination.perPage };
    setSortMode(true);
    setSortBy('menuOrder');
    setSortOrder('ASC');
    setSearch('');
    setStatusFilter('');
    setCommissionFilter('');
    setPagination((p) => ({ ...p, currentPage: 1, perPage: 100 }));
    setHasOrderChanges(false);
    setSaveOrderStatus('idle');
  };

  const exitSortMode = () => {
    if (hasOrderChanges && !confirm('You have unsaved changes. Exit sort mode?')) return;
    const prev = preSortSettings.current;
    setSortMode(false);
    setSortBy(prev.sortBy);
    setSortOrder(prev.sortOrder);
    setStatusFilter(prev.statusFilter);
    setPagination((p) => ({ ...p, currentPage: 1, perPage: prev.perPage }));
    setHasOrderChanges(false);
    setSaveOrderStatus('idle');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSortDragStart = (index: number) => setDraggedIndex(index);

  const handleSortDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleSortDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const updated = [...localVendors];
    const [dragged] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, dragged);
    const base = (pagination.currentPage - 1) * pagination.perPage;
    setLocalVendors(updated.map((v, i) => ({ ...v, menuOrder: base + i + 1 })));
    setHasOrderChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSortDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveSortItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localVendors.length) return;
    const updated = [...localVendors];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const base = (pagination.currentPage - 1) * pagination.perPage;
    setLocalVendors(updated.map((v, i) => ({ ...v, menuOrder: base + i + 1 })));
    setHasOrderChanges(true);
  };

  const handleSaveOrder = async () => {
    setSaveOrderStatus('saving');
    try {
      const items = localVendors.map((v) => ({ id: Number(v.id), menuOrder: v.menuOrder || 0 }));
      await api.put('/admin/vendors/menu-order', { items });
      setSaveOrderStatus('success');
      setHasOrderChanges(false);
      setTimeout(() => setSaveOrderStatus('idle'), 3000);
    } catch {
      setSaveOrderStatus('error');
      setTimeout(() => setSaveOrderStatus('idle'), 5000);
    }
  };

  const handleResetOrder = () => {
    setLocalVendors([...vendors]);
    setHasOrderChanges(false);
  };

  // Status badge colors
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-w-0">
      {/* Sort Mode Banner */}
      {sortMode && (
        <div className="mb-4 bg-blue-50 border border-blue-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={['fal', 'sort']} className="text-blue-600" />
            <span className="font-medium text-blue-900">Sort Mode</span>
            <span className="text-sm text-blue-700">
              — Drag and drop to reorder vendors by menu order.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasOrderChanges && (
              <button
                onClick={handleResetOrder}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSaveOrder}
              disabled={!hasOrderChanges || saveOrderStatus === 'saving'}
              className={`px-5 py-1.5 text-sm font-medium text-white transition-colors ${
                hasOrderChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saveOrderStatus === 'saving' ? (
                <>
                  <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Order'
              )}
            </button>
            <button
              onClick={exitSortMode}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-700 hover:bg-red-50"
            >
              Exit Sort
            </button>
          </div>
        </div>
      )}
      {saveOrderStatus === 'success' && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'check-circle']} />
          Vendor menu order saved successfully!
        </div>
      )}
      {saveOrderStatus === 'error' && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 flex items-center gap-2">
          <FontAwesomeIcon icon={['fal', 'exclamation-circle']} />
          Failed to save menu order. Please try again.
        </div>
      )}
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage vendor applications, approvals, and payouts
          </p>
        </div>
        {!sortMode && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={enterSortMode}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={['fal', 'sort']} className="text-base" />
              Sort Vendors
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center sm:justify-start w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2 text-base" />
              Create Vendor
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {stats.pending.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {stats.approved.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatCurrency(stats.totalSales)}
          </p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Commissions</p>
          <p className="text-2xl font-bold text-secondary mt-1">
            {formatCurrency(stats.totalCommissions)}
          </p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Balance Due</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {formatCurrency(stats.totalBalanceAvailable)}
          </p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Payouts Done</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {stats.payoutsCompleted.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Status Count Tabs */}
      {!sortMode && (
        <div className="flex flex-wrap items-center gap-1 text-sm mb-4 border-b border-gray-200 pb-3">
          {[
            { key: '', label: 'All', count: stats.total },
            { key: 'approved', label: 'Approved', count: stats.approved },
            { key: 'pending', label: 'Pending', count: stats.pending },
            { key: 'rejected', label: 'Rejected', count: stats.rejected },
            { key: 'suspended', label: 'Suspended', count: stats.suspended },
          ].map((tab, i) => (
            <span key={tab.key} className="flex items-center">
              {i > 0 && <span className="text-gray-300 mx-1">|</span>}
              <button
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPagination((p) => ({ ...p, currentPage: 1 }));
                }}
                className={`px-1 py-1 transition-colors ${
                  statusFilter === tab.key
                    ? 'font-semibold text-gray-900'
                    : 'text-blue-600 hover:underline'
                }`}
              >
                {tab.label} ({tab.count.toLocaleString()})
              </button>
            </span>
          ))}
        </div>
      )}

      {!sortMode && (
        <div className="bg-white p-3 sm:p-4 border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={['fal', 'search']}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by shop name, owner email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVendorSearch()}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Commission Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission</label>
              <select
                value={commissionFilter}
                onChange={(e) => setCommissionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">All</option>
                <option value="default">Default (8%)</option>
                <option value="custom">Custom Rate</option>
              </select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <button
                onClick={handleVendorSearch}
                className="w-full px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <FontAwesomeIcon icon={['fal', 'filter']} className="mr-2 text-base" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort Mode: Drag & Drop View */}
      {sortMode && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="hidden lg:grid grid-cols-[60px_56px_1fr_160px_90px_80px] gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Order</div>
            <div></div>
            <div>Store</div>
            <div>Email</div>
            <div>Status</div>
            <div>Move</div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <FontAwesomeIcon
                icon={['fal', 'spinner-third']}
                spin
                className="text-4xl text-blue-500"
              />
            </div>
          ) : localVendors.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">No vendors found</div>
          ) : (
            <>
              <div className="hidden lg:block">
                {localVendors.map((vendor, index) => (
                  <div
                    key={vendor.id}
                    draggable
                    onDragStart={() => handleSortDragStart(index)}
                    onDragOver={(e) => handleSortDragOver(e, index)}
                    onDrop={(e) => handleSortDrop(e, index)}
                    onDragEnd={handleSortDragEnd}
                    className={`grid grid-cols-[60px_56px_1fr_160px_90px_80px] gap-2 px-4 py-3 border-b items-center transition-colors cursor-grab active:cursor-grabbing ${
                      draggedIndex === index
                        ? 'bg-blue-50 opacity-50'
                        : dragOverIndex === index
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={['fal', 'grip-vertical']} className="text-gray-400" />
                      <span className="text-sm font-mono text-gray-500">
                        {vendor.menuOrder ?? index + 1}
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-gray-100 overflow-hidden flex-shrink-0 rounded">
                      <CloudinaryImage
                        src={vendor.logoUrl}
                        alt={vendor.shopName}
                        width={96}
                        height={96}
                        className="w-full h-full"
                        fallbackIcon={['fal', 'store']}
                        fallbackText={vendor.shopName.charAt(0).toUpperCase()}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {vendor.shopName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">/{vendor.shopUrl}</p>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {vendor.user?.email ?? '—'}
                    </div>
                    <div>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold border rounded ${getStatusBadgeClass(vendor.status)}`}
                      >
                        {vendor.status}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveSortItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-xs" />
                      </button>
                      <button
                        onClick={() => moveSortItem(index, 'down')}
                        disabled={index === localVendors.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:hidden">
                {localVendors.map((vendor, index) => (
                  <div
                    key={vendor.id}
                    draggable
                    onDragStart={() => handleSortDragStart(index)}
                    onDragOver={(e) => handleSortDragOver(e, index)}
                    onDrop={(e) => handleSortDrop(e, index)}
                    onDragEnd={handleSortDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 border-b cursor-grab active:cursor-grabbing ${
                      draggedIndex === index
                        ? 'bg-blue-50 opacity-50'
                        : dragOverIndex === index
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={['fal', 'grip-vertical']}
                      className="text-gray-400 flex-shrink-0"
                    />
                    <span className="text-sm font-mono text-gray-500 w-8 flex-shrink-0">
                      {vendor.menuOrder ?? index + 1}
                    </span>
                    <div className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0 rounded">
                      <CloudinaryImage
                        src={vendor.logoUrl}
                        alt={vendor.shopName}
                        width={80}
                        height={80}
                        className="w-full h-full"
                        fallbackIcon={['fal', 'store']}
                        fallbackText={vendor.shopName.charAt(0).toUpperCase()}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {vendor.shopName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">/{vendor.shopUrl}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveSortItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={['fal', 'arrow-up']} className="text-xs" />
                      </button>
                      <button
                        onClick={() => moveSortItem(index, 'down')}
                        disabled={index === localVendors.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={['fal', 'arrow-down']} className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!sortMode && (
        <>
          {/* Vendors Table */}
          <div className="bg-white border border-gray-200 shadow-sm min-w-0">
            <ResponsiveDataView
              breakpoint="lg"
              mobile={
                loading ? (
                  <div className="px-6 py-12 text-center text-gray-500">Loading vendors...</div>
                ) : vendors.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">No vendors found</div>
                ) : (
                  <MobileCardList gap="md" className="p-4">
                    {vendors.map((vendor) => {
                      const vendorActions = [];
                      vendorActions.push({
                        label: 'View',
                        icon: <FontAwesomeIcon icon={['fal', 'eye']} className="text-xs" />,
                        href: `/admin/vendors/${vendor.id}`,
                        variant: 'primary' as const,
                      });
                      vendorActions.push({
                        label: 'Edit',
                        icon: <FontAwesomeIcon icon={['fal', 'edit']} className="text-xs" />,
                        href: `/admin/vendors/${vendor.id}/edit`,
                        variant: 'secondary' as const,
                      });
                      if (vendor.status === 'pending') {
                        vendorActions.push({
                          label: 'Approve',
                          icon: <FontAwesomeIcon icon={['fal', 'check']} className="text-xs" />,
                          onClick: () => openApproveModal(vendor),
                          variant: 'primary' as const,
                        });
                        vendorActions.push({
                          label: 'Reject',
                          icon: <FontAwesomeIcon icon={['fal', 'ban']} className="text-xs" />,
                          onClick: () => openRejectModal(vendor),
                          variant: 'danger' as const,
                        });
                      }
                      if (vendor.status === 'approved' || vendor.status === 'active') {
                        vendorActions.push({
                          label: 'Suspend',
                          icon: <FontAwesomeIcon icon={['fal', 'pause']} className="text-xs" />,
                          onClick: () => openSuspendModal(vendor),
                          variant: 'danger' as const,
                        });
                      }
                      return (
                        <MobileCard
                          key={vendor.id}
                          onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                          thumbnail={
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                              <CloudinaryImage
                                src={vendor.logoUrl}
                                alt={vendor.shopName}
                                width={80}
                                height={80}
                                className="w-full h-full"
                                fallbackIcon={['fal', 'store']}
                                fallbackText={vendor.shopName.charAt(0).toUpperCase()}
                              />
                            </div>
                          }
                          title={vendor.shopName}
                          subtitle={
                            vendor.user.name || `${vendor.user.firstName} ${vendor.user.lastName}`
                          }
                          badge={
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold border rounded ${getStatusBadgeClass(vendor.status)}`}
                            >
                              {vendor.status.toUpperCase()}
                            </span>
                          }
                          details={[
                            {
                              label: 'Commission',
                              value: (
                                <span
                                  className={
                                    vendor.commissionRate !== 0.08
                                      ? 'font-semibold text-orange-600'
                                      : ''
                                  }
                                >
                                  {(vendor.commissionRate * 100).toFixed(0)}%
                                </span>
                              ),
                            },
                            { label: 'Balance', value: formatCurrency(vendor.balanceAvailable) },
                            {
                              label: 'Lifetime Sales',
                              value: formatCurrency(vendor.lifetimeGrossSales),
                            },
                            {
                              label: 'Joined',
                              value: new Date(vendor.createdAt).toLocaleDateString(),
                            },
                          ]}
                          actions={vendorActions}
                        />
                      );
                    })}
                  </MobileCardList>
                )
              }
              desktop={
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Shop
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Lifetime Sales
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-48">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                            Loading vendors...
                          </td>
                        </tr>
                      ) : vendors.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                            No vendors found
                          </td>
                        </tr>
                      ) : (
                        vendors.map((vendor) => (
                          <tr
                            key={vendor.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                                  <CloudinaryImage
                                    src={vendor.logoUrl}
                                    alt={vendor.shopName}
                                    width={80}
                                    height={80}
                                    className="w-full h-full"
                                    fallbackIcon={['fal', 'store']}
                                    fallbackText={vendor.shopName.charAt(0).toUpperCase()}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {vendor.shopName}
                                  </div>
                                  <div className="text-sm text-gray-500">/{vendor.shopUrl}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {vendor.user.name ||
                                  `${vendor.user.firstName} ${vendor.user.lastName}`}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {vendor.user.provider === 'google' && (
                                  <span className="inline-flex items-center text-xs text-gray-600 bg-white border border-gray-300 px-2 py-0.5 rounded">
                                    <FontAwesomeIcon
                                      icon={['fab', 'google']}
                                      className="text-sm mr-1"
                                    />
                                    Google
                                  </span>
                                )}
                                {vendor.user.provider === 'apple' && (
                                  <span className="inline-flex items-center text-xs text-gray-900 bg-white border border-gray-300 px-2 py-0.5 rounded">
                                    <FontAwesomeIcon
                                      icon={['fab', 'apple']}
                                      className="text-sm mr-1"
                                    />
                                    Apple
                                  </span>
                                )}
                                {vendor.user.provider === 'credentials' && (
                                  <span className="inline-flex items-center text-xs text-gray-600 bg-white border border-gray-300 px-2 py-0.5 rounded">
                                    <FontAwesomeIcon
                                      icon={['fal', 'key']}
                                      className="text-sm mr-1"
                                    />
                                    Email/Password
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold border ${getStatusBadgeClass(vendor.status)}`}
                              >
                                {vendor.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span
                                className={
                                  vendor.commissionRate !== 0.08
                                    ? 'font-semibold text-orange-600'
                                    : ''
                                }
                              >
                                {(vendor.commissionRate * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                              {formatCurrency(vendor.balanceAvailable)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatCurrency(vendor.lifetimeGrossSales)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(vendor.createdAt).toLocaleDateString()}
                            </td>
                            <td
                              className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                                className="text-blue-600 hover:text-blue-900 mr-2"
                                title="View Details"
                              >
                                <FontAwesomeIcon icon={['fal', 'eye']} className="text-sm" />
                              </button>
                              <button
                                onClick={() => router.push(`/admin/vendors/${vendor.id}/edit`)}
                                className="text-yellow-600 hover:text-yellow-900 mr-2"
                                title="Edit Vendor"
                              >
                                <FontAwesomeIcon icon={['fal', 'edit']} className="text-sm" />
                              </button>
                              {vendor.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => openApproveModal(vendor)}
                                    className="text-green-600 hover:text-green-900 mr-2"
                                    title="Approve"
                                  >
                                    <FontAwesomeIcon icon={['fal', 'check']} className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(vendor)}
                                    className="text-red-600 hover:text-red-900 mr-2"
                                    title="Reject"
                                  >
                                    <FontAwesomeIcon icon={['fal', 'ban']} className="text-sm" />
                                  </button>
                                </>
                              )}
                              {(vendor.status === 'approved' || vendor.status === 'active') && (
                                <>
                                  <button
                                    onClick={() => openFeaturedModal(vendor)}
                                    className={`mr-2 ${vendor.isFeatured ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                    title={
                                      vendor.isFeatured ? 'Manage Featured Status' : 'Make Featured'
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={[vendor.isFeatured ? 'fas' : 'fal', 'star']}
                                      className="text-sm"
                                    />
                                  </button>
                                  <button
                                    onClick={() => openSuspendModal(vendor)}
                                    className="text-gray-600 hover:text-gray-900 mr-2"
                                    title="Suspend"
                                  >
                                    <FontAwesomeIcon icon={['fal', 'pause']} className="text-sm" />
                                  </button>
                                  {vendor.balanceAvailable > 0 && (
                                    <button
                                      onClick={() => openPayoutModal(vendor)}
                                      className="text-green-600 hover:text-green-900"
                                      title="Create Payout"
                                    >
                                      <FontAwesomeIcon
                                        icon={['fal', 'money-bill-wave']}
                                        className="text-sm"
                                      />
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              }
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-3 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.currentPage - 1) * pagination.perPage + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{' '}
                  {pagination.total} vendors
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))
                    }
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-sm" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))
                    }
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-sm" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Vendor Modal */}
      <CreateVendorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateVendor}
        createMode={createMode}
        onModeChange={(mode) => {
          setCreateMode(mode);
          if (mode === 'new') {
            setSelectedUser(null);
            setUserSearch('');
          }
        }}
        form={createForm}
        onFormChange={setCreateForm}
        error={createError}
        userSearch={userSearch}
        onUserSearchChange={handleUserSearch}
        searchResults={searchResults}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
      />

      {/* Approve Modal */}
      <ApproveVendorModal
        isOpen={showApproveModal && selectedVendor !== null}
        onClose={() => setShowApproveModal(false)}
        onApprove={handleApproveVendor}
        vendorName={selectedVendor?.shopName || ''}
      />

      {/* Reject Modal */}
      <RejectVendorModal
        isOpen={showRejectModal && selectedVendor !== null}
        onClose={() => setShowRejectModal(false)}
        onReject={handleRejectVendor}
        vendorName={selectedVendor?.shopName || ''}
        rejectionReason={rejectionReason}
        onReasonChange={setRejectionReason}
      />

      {/* Suspend Modal */}
      <SuspendVendorModal
        isOpen={showSuspendModal && selectedVendor !== null}
        onClose={() => setShowSuspendModal(false)}
        onSuspend={handleSuspendVendor}
        vendorName={selectedVendor?.shopName || ''}
        suspendReason={suspendReason}
        onReasonChange={setSuspendReason}
      />

      {/* Payout Modal */}
      <PayoutModal
        isOpen={showPayoutModal && selectedVendor !== null}
        onClose={() => setShowPayoutModal(false)}
        onCreate={handleCreatePayout}
        vendorName={selectedVendor?.shopName || ''}
        availableBalance={selectedVendor?.balanceAvailable || 0}
        payoutForm={payoutForm}
        onFormChange={setPayoutForm}
        formatCurrency={formatCurrency}
      />

      {/* Featured Vendor Modal */}
      <FeaturedVendorModal
        isOpen={showFeaturedModal && selectedVendor !== null}
        onClose={() => setShowFeaturedModal(false)}
        onSave={handleUpdateFeatured}
        vendorName={selectedVendor?.shopName || ''}
        featuredForm={featuredForm}
        onFormChange={setFeaturedForm}
      />
    </div>
  );
}
