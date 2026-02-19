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

export default function VendorEditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialData, setInitialData] = useState<Partial<CouponFormData> | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !id) return;

    const fetchCoupon = async () => {
      try {
        const res = await fetch(getApiUrl(`api/vendor/coupons/${id}`), {
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
            stackable: c.stackable || false,
          });
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
      const res = await fetch(getApiUrl(`api/vendor/coupons/${id}`), {
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
        router.push(withBasePath('/vendor/coupons'));
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
          onClick={() => router.push(withBasePath('/vendor/coupons'))}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <FontAwesomeIcon icon={['fal', 'arrow-left']} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Coupon</h1>
          <p className="text-sm text-gray-500 mt-1">Update your coupon settings</p>
        </div>
      </div>

      {initialData && (
        <CouponForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isVendor={true}
          loading={loading}
          submitLabel="Update Coupon"
        />
      )}
    </div>
  );
}
