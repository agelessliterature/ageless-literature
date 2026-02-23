'use client';

import Link from 'next/link';
import Image from 'next/image';
import { withAssetPrefix } from '@/lib/basePath';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/clientTranslations';
import { useCart } from '@/hooks/useCart';
import { useVendorStatus } from '@/hooks/useVendorStatus';
import {
  useUnreadNotificationCount,
  useNotifications,
  useMarkNotificationAsRead,
} from '@/hooks/useNotifications';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { mapNotificationToUI } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { initSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import SearchModal from '@/components/modals/SearchModal';
import { showNotificationToast } from '@/lib/notificationToast';

export default function Header() {
  const t = useTranslations('nav');
  const { data: session } = useSession();
  const { data: cart } = useCart();
  const { data: vendorStatus } = useVendorStatus();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notificationsData } = useNotifications(1, 10, { isRead: false });
  const markAsReadMutation = useMarkNotificationAsRead();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === '/';

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

      // Refetch unread count and notification list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Listen for notification marked as read
    socket.on('notification:read', () => {
      // Refetch unread count and notification list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Listen for all notifications marked as read
    socket.on('notification:read_all', () => {
      // Refetch unread count and notification list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notification:read_all');
    };
  }, [session?.accessToken, queryClient]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setNotificationDropdownOpen(false);
      }
    };

    if (notificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationDropdownOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection('up');
      }

      // Determine if scrolled past threshold
      const isScrolled = currentScrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled, lastScrollY]);

  const cartItemsCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Determine text and background colors based on page and scroll state
  const getTextColor = () => {
    // Always dark text
    return 'text-primary';
  };

  const getBackgroundColor = () => {
    if (isHomePage) {
      return scrolled ? 'bg-white/80 backdrop-blur-xl' : 'bg-transparent';
    }
    // Non-homepage: always white background with blur
    return 'bg-white/80 backdrop-blur-xl';
  };

  const getLogoClasses = () => {
    // Always black logo (no invert filter)
    return '';
  };

  const showTopRow = scrollDirection === 'up' || !scrolled;

  return (
    <>
      {/* Top line accent - only show when scrolled on non-homepage */}
      {!isHomePage && (
        <div
          className={`h-1 bg-gradient-to-r from-secondary via-secondary-light to-secondary fixed top-0 left-0 right-0 z-50 transition-opacity duration-500 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out ${getBackgroundColor()}`}
        role="banner"
      >
        {/* Desktop Header */}
        <nav className="hidden lg:block" role="navigation" aria-label="Main navigation">
          <div className="max-w-[1728px] mx-auto">
            {/* Top Row - Icons, Logo, Icons - Hide on scroll down, show on scroll up */}
            <div
              className={`grid grid-cols-3 items-center transition-all duration-500 px-8 overflow-hidden ${
                showTopRow ? (scrolled ? 'h-24' : 'h-32') : 'h-0 opacity-0'
              }`}
            >
              {/* Left Action Icons */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary`}
                  aria-label="Search the site"
                  type="button"
                >
                  <FontAwesomeIcon
                    icon={['fal', 'search']}
                    className="text-xl"
                    aria-hidden="true"
                  />
                </button>
                <Link
                  href="/services"
                  className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary`}
                  aria-label="View our concierge services"
                >
                  <FontAwesomeIcon
                    icon={['fal', 'concierge-bell']}
                    className="text-xl"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              {/* Centered Logo */}
              <div className="flex justify-center">
                <Link
                  href="/"
                  className="block transition-transform duration-300 hover:scale-105"
                  aria-label="Ageless Literature home page"
                >
                  <Image
                    src={withAssetPrefix('/ageless-literature-logo.svg')}
                    alt="Ageless Literature logo"
                    width={200}
                    height={60}
                    priority
                    className={`transition-all duration-500 ${scrolled ? 'h-12' : 'h-16'} w-auto ${
                      showTopRow ? 'opacity-100' : 'opacity-0'
                    } ${getLogoClasses()}`}
                  />
                </Link>
              </div>

              <div className="flex items-center justify-end gap-6">
                {session ? (
                  <>
                    {/* Vendor Dashboard Icon */}
                    {vendorStatus?.isActive && (
                      <Link
                        href="/vendor/dashboard"
                        className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary flex items-center justify-center`}
                        aria-label="Vendor Dashboard"
                        title="Vendor Dashboard"
                      >
                        <FontAwesomeIcon icon={['fal', 'store']} className="text-xl" />
                        <span className="sr-only">Vendor Dashboard</span>
                      </Link>
                    )}
                    {/* Account Icon */}
                    <Link
                      href="/account"
                      className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary flex items-center justify-center`}
                      aria-label="Go to your account"
                    >
                      {(session.user as any)?.profilePhotoUrl || session.user?.image ? (
                        <div className="text-3xl rounded-full relative overflow-hidden">
                          <img
                            src={(session.user as any)?.profilePhotoUrl || session.user.image}
                            alt={session.user.name || 'User'}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <FontAwesomeIcon icon={['fal', 'user']} className="text-xl" />
                      )}
                      <span className="sr-only">{t('account')}</span>
                    </Link>
                    {/* Notification Bell */}
                    <div className="relative" ref={notificationDropdownRef}>
                      <button
                        onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                        className={`transition-all duration-300 hover:scale-110 relative ${getTextColor()} hover:text-secondary flex items-center justify-center`}
                        aria-label="View notifications"
                      >
                        <FontAwesomeIcon icon={['fal', 'bell']} className="text-xl" />
                        <span className="sr-only">Notifications</span>
                        {(unreadCount || 0) > 0 && (
                          <span className="absolute -top-2 -right-2 bg-secondary text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </button>

                      {/* Notification Dropdown */}
                      {notificationDropdownOpen && (
                        <div className="absolute right-0 mt-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
                          {/* Dropdown Header */}
                          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-primary">Notifications</h3>
                            {(unreadCount || 0) > 0 && (
                              <Link
                                href="/account/notifications"
                                className="text-xs text-secondary hover:underline"
                                onClick={() => setNotificationDropdownOpen(false)}
                              >
                                View All
                              </Link>
                            )}
                          </div>

                          {/* Notification List */}
                          <div className="overflow-y-auto flex-1">
                            {notificationsData?.notifications &&
                            notificationsData.notifications.length > 0 ? (
                              notificationsData.notifications.slice(0, 10).map((notification) => {
                                const uiData = mapNotificationToUI(notification);
                                return (
                                  <div
                                    key={notification.id}
                                    onClick={() => {
                                      if (!notification.isRead) {
                                        markAsReadMutation.mutate(notification.id);
                                      }
                                      setNotificationDropdownOpen(false);
                                      router.push(uiData.href);
                                    }}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`${uiData.color} flex-shrink-0 mt-1`}>
                                        <FontAwesomeIcon icon={uiData.icon} className="text-lg" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="text-sm font-semibold text-primary line-clamp-1">
                                            {uiData.title}
                                          </p>
                                          {!notification.isRead && (
                                            <div className="w-2 h-2 bg-secondary rounded-full flex-shrink-0 mt-1.5" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                          {uiData.message}
                                        </p>
                                        <p
                                          className="text-xs text-gray-400 mt-1"
                                          suppressHydrationWarning
                                        >
                                          {formatDistanceToNow(new Date(notification.createdAt), {
                                            addSuffix: true,
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="px-4 py-8 text-center text-gray-500">
                                <FontAwesomeIcon
                                  icon={['fal', 'bell-slash']}
                                  className="text-3xl mb-2 text-gray-300"
                                />
                                <p className="text-sm">No new notifications</p>
                              </div>
                            )}
                          </div>

                          {/* Dropdown Footer */}
                          {notificationsData?.notifications &&
                            notificationsData.notifications.length > 0 && (
                              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <Link
                                  href="/account/notifications"
                                  className="block text-center text-sm text-secondary hover:underline font-medium"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                >
                                  View All Notifications
                                </Link>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/cart"
                      className={`transition-all duration-300 hover:scale-110 relative ${getTextColor()} hover:text-secondary flex items-center justify-center`}
                      aria-label="View shopping cart"
                    >
                      <FontAwesomeIcon icon={['fal', 'shopping-bag']} className="text-xl" />
                      <span className="sr-only">{t('cart')}</span>
                      {cartItemsCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-secondary text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                          {cartItemsCount}
                        </span>
                      )}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary flex items-center justify-center`}
                      aria-label="Sign in to your account"
                    >
                      <FontAwesomeIcon icon={['fal', 'user']} className="text-xl" />
                      <span className="sr-only">{t('signIn')}</span>
                    </Link>
                    <Link
                      href="/cart"
                      className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary relative flex items-center justify-center`}
                      aria-label="View shopping cart"
                    >
                      <FontAwesomeIcon icon={['fal', 'shopping-bag']} className="text-xl" />
                      <span className="sr-only">{t('cart')}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Row - Navigation - Always visible */}
            <div
              className={`border-t border-b transition-all duration-500 ${
                isHomePage
                  ? scrolled
                    ? 'border-primary/10'
                    : 'border-white/10'
                  : 'border-gray-200'
              }`}
            >
              <nav
                className={`flex items-center justify-center gap-12 transition-all duration-500 ${
                  scrolled ? 'h-14' : 'h-16'
                }`}
              >
                <Link
                  href="/about"
                  className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                >
                  {t('about')}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
                </Link>
                <Link
                  href="/"
                  className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                >
                  {t('home')}
                  <span
                    className={`absolute -bottom-0.5 left-0 h-0.5 bg-secondary transition-all duration-300 ${
                      pathname === '/' ? 'w-full opacity-100' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
                <Link
                  href="/shop"
                  className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                >
                  {t('books')}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
                </Link>
                <Link
                  href="/categories"
                  className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                >
                  {t('collections')}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
                </Link>
                {/* Connect page hidden - under development */}
                {false && (
                  <Link
                    href="/connect"
                    className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                  >
                    {t('connect')}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
                  </Link>
                )}
                <Link
                  href="/booksellers"
                  className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                >
                  {t('booksellers')}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
                </Link>
                {/* Vendor Live Chat - Only visible to vendors */}
                {vendorStatus?.isActive && (
                  <Link
                    href="/vendor/chat"
                    className={`text-sm font-medium tracking-wide transition-all duration-300 relative group ${getTextColor()} hover:text-secondary`}
                  >
                    Live Chat
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </nav>

        {/* Mobile Header */}
        <div className="lg:hidden">
          <div
            className={`flex items-center justify-between px-4 transition-all duration-500 ${
              scrolled ? 'h-16' : 'h-20'
            }`}
          >
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary`}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <FontAwesomeIcon
                icon={mobileMenuOpen ? ['fal', 'times'] : ['fal', 'bars']}
                className="text-2xl"
              />
            </button>

            {/* Mobile Logo */}
            <Link
              href="/"
              className="absolute left-1/2 transform -translate-x-1/2 transition-transform duration-300 hover:scale-105"
            >
              <Image
                src={withAssetPrefix('/ageless-literature-logo.svg')}
                alt="Ageless Literature"
                width={140}
                height={42}
                priority
                className={`transition-all duration-500 w-auto ${
                  scrolled ? 'h-10' : 'h-12'
                } ${getLogoClasses()}`}
              />
            </Link>

            {/* Mobile Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSearchModalOpen(true)}
                className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary`}
                aria-label="Search"
              >
                <FontAwesomeIcon icon={['fal', 'search']} className="text-xl" />
              </button>
              {session ? (
                <>
                  <Link
                    href="/account/notifications"
                    className={`transition-all duration-300 hover:scale-110 relative ${getTextColor()} hover:text-secondary`}
                    aria-label="Notifications"
                  >
                    <FontAwesomeIcon icon={['fal', 'bell']} className="text-xl" />
                    <span className="sr-only">Notifications</span>
                    {(unreadCount || 0) > 0 && (
                      <span className="absolute -top-2 -right-2 bg-secondary text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/account"
                    className={`transition-all duration-300 hover:scale-110 flex items-center justify-center ${getTextColor()} hover:text-secondary`}
                    aria-label="Go to your account"
                  >
                    {(session.user as any)?.profilePhotoUrl || session.user?.image ? (
                      <div className="w-7 h-7 rounded-full overflow-hidden">
                        <img
                          src={(session.user as any)?.profilePhotoUrl || session.user.image}
                          alt={session.user?.name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <FontAwesomeIcon icon={['fal', 'user']} className="text-xl" />
                    )}
                    <span className="sr-only">Account</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className={`transition-all duration-300 hover:scale-110 ${getTextColor()} hover:text-secondary`}
                  aria-label="Sign in"
                >
                  <FontAwesomeIcon icon={['fal', 'user']} className="text-xl" />
                  <span className="sr-only">Sign in</span>
                </Link>
              )}
              <Link
                href="/cart"
                className={`transition-all duration-300 hover:scale-110 relative ${getTextColor()} hover:text-secondary`}
              >
                <FontAwesomeIcon icon={['fal', 'shopping-bag']} className="text-xl" />
                <span className="sr-only">Shopping cart</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-secondary text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Outside header for proper positioning */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-[9999] overflow-y-auto animate-in fade-in duration-300">
          <div className="flex flex-col min-h-full">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200 animate-in slide-in-from-top duration-300">
              <Image
                src={withAssetPrefix('/ageless-literature-logo.svg')}
                alt="Ageless Literature"
                width={140}
                height={42}
                priority
                className="h-12 w-auto"
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-primary hover:text-secondary transition-all duration-300 hover:rotate-90"
              >
                <FontAwesomeIcon icon={['fal', 'times']} className="text-2xl" />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <nav className="flex-1 px-4 py-6">
              <Link
                href="/about"
                className="block py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-b border-gray-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link
                href="/"
                className="block py-4 text-primary hover:text-secondary text-lg border-b border-gray-200 hover:translate-x-2 transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/shop"
                className="block py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-b border-gray-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Rare & Collectible
              </Link>
              <Link
                href="/categories"
                className="block py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-b border-gray-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Collections
              </Link>
              {/* Connect page hidden - under development */}
              {false && (
                <Link
                  href="/connect"
                  className="block py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-b border-gray-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connect
                </Link>
              )}
              <Link
                href="/booksellers"
                className="block py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-b border-gray-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Booksellers
              </Link>

              {/* Vendor Live Chat - Only visible to vendors */}
              {vendorStatus?.isActive && (
                <Link
                  href="/vendor/chat"
                  className="block py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-b border-gray-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Live Chat
                </Link>
              )}

              {session && (
                <>
                  <div className="mt-6 pt-6">
                    <Link
                      href="/account/profile"
                      className="flex items-center gap-3 py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {(session.user as any)?.profilePhotoUrl || session.user?.image ? (
                        <div className="h-10 w-10 rounded-full relative overflow-hidden flex-shrink-0">
                          <img
                            src={(session.user as any)?.profilePhotoUrl || session.user.image}
                            alt={session.user.name || 'User'}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 bg-secondary text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {session.user?.name?.charAt(0)?.toUpperCase() ||
                            session.user?.email?.charAt(0)?.toUpperCase() ||
                            'U'}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {session.user?.name || 'My Account'}
                        </div>
                        <div className="text-xs text-gray-500">{session.user?.email}</div>
                      </div>
                    </Link>

                    {/* Vendor Navigation - Only visible to active vendors */}
                    {vendorStatus?.isActive && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Vendor Menu
                        </div>
                        <Link
                          href="/vendor/dashboard"
                          className="flex items-center gap-3 py-3 text-primary hover:text-secondary hover:translate-x-2 transition-all duration-300"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <FontAwesomeIcon icon={['fal', 'store']} className="text-lg" />
                          <span className="text-base">Dashboard</span>
                        </Link>
                        <Link
                          href="/vendor/books"
                          className="flex items-center gap-3 py-3 text-primary hover:text-secondary hover:translate-x-2 transition-all duration-300"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <FontAwesomeIcon icon={['fal', 'book']} className="text-lg" />
                          <span className="text-base">Products</span>
                        </Link>
                        <Link
                          href="/vendor/orders"
                          className="flex items-center gap-3 py-3 text-primary hover:text-secondary hover:translate-x-2 transition-all duration-300"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <FontAwesomeIcon
                            icon={['fal', 'file-invoice-dollar']}
                            className="text-lg"
                          />
                          <span className="text-base">Vendor Orders</span>
                        </Link>
                        <Link
                          href="/vendor/reports"
                          className="flex items-center gap-3 py-3 text-primary hover:text-secondary hover:translate-x-2 transition-all duration-300"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <FontAwesomeIcon icon={['fal', 'chart-line']} className="text-lg" />
                          <span className="text-base">Reports</span>
                        </Link>
                      </div>
                    )}

                    <Link
                      href="/account/orders"
                      className="flex items-center gap-3 py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300 border-t border-gray-200 mt-4 pt-4"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={['fal', 'box']} className="text-xl" />
                      My Orders
                    </Link>
                    <Link
                      href="/account/notifications"
                      className="flex items-center gap-3 py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={['fal', 'bell']} className="text-xl" />
                      Notifications
                      {(unreadCount || 0) > 0 && (
                        <span className="bg-secondary text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/memberships"
                      className="flex items-center gap-3 py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={['fal', 'crown']} className="text-xl" />
                      Memberships
                    </Link>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/' });
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full text-left py-4 text-primary hover:text-secondary hover:translate-x-2 text-lg transition-all duration-300"
                    >
                      <FontAwesomeIcon icon={['fal', 'sign-out-alt']} className="text-xl" />
                      {t('signOut')}
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Spacer for non-homepage only - prevents content from going under header */}
      {!isHomePage && <div className="h-24 lg:h-48" />}

      {/* Search Modal */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}
