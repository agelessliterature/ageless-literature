'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Link from 'next/link';
import DeleteUserModal from '@/components/modals/DeleteUserModal';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import MobileCard from '@/components/ui/MobileCard';
import MobileCardList from '@/components/ui/MobileCardList';
import { getApiUrl } from '@/lib/api-url';

interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  image?: string | null;
  role: 'admin' | 'vendor' | 'customer';
  status: 'active' | 'inactive' | 'pending' | 'revoked';
  emailVerified: boolean;
  provider: 'credentials' | 'google' | 'apple';
  createdAt: string;
  lastLoginAt: string | null;
  profilePhotoUrl?: string | null;
  profilePhotoPublicId?: string | null;
  subscription?: {
    status: string;
    plan: {
      name: string;
      price: number;
    };
  } | null;
  vendorProfile?: {
    id: string;
    shopName: string;
    status: string;
  } | null;
}

interface Pagination {
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function UsersAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    perPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Get API URL using utility function
  const API_URL = getApiUrl();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    vendors: 0,
    withMembership: 0,
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.perPage.toString(),
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (membershipFilter) params.append('membershipStatus', membershipFilter);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const url = `${API_URL}/api/admin/users?${params}`;

      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('[UsersPage] Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
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

      const response = await fetch(`${API_URL}/api/admin/users/stats`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchUsers();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setError('Not authenticated. Please log in.');
    }
  }, [
    pagination.currentPage,
    sortBy,
    sortOrder,
    session?.accessToken,
    status,
    search,
    roleFilter,
    statusFilter,
    membershipFilter,
  ]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchStats();
    }
  }, [session?.accessToken]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [search, roleFilter, statusFilter, membershipFilter]);

  // Handle search
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchUsers();
  };

  // Handle delete user
  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }

      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        fetchUsers();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  // Role display name mapping (DB stores 'customer', UI shows 'Collector')
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'vendor':
        return 'Vendor';
      case 'customer':
        return 'Collector';
      default:
        return role;
    }
  };

  // Role badge colors
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'vendor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'customer':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Status badge colors
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all user accounts, roles, and permissions
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center sm:justify-start w-full sm:w-auto"
        >
          <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2 text-base" />
          Create User
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.admins.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Vendors</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.vendors.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">With Membership</p>
          <p className="text-2xl font-bold text-secondary mt-1">
            {stats.withMembership.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 border border-gray-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
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
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Collector</option>
            </select>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="revoked">Suspended</option>
            </select>
          </div>

          {/* Membership Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Membership</label>
            <select
              value={membershipFilter}
              onChange={(e) => setMembershipFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <FontAwesomeIcon icon={['fal', 'filter']} className="mr-2 text-base" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 shadow-sm">
        <ResponsiveDataView
          breakpoint="lg"
          mobile={
            <div>
              {loading ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full text-3xl border-b-2 border-primary"></div>
                    <div>Loading users...</div>
                  </div>
                </div>
              ) : error ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-red-600 mb-2">{error}</div>
                  <button
                    onClick={() => fetchUsers()}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    Try again
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">No users found</div>
              ) : (
                <MobileCardList gap="sm">
                  {users.map((user) => {
                    const avatarSrc = user.profilePhotoUrl ?? user.image ?? undefined;
                    return (
                      <MobileCard
                        key={user.id}
                        onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                        thumbnail={
                          avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={user.name || user.email}
                              className="h-full w-full object-cover rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                              {(() => {
                                const name = user.name || user.firstName || user.email;
                                const parts = name.trim().split(' ');
                                if (parts.length >= 2) {
                                  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                                }
                                return name.substring(0, 2).toUpperCase();
                              })()}
                            </div>
                          )
                        }
                        title={user.name || 'N/A'}
                        subtitle={user.email}
                        badge={
                          <div className="flex flex-col gap-1 items-end">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadgeClass(user.role)}`}
                            >
                              {user.role}
                            </span>
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(user.status)}`}
                            >
                              {user.status}
                            </span>
                          </div>
                        }
                        details={[
                          {
                            label: 'Joined',
                            value: new Date(user.createdAt).toLocaleDateString(),
                          },
                          {
                            label: 'Membership',
                            value: user.subscription
                              ? `${user.subscription.plan.name} ($${user.subscription.plan.price}/mo)`
                              : 'None',
                          },
                          ...(user.vendorProfile
                            ? [{ label: 'Shop', value: user.vendorProfile.shopName }]
                            : []),
                        ]}
                        actions={[
                          {
                            label: 'Edit',
                            href: `/admin/users/${user.id}/edit`,
                            variant: 'primary' as const,
                          },
                          {
                            label: 'Delete',
                            onClick: () => openDeleteModal(user),
                            variant: 'danger' as const,
                          },
                        ]}
                      />
                    );
                  })}
                </MobileCardList>
              )}
            </div>
          }
          desktop={
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Membership
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full text-3xl border-b-2 border-primary"></div>
                          <div>Loading users...</div>
                          <div className="text-xs text-gray-400">Session status: {status}</div>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-red-600 mb-2">{error}</div>
                        <button
                          onClick={() => fetchUsers()}
                          className="text-sm text-primary hover:text-primary-dark"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const avatarSrc = user.profilePhotoUrl ?? user.image ?? undefined;
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                        >
                          <td className="px-3 sm:px-6 py-4">
                            <div className="flex items-center">
                              {avatarSrc ? (
                                <div className="h-10 w-10 flex-shrink-0 rounded-full relative overflow-hidden">
                                  <img
                                    src={avatarSrc}
                                    alt={user.name || user.email}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                                  {(() => {
                                    const name = user.name || user.firstName || user.email;
                                    const parts = name.trim().split(' ');
                                    if (parts.length >= 2) {
                                      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                                    }
                                    return name.substring(0, 2).toUpperCase();
                                  })()}
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {user.emailVerified && (
                                    <span className="inline-flex items-center text-xs text-green-600">
                                      <FontAwesomeIcon
                                        icon={['fal', 'check']}
                                        className="text-sm mr-1"
                                      />
                                      Verified
                                    </span>
                                  )}
                                  {user.provider === 'google' && (
                                    <span className="inline-flex items-center text-xs text-gray-600 bg-white border border-gray-300 px-2 py-0.5 rounded">
                                      <FontAwesomeIcon
                                        icon={['fab', 'google']}
                                        className="text-sm mr-1"
                                      />
                                      Google
                                    </span>
                                  )}
                                  {user.provider === 'apple' && (
                                    <span className="inline-flex items-center text-xs text-gray-900 bg-white border border-gray-300 px-2 py-0.5 rounded">
                                      <FontAwesomeIcon
                                        icon={['fab', 'apple']}
                                        className="text-sm mr-1"
                                      />
                                      Apple
                                    </span>
                                  )}
                                  {user.provider === 'credentials' && (
                                    <span className="inline-flex items-center text-xs text-gray-600 bg-white border border-gray-300 px-2 py-0.5 rounded">
                                      <FontAwesomeIcon
                                        icon={['fal', 'key']}
                                        className="text-sm mr-1"
                                      />
                                      Email/Password
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold border ${getRoleBadgeClass(user.role)}`}
                            >
                              {user.role}
                            </span>
                            {user.vendorProfile && (
                              <Link
                                href={`/admin/vendors/${user.vendorProfile.id}`}
                                className="block mt-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <FontAwesomeIcon icon={['fal', 'store']} className="mr-1 text-sm" />
                                {user.vendorProfile.shopName}
                              </Link>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold border ${getStatusBadgeClass(user.status)}`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            {user.subscription ? (
                              <div className="text-sm">
                                <div className="font-medium text-gray-900 flex items-center">
                                  <FontAwesomeIcon
                                    icon={['fal', 'crown']}
                                    className="text-sm mr-1 text-secondary"
                                  />
                                  {user.subscription.plan.name}
                                </div>
                                <div className="text-gray-500">
                                  ${user.subscription.plan.price}/mo
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">None</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 text-right text-sm font-medium whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/admin/users/${user.id}/edit`}
                              className="text-yellow-600 hover:text-yellow-900 mr-2"
                              title="Edit User"
                            >
                              <FontAwesomeIcon icon={['fal', 'edit']} className="text-base" />
                            </Link>
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete User"
                            >
                              <FontAwesomeIcon icon={['fal', 'trash']} className="text-base" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
              {pagination.total} users
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

      {/* Delete Confirmation Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal && selectedUser !== null}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDeleteUser}
        userName={selectedUser?.name || selectedUser?.email || ''}
      />
    </div>
  );
}
