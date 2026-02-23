/**
 * Account Dashboard
 * Main account overview page
 */

'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from '@/lib/clientTranslations';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useVendorStatus } from '@/hooks/useVendorStatus';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('account'); // i18n: language-preference fix
  const { data: vendorStatus } = useVendorStatus();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('loadingAccount')}</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (status === 'unauthenticated') {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint if user has a proper JWT token
      if (session?.accessToken && !session.accessToken.startsWith('ya29.')) {
        // Temporarily store token for this request
        const originalToken = localStorage.getItem('token');
        localStorage.setItem('token', session.accessToken);

        await api.post('/auth/logout');

        // Restore original token state
        if (originalToken) {
          localStorage.setItem('token', originalToken);
        } else {
          localStorage.removeItem('token');
        }

        toast.success('Logged out successfully');
      }
    } catch (error) {
      // Continue with NextAuth logout anyway
    }

    // Always sign out from NextAuth
    await signOut({ callbackUrl: '/' });
  };

  if (!session) return null;

  const menuItems = [
    {
      title: t('profile'),
      href: '/account/profile',
      description: t('profileDescription'),
    },
    {
      title: t('membership'),
      href: '/account/membership',
      description: t('membershipDescription'),
    },
    {
      title: t('preferences'),
      href: '/account/preferences',
      description: t('preferencesDescription'),
    },
    {
      title: 'Notifications',
      href: '/account/notifications',
      description: 'View and manage your notifications',
    },
    {
      title: 'Wishlist',
      href: '/account/wishlist',
      description: 'View and manage your saved books',
      icon: ['fal', 'heart'] as [string, string],
    },
    {
      title: t('orders'),
      href: '/account/orders',
      description: t('ordersDescription'),
    },
    {
      title: t('bids'),
      href: '/account/bids',
      description: t('bidsDescription'),
    },
    {
      title: t('settings'),
      href: '/account/settings',
      description: t('settingsDescription'),
    },
  ];

  // Add vendor dashboard for active vendors
  if (vendorStatus?.isActive) {
    menuItems.splice(2, 0, {
      title: 'Vendor Dashboard',
      href: '/vendor/dashboard',
      description: 'Manage your store, products, and earnings',
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Clean Header */}
      <div className="mb-8 sm:mb-16 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Profile Picture */}
          {session.user?.image ? (
            <div className="text-6xl sm:text-8xl rounded-full relative overflow-hidden flex-shrink-0 border-2 border-gray-200">
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = `<div class="h-full w-full bg-primary text-white flex items-center justify-center font-bold text-2xl">${session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || 'U'}</div>`;
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl sm:text-2xl flex-shrink-0 border-2 border-gray-200">
              {session.user?.name?.charAt(0)?.toUpperCase() ||
                session.user?.email?.charAt(0)?.toUpperCase() ||
                'U'}
            </div>
          )}

          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2 sm:mb-3 tracking-tight">
              {t('dashboard')}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {t('welcome')},{' '}
              <span className="text-secondary font-medium">
                {session.user?.name || session.user?.email}
              </span>
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50  transition-colors duration-200 border border-gray-300 hover:border-red-300 w-full sm:w-auto"
        >
          <FontAwesomeIcon
            icon={['fal', 'sign-out-alt'] as [string, string]}
            className="text-base"
          />
          {t('logout')}
        </button>
      </div>

      {/* Clean Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 mb-12 sm:mb-16">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative bg-white border border-[#8a8686] p-10 sm:p-12 hover:border-secondary transition-all duration-300"
          >
            {/* Content */}
            <h3 className="text-2xl font-semibold text-primary mb-3 group-hover:text-secondary transition-colors duration-300">
              {item.title}
            </h3>
            <p className="text-gray-600 text-base">{item.description}</p>

            {/* Subtle hover indicator */}
            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-secondary group-hover:w-full transition-all duration-300"></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
