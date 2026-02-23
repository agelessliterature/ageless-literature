'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import adminApi from '@/lib/admin-api-client';

export default function AdminUserCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'customer',
    status: 'active',
    defaultLanguage: 'en',
  });
  const [error, setError] = useState('');

  const getErrorMessage = (err: unknown) => {
    const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
    return errorObj.response?.data?.message || errorObj.message || 'Failed to create user';
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const session = await getSession();

      if (!session?.accessToken) {
        throw new Error('Authentication token not available. Please log in again.');
      }

      const response = await adminApi.post('/admin/users/create', data, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      router.push('/admin/users');
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
            Back to Users
          </Link>
        </div>
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6" autoComplete="off">
          <div className="bg-white shadow p-6 space-y-4">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Create User</h1>
              <p className="text-gray-600 mt-2">Enter user information and account details</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="customer">Collector</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
                </select>
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
                  <option value="pending">Pending</option>
                  <option value="revoked">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={formData.defaultLanguage}
                  onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-primary text-white py-3 px-6  font-medium hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2 text-base" />
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
              <Link
                href="/admin/users"
                className="px-6 py-3 border border-gray-300  font-medium hover:transition text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
