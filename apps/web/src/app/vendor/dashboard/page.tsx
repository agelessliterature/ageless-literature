'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import WithdrawModal from '@/components/modals/WithdrawModal';
import ItemTypeSelectionModal from '@/components/modals/ItemTypeSelectionModal';
import { withBasePath } from '@/lib/path-utils';
import { getApiUrl } from '@/lib/api';
import { useVendorStatus } from '@/hooks/useVendorStatus';
import { formatMoney } from '@/lib/format';

export default function VendorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const { data: vendorStatus } = useVendorStatus();

  // Fetch vendor dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/dashboard'), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const result = await res.json();
      return result.data;
    },
    enabled: !!session,
  });

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  const vendor = dashboardData?.vendor;
  const stats = dashboardData?.stats;
  const payoutSettings = dashboardData?.payoutSettings;
  const recentEarnings = dashboardData?.recentEarnings || [];
  const recentPayouts = dashboardData?.recentPayouts || [];

  // Use vendorStatus as fallback for shop info if dashboard data hasn't loaded
  const shopName = vendor?.shopName || vendorStatus?.shopName;
  const logoUrl = vendor?.logoUrl || vendorStatus?.logoUrl;

  // Navigation items
  const navItems: Array<{ label: string; href: string; icon: [string, string] }> = [
    { label: 'Products', href: withBasePath('/vendor/books'), icon: ['fal', 'box'] },
    { label: 'Auctions', href: withBasePath('/vendor/auctions'), icon: ['fal', 'gavel'] },
    { label: 'Custom Offers', href: withBasePath('/vendor/offers'), icon: ['fal', 'tag'] },
    { label: 'Orders', href: withBasePath('/vendor/orders'), icon: ['fal', 'file-invoice-dollar'] },
    { label: 'Reports', href: withBasePath('/vendor/reports'), icon: ['fal', 'chart-line'] },
    {
      label: 'Rare Book Requests',
      href: withBasePath('/vendor/requests'),
      icon: ['fal', 'book-open'],
    },
  ];

  // Handle pending status
  if (vendor?.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <FontAwesomeIcon
            icon={['fal', 'clock']}
            className="text-6xl text-yellow-500 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h2>
          <p className="text-gray-600 mb-6">
            Thank you for applying to become a vendor! Your application is currently being reviewed
            by our team.
          </p>
          <p className="text-sm text-gray-500">
            We typically review applications within 2-3 business days. You'll receive an email
            notification once your application has been processed.
          </p>
        </div>
      </div>
    );
  }

  // Handle rejected status
  if (vendor?.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <FontAwesomeIcon icon={['fal', 'times']} className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Not Approved</h2>
          <p className="text-gray-600 mb-4">
            Unfortunately, your vendor application was not approved at this time.
          </p>
          {vendor.rejectionReason && (
            <div className="bg-white border-l-4 border-red-500 p-4 mb-6 text-left">
              <p className="font-semibold text-gray-900 mb-1">Reason:</p>
              <p className="text-gray-700">{vendor.rejectionReason}</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-6">
            You're welcome to address the concerns and reapply. If you have questions, please
            contact support.
          </p>
          <Link
            href="/vendor-registration"
            className="inline-block bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition"
          >
            Reapply Now
          </Link>
        </div>
      </div>
    );
  }

  // Handle suspended status
  if (vendor?.status === 'suspended') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <FontAwesomeIcon
            icon={['fal', 'exclamation-triangle']}
            className="text-6xl text-red-500 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
          <p className="text-gray-600 mb-6">
            Your vendor account has been temporarily suspended. Please contact support for more
            information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Vendor Logo */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 relative overflow-hidden flex-shrink-0 border-2 border-gray-200">
            <CloudinaryImage
              src={logoUrl}
              alt={shopName || 'Vendor'}
              width={128}
              height={128}
              className="w-full h-full"
              fallbackIcon={['fal', 'store']}
              fallbackText={shopName?.charAt(0)?.toUpperCase() || 'V'}
            />
          </div>

          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                {shopName || 'Vendor Dashboard'}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">Vendor Dashboard</p>
            </div>
            <Link
              href={withBasePath('/vendor/settings')}
              className="text-gray-600 hover:text-primary transition-colors"
              title="Store Settings"
            >
              <FontAwesomeIcon icon={['fal', 'cog']} className="text-xl" />
            </Link>
          </div>
        </div>
        <button
          onClick={() => setShowItemTypeModal(true)}
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 sm:py-2.5 hover:bg-opacity-90 transition w-full sm:w-auto"
        >
          <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
          Add Product
        </button>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4 mb-6 sm:mb-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 p-4 hover:border-secondary transition-all group flex items-center sm:block text-left"
          >
            <FontAwesomeIcon
              icon={item.icon}
              className="text-2xl text-primary group-hover:text-secondary mr-3 sm:mr-0 sm:mb-2"
            />
            <p className="text-sm font-medium text-gray-900">{item.label}</p>
          </Link>
        ))}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-3 sm:p-6 border-l-4 border-green-500 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <FontAwesomeIcon
              icon={['fal', 'dollar-sign']}
              className="text-2xl sm:text-3xl text-green-600"
            />
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {formatMoney(vendor?.balanceAvailable, { fromCents: false })}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Available Balance</p>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="mt-2 sm:mt-3 text-xs text-primary hover:text-secondary font-medium"
          >
            Withdraw &rarr;
          </button>
        </div>

        <div className="bg-white p-3 sm:p-6 border-l-4 border-yellow-500 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <FontAwesomeIcon
              icon={['fal', 'clock']}
              className="text-2xl sm:text-3xl text-yellow-600"
            />
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {formatMoney(vendor?.balancePending, { fromCents: false })}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Pending Balance</p>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">From recent orders</p>
        </div>

        <div className="bg-white p-3 sm:p-6 border-l-4 border-blue-500 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <FontAwesomeIcon
              icon={['fal', 'chart-line']}
              className="text-2xl sm:text-3xl text-blue-600"
            />
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {formatMoney(vendor?.lifetimeVendorEarnings, { fromCents: false })}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Lifetime Earnings</p>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">Your share (92%)</p>
        </div>

        <div className="bg-white p-3 sm:p-6 border-l-4 border-purple-500 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <FontAwesomeIcon
              icon={['fal', 'file-invoice-dollar']}
              className="text-2xl sm:text-3xl text-purple-600"
            />
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {vendor?.totalSales || 0}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">Total Sales</p>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block">All-time transactions</p>
        </div>
      </div>

      {/* Stats & Payout Settings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Stats */}
        <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">
            Performance Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Active Listings</span>
              <span className="font-bold text-gray-900">{stats?.activeListingsCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Active Auctions</span>
              <span className="font-bold text-purple-600">{stats?.auctionCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Pending Orders</span>
              <span className="font-bold text-gray-900">{stats?.pendingOrdersCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Conversion Rate</span>
              <span className="font-bold text-green-600">{stats?.conversionRate || '0.00'}%</span>
            </div>
          </div>
        </div>

        {/* Payout Settings Status */}
        <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">
            Payout Methods
          </h3>
          <div className="space-y-3">
            {/* Stripe Connect */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FontAwesomeIcon
                  icon={['fab', 'stripe']}
                  className="text-lg sm:text-xl text-indigo-600 flex-shrink-0"
                />
                <span className="text-sm sm:text-base text-gray-700">Stripe</span>
              </div>
              {payoutSettings?.stripeAccountId &&
              payoutSettings?.stripeAccountStatus === 'active' ? (
                <span className="flex items-center gap-1 text-green-600 text-xs sm:text-sm flex-shrink-0">
                  <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-base" />
                  Connected
                </span>
              ) : (
                <Link
                  href="/vendor/settings/payouts"
                  className="text-primary hover:text-secondary text-xs sm:text-sm flex-shrink-0"
                >
                  Connect &rarr;
                </Link>
              )}
            </div>

            {/* PayPal */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FontAwesomeIcon
                  icon={['fab', 'paypal']}
                  className="text-lg sm:text-xl text-blue-600 flex-shrink-0"
                />
                <span className="text-sm sm:text-base text-gray-700">PayPal</span>
              </div>
              {payoutSettings?.paypalEmail ? (
                <span className="flex items-center gap-1 text-green-600 text-xs sm:text-sm min-w-0">
                  <FontAwesomeIcon
                    icon={['fal', 'check-circle']}
                    className="text-base flex-shrink-0"
                  />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {payoutSettings.paypalEmail}
                  </span>
                </span>
              ) : (
                <Link
                  href="/vendor/settings/payouts"
                  className="text-primary hover:text-secondary text-sm"
                >
                  Add &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Earnings */}
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-primary">Recent Earnings</h3>
            <Link
              href="/vendor/earnings"
              className="text-primary hover:text-secondary text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              View All &rarr;
            </Link>
          </div>
          {recentEarnings && recentEarnings.length > 0 ? (
            <div className="divide-y">
              {recentEarnings.slice(0, 5).map((earning: any) => (
                <div key={earning.id} className="p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm truncate min-w-0">
                      {earning.orderItem?.book?.title || 'N/A'}
                    </p>
                    <p className="font-bold text-green-600 text-sm flex-shrink-0">
                      {formatMoney(earning.vendorEarnings, { fromCents: false })}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(earning.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No earnings yet</p>
            </div>
          )}
        </div>

        {/* Recent Payouts */}
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-4 border-b flex justify-between items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-primary">Recent Payouts</h3>
            <Link
              href="/vendor/payouts"
              className="text-primary hover:text-secondary text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              View All &rarr;
            </Link>
          </div>
          {recentPayouts && recentPayouts.length > 0 ? (
            <div className="divide-y">
              {recentPayouts.slice(0, 5).map((payout: any) => (
                <div key={payout.id} className="p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm capitalize">
                      {payout.method}
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {formatMoney(payout.amount, { fromCents: false })}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        payout.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : payout.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No payouts yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        availableBalance={parseFloat(vendor?.balanceAvailable || 0)}
      />

      {/* Item Type Selection Modal */}
      <ItemTypeSelectionModal
        isOpen={showItemTypeModal}
        onClose={() => setShowItemTypeModal(false)}
      />
    </div>
  );
}
