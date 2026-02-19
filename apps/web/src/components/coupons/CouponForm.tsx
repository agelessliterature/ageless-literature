'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

export interface CouponFormData {
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  scope: 'global' | 'vendor' | 'products' | 'categories';
  stackable: boolean;
}

interface CouponFormProps {
  initialData?: Partial<CouponFormData>;
  onSubmit: (data: CouponFormData) => Promise<void>;
  isVendor?: boolean;
  loading?: boolean;
  submitLabel?: string;
}

const defaultFormData: CouponFormData = {
  code: '',
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minimumOrderAmount: '',
  maximumDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '1',
  startsAt: '',
  expiresAt: '',
  isActive: true,
  scope: 'global',
  stackable: false,
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CouponForm({
  initialData,
  onSubmit,
  isVendor = false,
  loading = false,
  submitLabel = 'Create Coupon',
}: CouponFormProps) {
  const [form, setForm] = useState<CouponFormData>({ ...defaultFormData, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field: keyof CouponFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.code.trim()) errs.code = 'Code is required';
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.discountType) errs.discountType = 'Discount type is required';

    if (form.discountType !== 'free_shipping') {
      const val = parseFloat(form.discountValue);
      if (!form.discountValue || isNaN(val) || val <= 0) {
        errs.discountValue = 'Discount value must be greater than 0';
      }
      if (form.discountType === 'percentage' && val > 100) {
        errs.discountValue = 'Percentage cannot exceed 100';
      }
    }

    if (form.startsAt && form.expiresAt && new Date(form.startsAt) >= new Date(form.expiresAt)) {
      errs.expiresAt = 'Expiry date must be after start date';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Code & Name */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coupon Code <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className={`flex-1 px-4 py-2 border rounded-md focus:ring-primary focus:border-primary ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => handleChange('code', generateCode())}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
                title="Generate random code"
              >
                <FontAwesomeIcon icon={['fal', 'random']} />
              </button>
            </div>
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Summer Sale 20% Off"
              className={`w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description for internal reference"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Discount Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.discountType}
              onChange={(e) => handleChange('discountType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ($)</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>

          {form.discountType !== 'free_shipping' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  {form.discountType === 'percentage' ? '%' : '$'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.discountType === 'percentage' ? '100' : undefined}
                  value={form.discountValue}
                  onChange={(e) => handleChange('discountValue', e.target.value)}
                  className={`w-full pl-8 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary ${errors.discountValue ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.discountValue && (
                <p className="text-red-500 text-xs mt-1">{errors.discountValue}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Order Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minimumOrderAmount}
                onChange={(e) => handleChange('minimumOrderAmount', e.target.value)}
                placeholder="No minimum"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {form.discountType === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Discount Cap
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.maximumDiscountAmount}
                  onChange={(e) => handleChange('maximumDiscountAmount', e.target.value)}
                  placeholder="No cap"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Limits & Scheduling */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Limits & Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Usage Limit
            </label>
            <input
              type="number"
              min="0"
              value={form.usageLimit}
              onChange={(e) => handleChange('usageLimit', e.target.value)}
              placeholder="Unlimited"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
            <input
              type="number"
              min="1"
              value={form.perUserLimit}
              onChange={(e) => handleChange('perUserLimit', e.target.value)}
              placeholder="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => handleChange('startsAt', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => handleChange('expiresAt', e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary ${errors.expiresAt ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.expiresAt && <p className="text-red-500 text-xs mt-1">{errors.expiresAt}</p>}
          </div>
        </div>
      </div>

      {/* Status & Options */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Options</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Active (coupon can be used immediately)</span>
          </label>

          {!isVendor && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(e) => handleChange('stackable', e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Stackable (can be combined with other coupons)
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select
                  value={form.scope}
                  onChange={(e) => handleChange('scope', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary max-w-xs"
                >
                  <option value="global">Global (all items)</option>
                  <option value="vendor">Specific Vendor</option>
                  <option value="products">Specific Products</option>
                  <option value="categories">Specific Categories</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? (
            <>
              <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
