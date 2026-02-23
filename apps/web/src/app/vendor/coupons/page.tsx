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
  redemptionCount: number;
  totalDiscountGiven: number;
  createdAt: string;
}

export default function VendorCouponsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCoupons = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);

      const res = await fetch(getApiUrl(`api/vendor/coupons?${params}`), {
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
  }, [session?.accessToken, page, search]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(getApiUrl(`api/vendor/coupons/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const json = await res.json();
      if (json.success) fetchCoupons();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(getApiUrl(`api/vendor/coupons/${coupon.id}`), {
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
      console.error('Error toggling:', err);
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Create discount coupons for your products</p>
        </div>
        <button
          onClick={() => router.push(withBasePath('/vendor/coupons/new'))}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-primary-dark transition-colors font-medium"
        >
          <FontAwesomeIcon icon={['fal', 'plus']} />
          Create Coupon
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 mb-6">
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

      {/* Table */}
      <div className="bg-white overflow-hidden">
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
            <p className="text-gray-500 mb-4">You haven&apos;t created any coupons yet</p>
            <button
              onClick={() => router.push(withBasePath('/vendor/coupons/new'))}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <FontAwesomeIcon icon={['fal', 'plus']} />
              Create Your First Coupon
            </button>
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
                    Used
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
                            router.push(withBasePath(`/vendor/coupons/${coupon.id}/edit`))
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
