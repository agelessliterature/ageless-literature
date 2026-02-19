'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import CouponForm from '@/components/coupons/CouponForm';
import type { CouponFormData } from '@/components/coupons/CouponForm';
import { toast } from 'react-hot-toast';
import { formatMoney } from '@/lib/format';

interface Redemption {
  id: number;
  discountAmount: number;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string } | null;
  order: { id: number; orderNumber: string; totalAmount: number } | null;
}

export default function AdminEditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialData, setInitialData] = useState<Partial<CouponFormData> | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [stats, setStats] = useState<{ totalRedemptions: number; totalDiscount: number } | null>(
    null,
  );

  useEffect(() => {
    if (!session?.accessToken || !id) return;

    const fetchCoupon = async () => {
      try {
        const res = await fetch(getApiUrl(`api/admin/coupons/${id}`), {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const json = await res.json();
        if (json.success) {
          const c = json.data;
          setInitialData({
            code: c.code,
            name: c.name,
            description: c.description || '',
            discountType: c.discountType,
            discountValue:
              c.discountType === 'free_shipping' ? '' : String(parseFloat(c.discountValue)),
            minimumOrderAmount: c.minimumOrderAmount
              ? String(parseFloat(c.minimumOrderAmount))
              : '',
            maximumDiscountAmount: c.maximumDiscountAmount
              ? String(parseFloat(c.maximumDiscountAmount))
              : '',
            usageLimit: c.usageLimit ? String(c.usageLimit) : '',
            perUserLimit: String(c.perUserLimit || 1),
            startsAt: c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 16) : '',
            expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
            isActive: c.isActive,
            scope: c.scope,
            stackable: c.stackable,
          });
          setRedemptions(c.redemptions || []);
          setStats(c.stats || null);
        }
      } catch (err) {
        console.error('Error fetching coupon:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchCoupon();
  }, [session?.accessToken, id]);

  const handleSubmit = async (data: CouponFormData) => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`api/admin/coupons/${id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          discountValue: data.discountType === 'free_shipping' ? 0 : parseFloat(data.discountValue),
          minimumOrderAmount: data.minimumOrderAmount ? parseFloat(data.minimumOrderAmount) : null,
          maximumDiscountAmount: data.maximumDiscountAmount
            ? parseFloat(data.maximumDiscountAmount)
            : null,
          usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
          perUserLimit: data.perUserLimit ? parseInt(data.perUserLimit) : 1,
          startsAt: data.startsAt || null,
          expiresAt: data.expiresAt || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Coupon updated successfully');
        router.push(withBasePath('/admin/coupons'));
      } else {
        toast.error(json.error || 'Failed to update coupon');
      }
    } catch (err) {
      toast.error('Failed to update coupon');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-4xl text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(withBasePath('/admin/coupons'))}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Coupon</h1>
          <p className="text-sm text-gray-500 mt-1">Update coupon settings</p>
        </div>
      </div>

      {initialData && (
        <CouponForm
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Update Coupon"
        />
      )}

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Redemption History
              {stats && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({stats.totalRedemptions} total,{' '}
                  {formatMoney(stats.totalDiscount, { fromCents: false })} in discounts)
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Unknown'}
                      <span className="block text-xs text-gray-400">{r.user?.email}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {r.order ? `#${r.order.orderNumber}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      -{formatMoney(r.discountAmount, { fromCents: false })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
