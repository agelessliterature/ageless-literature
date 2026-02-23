'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import adminApi from '@/lib/admin-api-client';
import { ImageUploader } from '@/components/cloudinary';

export default function AdminUserEditPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    status: '',
    phoneNumber: '',
    defaultLanguage: '',
    profilePhotoUrl: '',
    profilePhotoPublicId: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: userData, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const session = await getSession();
      const { data } = await adminApi.get(`/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return data.data;
    },
    enabled: !!id && isMounted,
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        role: userData.role || 'customer',
        status: userData.status || 'active',
        phoneNumber: userData.phoneNumber || '',
        defaultLanguage: userData.defaultLanguage || 'en',
        profilePhotoUrl: userData.profilePhotoUrl || '',
        profilePhotoPublicId: userData.profilePhotoPublicId || '',
      });
    }
  }, [userData]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const session = await getSession();
      const response = await adminApi.put(`/admin/users/${id}`, data, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const session = await getSession();
      const response = await adminApi.post(
        `/admin/users/${id}/reset-password`,
        { newPassword: password },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || trimmedPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    resetPasswordMutation.mutate(trimmedPassword);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-md p-12 text-center">
            <FontAwesomeIcon
              icon={['fal', 'spinner-third']}
              spin
              className="text-5xl text-primary"
            />
            <p className="text-gray-600 mt-4">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-md p-12 text-center">
            <p className="text-gray-600">No user data found</p>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium mt-4"
            >
              <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOAuthUser = userData.googleId || userData.appleId;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/admin/users"
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
            Back to Users
          </Link>
        </div>

        <div className="bg-white shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
            <p className="text-gray-600 mt-2">Update user information and settings</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`${
                  activeTab === 'basic'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`${
                  activeTab === 'profile'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profile & Images
              </button>
              {!isOAuthUser && (
                <button
                  onClick={() => setActiveTab('password')}
                  className={`${
                    activeTab === 'password'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Password Reset
                </button>
              )}
            </nav>
          </div>

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={['fal', 'user']} className="text-2xl" />
                  User Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    disabled={isOAuthUser}
                  />
                  {isOAuthUser && (
                    <p className="text-sm text-gray-500 mt-1">
                      Email cannot be changed for OAuth users
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Language
                    </label>
                    <select
                      value={formData.defaultLanguage}
                      onChange={(e) =>
                        setFormData({ ...formData, defaultLanguage: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="customer">Collector</option>
                      <option value="vendor">Vendor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="revoked">Suspended</option>
                    </select>
                  </div>
                </div>

                {userData && (
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Member Since:</span>{' '}
                        {new Date(userData.createdAt).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium">User ID:</span> {userData.id}
                      </p>
                      {userData.googleId && (
                        <p>
                          <span className="font-medium">Google Connected:</span> Yes
                        </p>
                      )}
                      {userData.appleId && (
                        <p>
                          <span className="font-medium">Apple Connected:</span> Yes
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-primary text-white py-3 px-6 font-medium hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={['fal', 'save']} className="mr-2 text-base" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href="/admin/users"
                  className="px-6 py-3 border border-gray-300 font-medium hover:transition text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}

          {/* Profile & Images Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Profile Photo</h3>
              <div className="max-w-md">
                <div className="bg-white border border-gray-200 p-6">
                  <label className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <FontAwesomeIcon
                      icon={['fal', 'user']}
                      className="text-base mr-2 text-primary"
                    />
                    Profile Photo
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Square image, displayed as user avatar
                  </p>
                  <ImageUploader
                    currentImage={formData.profilePhotoUrl}
                    onUploadSuccess={(result) => {
                      setFormData({
                        ...formData,
                        profilePhotoUrl: result.url,
                        profilePhotoPublicId: result.publicId,
                      });
                      // Auto-save profile photo
                      updateMutation.mutate({
                        ...formData,
                        profilePhotoUrl: result.url,
                        profilePhotoPublicId: result.publicId,
                      });
                    }}
                    folder={`users/${id}/profile`}
                    aspectRatio="1:1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password Reset Tab */}
          {activeTab === 'password' && !isOAuthUser && (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={['fal', 'key']} className="text-2xl" />
                  Reset Password
                </h3>

                <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This will reset the user's password. They will need to
                    use the new password to log in.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="bg-primary text-white py-3 px-6 font-medium hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={['fal', 'key']} className="mr-2 text-base" />
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
