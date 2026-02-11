'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import adminApi from '@/lib/admin-api-client';

export default function AdminMembershipNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '30',
    features: '',
    description: '',
    status: 'active',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const session = await getSession();
      const response = await adminApi.post('/admin/memberships', data, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Membership created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-memberships'] });
      router.push('/admin/memberships');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create membership');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      features: formData.features.split('\n').filter((f: string) => f.trim()),
    };
    createMutation.mutate(dataToSend);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/memberships" className="text-gray-600 hover:text-gray-900">
          <FontAwesomeIcon icon={['fal', 'arrow-left'] as [string, string]} className="text-lg" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Membership Plan</h1>
          <p className="text-gray-600 mt-1">Admin - Memberships - New</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="bg-white shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Plan Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., Premium Plan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="9.99"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Brief description of the plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features (one per line)
            </label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Feature 1\nFeature 2\nFeature 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/memberships"
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2 text-base" />
            {createMutation.isPending ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
