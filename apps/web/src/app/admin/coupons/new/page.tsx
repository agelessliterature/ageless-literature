'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import CouponForm from '@/components/coupons/CouponForm';
import type { CouponFormData } from '@/components/coupons/CouponForm';
import { toast } from 'react-hot-toast';

export default function AdminCreateCouponPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CouponFormData) => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('api/admin/coupons'), {
        method: 'POST',
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
        toast.success('Coupon created successfully');
        router.push(withBasePath('/admin/coupons'));
      } else {
        toast.error(json.error || 'Failed to create coupon');
      }
    } catch (err) {
      toast.error('Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Create Coupon</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new discount coupon</p>
        </div>
      </div>

      <CouponForm onSubmit={handleSubmit} loading={loading} submitLabel="Create Coupon" />
    </div>
  );
}
