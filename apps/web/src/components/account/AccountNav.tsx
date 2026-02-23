'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from '@/lib/clientTranslations';
import { useSession, signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { IconPrefix, IconName } from '@/types/fontawesome';

interface NavItem {
  href: string;
  labelKey: string;
  icon: [IconPrefix, IconName];
}

const navItems: NavItem[] = [
  { href: '/account/profile', labelKey: 'profile', icon: ['fal', 'user'] },
  { href: '/account/preferences', labelKey: 'preferences', icon: ['fal', 'cog'] },
  { href: '/account/password', labelKey: 'password', icon: ['fal', 'key'] },
  { href: '/account/orders', labelKey: 'orders', icon: ['fal', 'box'] },
  { href: '/account/bids', labelKey: 'bids', icon: ['fal', 'gavel'] },
  { href: '/account/offers', labelKey: 'offers', icon: ['fal', 'tag'] },
  { href: '/account/settings', labelKey: 'settings', icon: ['fal', 'sliders'] },
  { href: '/memberships', labelKey: 'membership', icon: ['fal', 'crown'] },
];

export default function AccountNav() {
  const pathname = usePathname();
  const t = useTranslations('account');
  const { data: session } = useSession();

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
    await signOut({ callbackUrl: '/' }); // ensure redirect to root, not localhost
  };

  return (
    <nav className="bg-white border-b border-gray-200 mb-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-center space-x-8 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 py-4 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="text-base" />
                {t(item.labelKey)}
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 py-4 px-3 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors whitespace-nowrap"
          >
            <FontAwesomeIcon icon={['fal', 'sign-out-alt']} className="text-base" />
            {t('logout')}
          </button>
        </div>

        {/* Mobile Navigation - Dropdown */}
        <div className="md:hidden py-4">
          <select
            value={pathname}
            onChange={(e) => {
              if (e.target.value === 'logout') {
                handleLogout();
              } else {
                window.location.href = e.target.value;
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
          >
            {navItems.map((item) => (
              <option key={item.href} value={item.href}>
                {t(item.labelKey)}
              </option>
            ))}
            <option value="logout" className="text-red-600">
              {t('logout')}
            </option>
          </select>
        </div>
      </div>
    </nav>
  );
}
