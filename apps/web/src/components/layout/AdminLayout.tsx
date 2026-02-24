'use client';

import Link from 'next/link';
import Image from 'next/image';
import { withAssetPrefix } from '@/lib/basePath';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useState, useRef, useEffect } from 'react';
import type { IconPrefix, IconName } from '@/types/fontawesome';
import { withBasePath } from '@/lib/path-utils';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { initSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { mapNotificationToUI } from '@/lib/utils';
import { showNotificationToast } from '@/lib/notificationToast';

interface NavItem {
  href: string;
  label: string;
  icon: [IconPrefix, IconName];
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: ['fal', 'home'] },
  { href: '/admin/users', label: 'Users', icon: ['fal', 'users'] },
  { href: '/admin/vendors', label: 'Vendors', icon: ['fal', 'store'] },
  { href: '/admin/memberships', label: 'Memberships', icon: ['fal', 'crown'] },
  { href: '/admin/orders', label: 'Orders', icon: ['fal', 'shopping-cart'] },
  { href: '/admin/products', label: 'Products', icon: ['fal', 'box'] },
  { href: '/admin/auctions', label: 'Auctions', icon: ['fal', 'gavel'] },
  { href: '/admin/categories', label: 'Categories', icon: ['fal', 'folder'] },
  { href: '/admin/coupons', label: 'Coupons', icon: ['fal', 'ticket-alt'] },
  { href: '/admin/payouts', label: 'Payouts', icon: ['fal', 'dollar-sign'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: unreadCount } = useUnreadNotificationCount();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if we're on the login page
  const isLoginPage = pathname === withBasePath('/admin/login') || pathname === '/admin/login';

  // Initialize Socket.IO and listen for notification events
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const socket = initSocket(session.accessToken);

    // Listen for new notifications
    socket.on('notification:new', (notification) => {
      // Show toast popup
      const uiData = mapNotificationToUI(notification);
      showNotificationToast(uiData, (href) => {
        router.push(href);
      });

      // Refetch unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.off('notification:new');
    };
  }, [session?.accessToken, queryClient, router]);

  // Avoid hydration mismatch by only showing active state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }

    return undefined;
  }, [profileDropdownOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login', redirect: true });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const profilePhotoUrl = (session?.user as any)?.profilePhotoUrl || (session?.user as any)?.image;
  const userInitials = getInitials(session?.user?.name);

  // If on login page or not authenticated, render children without layout
  if (isLoginPage || status === 'unauthenticated') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href={withBasePath('/admin/dashboard')} className="flex items-center">
                <Image
                  src={withAssetPrefix('/ageless-literature-logo.svg')}
                  alt="Ageless Literature"
                  width={120}
                  height={30}
                  priority
                  className="h-8 w-auto"
                />
                <span className="ml-3 text-sm text-gray-500 font-medium border-l border-gray-300 pl-3">
                  Admin
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Link
                href={withBasePath('/account/notifications')}
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <FontAwesomeIcon icon={['fal', 'bell']} className="text-xl" />
                {(unreadCount || 0) > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {profilePhotoUrl ? (
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-200">
                      <img
                        src={profilePhotoUrl}
                        alt={session?.user?.name || 'Admin'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                      {userInitials}
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                    </div>
                    <Link
                      href={withBasePath('/account/settings')}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <FontAwesomeIcon icon={['fal', 'cog']} className="text-base text-gray-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <FontAwesomeIcon icon={['fal', 'sign-out-alt']} className="text-base" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="flex pt-16 min-h-screen">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-16 bottom-0 left-0 z-20 w-20 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex-1 space-y-2 px-3 py-4">
            {navItems.map((item) => {
              const itemPath = withBasePath(item.href);
              const isActive =
                mounted &&
                (pathname === itemPath ||
                  pathname === item.href ||
                  pathname?.startsWith(itemPath + '/') ||
                  pathname?.startsWith(item.href + '/'));
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={itemPath}
                    className={`flex items-center justify-center h-12 w-12 ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FontAwesomeIcon icon={item.icon} className="text-xl" />
                  </Link>
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
