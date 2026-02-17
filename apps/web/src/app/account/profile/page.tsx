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
import PageLoading from '@/components/ui/PageLoading';

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
    location: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        username: '',
        email: session.user.email || '',
        bio: '',
        location: '',
      });
      // @ts-expect-error - profilePhotoUrl may exist on user object from database
      setProfileImage(session.user.profilePhotoUrl || session.user.image || null);
    }
  }, [status, router, session]);

  const handleProfileImageUpload = async (result: { url: string; publicId: string }) => {
    try {
      await updateUserProfileImage(result);
      setProfileImage(result.url);
      toast.success('Profile image updated successfully!');
      // Update session to reflect new image
      await updateSession();
    } catch (error) {
      toast.error('Failed to update profile image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // TODO: Call API to update profile
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
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
        <div>
          <label className="block text-sm font-medium mb-2">{t('fullNameLabel')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('usernameLabel')}</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder={t('usernamePlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('emailLabel')}</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('bioLabel')}</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder={t('bioPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('locationLabel')}</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder={t('locationPlaceholder')}
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
          >
            {message}
          </div>
        )}

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
