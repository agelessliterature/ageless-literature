/**
 * Profile Page
 * Edit user profile information with Cloudinary image uploads
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/clientTranslations';
import { ImageUploader } from '@/components/cloudinary';
import { updateUserProfileImage } from '@/lib/cloudinary-api';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import PageLoading from '@/components/ui/PageLoading';

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user) {
      // @ts-expect-error - profilePhotoUrl may exist on user object from database
      setProfileImage(session.user.profilePhotoUrl || session.user.image || null);
      // Load full profile from API
      loadProfile();
    }
  }, [status, router, session]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data?.success) {
        const user = res.data.data;
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProfileImageUpload = async (result: { url: string; publicId: string }) => {
    try {
      await updateUserProfileImage(result);
      setProfileImage(result.url);
      toast.success('Profile image updated successfully!');
      await updateSession();
    } catch (error) {
      toast.error('Failed to update profile image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.patch(`/users/${session?.user?.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
      });
      if (res.data?.success) {
        toast.success('Profile updated successfully');
        await updateSession();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || initialLoading) {
    return <PageLoading message={tCommon('loading')} fullPage={false} />;
  }

  if (!session) return null;

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">{t('title')}</h1>

      {/* Profile Image Upload */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>
        <ImageUploader
          currentImage={profileImage}
          onUploadSuccess={handleProfileImageUpload}
          folder={`users/${session?.user?.id || 'temp'}/profile`}
          aspectRatio="1:1"
          buttonText="Upload Profile Photo"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('emailLabel')}</label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? t('saving') : t('saveButton')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
