'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import { formatMoney } from '@/lib/format';

interface Coupon {
  id: number;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  scope: string;
  vendor?: { id: number; businessName: string } | null;
  redemptionCount: number;
  totalDiscountGiven: number;
  createdAt: string;
}

interface Stats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

export default function AdminCouponsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCoupons = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(getApiUrl(`api/admin/coupons?${params}`), {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setCoupons(json.data.coupons);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, page, search, statusFilter]);

  const fetchStats = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(getApiUrl('api/admin/coupons/stats'), {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(getApiUrl(`api/admin/coupons/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        fetchCoupons();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(getApiUrl(`api/admin/coupons/${coupon.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const json = await res.json();
      if (json.success) fetchCoupons();
    } catch (err) {
      console.error('Error toggling coupon:', err);
    }
  };

  const getDiscountLabel = (coupon: Coupon) => {
    switch (coupon.discountType) {
      case 'percentage':
        return `${parseFloat(String(coupon.discountValue))}% off`;
      case 'fixed_amount':
        return formatMoney(coupon.discountValue, { fromCents: false }) + ' off';
      case 'free_shipping':
        return 'Free Shipping';
      default:
        return '';
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    if (!coupon.isActive) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Inactive
        </span>
      );
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          Expired
        </span>
      );
    }
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          Scheduled
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
        Active
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Manage discount coupons and promotions</p>
        </div>
        <button
          onClick={() => router.push(withBasePath('/admin/coupons/new'))}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors font-medium"
        >
          <FontAwesomeIcon icon={['fal', 'plus']} />
          Create Coupon
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Total Coupons</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCoupons}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeCoupons}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Total Redemptions</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalRedemptions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-500">Total Discounts Given</p>
            <p className="text-2xl font-bold text-primary">
              {formatMoney(stats.totalDiscountGiven, { fromCents: false })}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <FontAwesomeIcon
              icon={['fal', 'spinner-third']}
              spin
              className="text-4xl text-primary"
            />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20">
            <FontAwesomeIcon icon={['fal', 'ticket-alt']} className="text-5xl text-gray-300 mb-4" />
            <p className="text-gray-500">No coupons found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Scope
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-primary">{coupon.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{coupon.name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {getDiscountLabel(coupon)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(coupon)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {coupon.usageCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize">{coupon.scope}</span>
                      {coupon.vendor && (
                        <span className="block text-xs text-gray-400">
                          {coupon.vendor.businessName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className={`p-1.5 rounded hover:bg-gray-100 ${coupon.isActive ? 'text-green-600' : 'text-gray-400'}`}
                          title={coupon.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <FontAwesomeIcon
                            icon={['fal', coupon.isActive ? 'toggle-on' : 'toggle-off']}
                            className="text-lg"
                          />
                        </button>
                        <button
                          onClick={() =>
                            router.push(withBasePath(`/admin/coupons/${coupon.id}/edit`))
                          }
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={['fal', 'edit']} />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={['fal', 'trash']} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
