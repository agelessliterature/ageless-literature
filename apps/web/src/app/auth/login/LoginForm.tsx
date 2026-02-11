/**
 * Login Form Component (Client-Side)
 *
 * SECURITY FEATURES (Nov 12, 2025):
 * - Zod schema validation
 * - DOMPurify XSS sanitization (email only)
 * - Password visibility toggle
 * - ARIA accessibility attributes
 * - Loading states
 * - Google OAuth integration
 * - Apple OAuth integration
 */
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { loginSchema, type LoginFormData } from '@/lib/validation/authSchemas';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import DOMPurify from 'dompurify';
import { useTranslations } from '@/lib/clientTranslations';

interface LoginFormProps {
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oAuthLoading, setOAuthLoading] = useState<'google' | 'apple' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setOAuthLoading(provider);
    try {
      const redirectUrl = callbackUrl || '/account';
      await signIn(provider, { callbackUrl: redirectUrl });
    } catch (error) {
      toast.error(`Failed to sign in with ${provider}`);
      setOAuthLoading(null);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      // Sanitize inputs to prevent XSS
      const sanitizedEmail = DOMPurify.sanitize(data.email.trim());

      const result = await signIn('credentials', {
        email: sanitizedEmail,
        password: data.password, // Never sanitize passwords
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.ok) {
        toast.success('Logged in successfully');
        const redirectUrl = callbackUrl || '/account';
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">{t('title')}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('subtitle')}{' '}
            <Link
              href="/auth/register"
              className="font-medium text-primary hover:text-primary-dark"
            >
              {t('createAccount')}
            </Link>
          </p>
        </div>

        {/* OAuth Providers */}
        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={oAuthLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {oAuthLoading === 'google' ? (
              <>
                <svg
                  className="animate-spin text-xl text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('connecting')}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fab', 'google']} className="text-xl" />
                {t('googleSignIn')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSignIn('apple')}
            disabled={oAuthLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-900 shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {oAuthLoading === 'apple' ? (
              <>
                <svg
                  className="animate-spin text-xl text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('connecting')}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={['fab', 'apple']} className="text-xl" />
                {t('appleSignIn')}
              </>
            )}
          </button>
        </div>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">{t('orContinue')}</span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className=" shadow-sm space-y-4">
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
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder={t('emailPlaceholder')}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder={t('passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <FontAwesomeIcon
                      icon={['fal', 'eye-slash']}
                      className="text-xl"
                      aria-hidden="true"
                    />
                  ) : (
                    <FontAwesomeIcon icon={['fal', 'eye']} className="text-xl" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="text-base text-primary focus:ring-black border-gray-300"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-primary hover:text-primary-dark"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 text-xl text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t('signingIn')}
              </>
            ) : (
              t('signIn')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
