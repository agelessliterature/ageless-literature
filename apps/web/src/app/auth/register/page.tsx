/**
 * Enhanced Registration Page with Modern Password Security
 *
 * SECURITY FEATURES (Nov 12, 2025):
 * - Modern password complexity requirements (12+ chars, mixed case, numbers, symbols)
 * - Real-time password strength indicator
 * - Common password detection
 * - Pattern analysis (no repeated/sequential chars)
 * - Entropy calculation and feedback
 * - Enhanced UI with strength visualization
 * - Comprehensive backend validation
 * - XSS protection with DOMPurify
 * - OAuth integration (Google/Apple)
 */

'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { registerSchema, type RegisterFormData } from '@/lib/validation/authSchemas';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';
import DOMPurify from 'dompurify';
import { useTranslations } from '@/lib/clientTranslations';
import PhoneInput from '@/components/forms/PhoneInput';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const t = useTranslations('auth.register');
  const [isLoading, setIsLoading] = useState(false);
  const [oAuthLoading, setOAuthLoading] = useState<'google' | 'apple' | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/account';
      router.push(callbackUrl);
    }
  }, [status, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const watchedPassword = watch('password', '');

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setOAuthLoading(provider);
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/account';
      await signIn(provider, { callbackUrl });
    } catch (error) {
      toast.error(`Failed to sign in with ${provider}`);
      setOAuthLoading(null);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      // Sanitize inputs to prevent XSS
      const sanitizedData = {
        firstName: DOMPurify.sanitize(data.firstName.trim()),
        lastName: DOMPurify.sanitize(data.lastName.trim()),
        email: DOMPurify.sanitize(data.email.trim()),
        phoneNumber: data.phoneNumber ? DOMPurify.sanitize(data.phoneNumber.trim()) : undefined,
        password: data.password, // Never sanitize passwords
      };

      // Call backend registration API
      const response = await api.post('/auth/register', sanitizedData);

      if (response.data.success) {
        toast.success('Account created successfully! Please log in with your credentials.');

        // Redirect to login page with success message
        const callbackUrl = searchParams.get('callbackUrl') || '/account';
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}&registered=true`);
      } else {
        toast.error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Show specific validation errors from backend
        error.response.data.errors.forEach((err: any) => {
          if (typeof err === 'string') {
            toast.error(err);
          } else if (err.msg) {
            toast.error(err.msg);
          }
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 400) {
        toast.error('Invalid registration data. Please check your inputs.');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{t('title')}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('subtitle')}{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:text-primary-dark">
              {t('signIn')}
            </Link>
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleOAuthSignIn('google')}
            disabled={oAuthLoading !== null}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
          >
            {oAuthLoading === 'google' ? (
              <>
                <div className="animate-spin rounded-full text-xl border-b-2 border-gray-700 mr-2"></div>
                {t('connecting')}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fab', 'google']} className="text-xl mr-2" />
                {t('googleSignUp')}
              </>
            )}
          </button>

          <button
            onClick={() => handleOAuthSignIn('apple')}
            disabled={oAuthLoading !== null}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
          >
            {oAuthLoading === 'apple' ? (
              <>
                <div className="animate-spin rounded-full text-xl border-b-2 border-gray-700 mr-2"></div>
                {t('connecting')}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fab', 'apple']} className="text-xl mr-2" />
                {t('appleSignUp')}
              </>
            )}
          </button>
        </div>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">{t('orCreateWith')}</span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName')}
                </label>
                <input
                  {...register('firstName')}
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  aria-invalid={errors.firstName ? 'true' : 'false'}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder={t('firstNamePlaceholder')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName')}
                </label>
                <input
                  {...register('lastName')}
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  aria-invalid={errors.lastName ? 'true' : 'false'}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder={t('lastNamePlaceholder')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder={t('emailPlaceholder')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <PhoneInput
                {...register('phoneNumber')}
                value={watch('phoneNumber') || ''}
                onChange={(value) => setValue('phoneNumber', value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="+44 1234 567890 or +1 (123) 456-7890"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* Password Field with Strength Indicator */}
            <PasswordInput
              label={t('password')}
              placeholder={t('passwordPlaceholder')}
              value={watchedPassword}
              onChange={(value) => {
                setValue('password', value);
                trigger('password');
              }}
              error={errors.password?.message}
              showStrengthIndicator={true}
              showRequirements={true}
              autoComplete="new-password"
              id="password"
              required
            />

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('confirmPassword')}
              </label>
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder={t('confirmPasswordPlaceholder')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="text-xl text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Enhanced Security</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    We use modern password requirements to protect your account from unauthorized
                    access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || Object.keys(errors).length > 0}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full text-xl border-b-2 border-white mr-2"></div>
                {t('creating')}
              </>
            ) : (
              t('createAccount')
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:text-primary-dark">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:text-primary-dark">
                Privacy Policy
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
