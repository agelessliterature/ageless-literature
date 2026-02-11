/**
 * Enhanced Password Change Page
 *
 * SECURITY ENHANCEMENTS (Nov 12, 2025):
 * - Modern password complexity requirements (12+ chars, mixed case, numbers, symbols)
 * - Real-time password strength indicator
 * - Common password detection
 * - Pattern analysis (no repeated/sequential chars)
 * - Entropy calculation and feedback
 * - Enhanced UI with strength visualization
 * - Comprehensive backend validation
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/lib/clientTranslations';
import toast from 'react-hot-toast';
import {
  passwordChangeSchema,
  type PasswordChangeFormData,
  validatePasswordComplexity,
} from '@/lib/validation/authSchemas';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';

export default function PasswordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('password');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
    trigger,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onChange',
  });

  const watchedNewPassword = watch('newPassword', '');
  const watchedConfirmPassword = watch('confirmPassword', '');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const onSubmit = async (data: PasswordChangeFormData) => {
    setLoading(true);

    try {
      // Additional client-side validation
      const passwordValidation = validatePasswordComplexity(data.newPassword);
      if (!passwordValidation.isValid) {
        toast.error(passwordValidation.errors[0]);
        setLoading(false);
        return;
      }

      // Call API to update password
      const response = await api.patch(`/user/${session?.user?.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.data.success) {
        toast.success('Password updated successfully! Please log in again with your new password.');
        reset();
        // Optionally redirect to login or account page
        setTimeout(() => {
          router.push('/account');
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to update password');
      }
    } catch (error: any) {
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Show specific validation errors from backend
        error.response.data.errors.forEach((err: string) => {
          toast.error(err);
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 401) {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full text-3xl border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">{tCommon('loading')}</span>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Current Password Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {t('currentPasswordSection')}
            </h2>

            <PasswordInput
              label={t('currentPasswordLabel')}
              placeholder={t('currentPasswordPlaceholder')}
              value={watch('currentPassword') || ''}
              onChange={(value) => {
                setValue('currentPassword', value);
                trigger('currentPassword');
              }}
              error={errors.currentPassword?.message}
              showStrengthIndicator={false}
              autoComplete="current-password"
              id="currentPassword"
              required
            />
          </div>

          {/* New Password Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {t('newPasswordSection')}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* New Password Input */}
              <div>
                <PasswordInput
                  label={t('newPasswordLabel')}
                  placeholder={t('newPasswordPlaceholder')}
                  value={watchedNewPassword}
                  onChange={(value) => {
                    setValue('newPassword', value);
                    trigger('newPassword');
                  }}
                  error={errors.newPassword?.message}
                  showStrengthIndicator={true}
                  showRequirements={true}
                  autoComplete="new-password"
                  id="newPassword"
                  required
                />
              </div>

              {/* Confirm Password Input */}
              <div>
                <PasswordInput
                  label={t('confirmPasswordLabel')}
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={watchedConfirmPassword}
                  onChange={(value) => {
                    setValue('confirmPassword', value);
                    trigger('confirmPassword');
                  }}
                  error={errors.confirmPassword?.message}
                  showStrengthIndicator={false}
                  showRequirements={false}
                  autoComplete="new-password"
                  id="confirmPassword"
                  required
                />

                {/* Password Match Indicator */}
                {watchedNewPassword && watchedConfirmPassword && (
                  <div className="mt-2">
                    {watchedNewPassword === watchedConfirmPassword ? (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        Passwords match
                      </p>
                    ) : (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Enhanced Security Requirements
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              We've strengthened our password requirements to better protect your account:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Minimum 12 characters (up from 6)</li>
              <li>• Must include uppercase, lowercase, numbers, and special characters</li>
              <li>• No common passwords or predictable patterns</li>
              <li>• At least 8 unique characters for better entropy</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || Object.keys(errors).length > 0}
              className="px-8 py-3 bg-primary text-white font-semibold rounded-lg
                hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-black 
                focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed 
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full text-base border-b-2 border-white"></div>
                  {t('updating')}
                </>
              ) : (
                t('updateButton')
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg 
                border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 
                focus:ring-black focus:ring-offset-2 transition-all duration-200"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
