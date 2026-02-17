import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Connect | Ageless Literature',
  description: 'Connect your payment account to sell on Ageless Literature',
};

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4">Seller Connect</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect your payment account to start selling on Ageless Literature. We use Stripe
            Connect to securely handle payments and payouts.
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Register as a Vendor</h3>
              <p className="text-sm text-gray-600">
                Sign up and apply for a vendor account to list your rare books and collectibles.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Connect Stripe</h3>
              <p className="text-sm text-gray-600">
                Complete Stripe onboarding to enable secure payment processing and direct payouts.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Start Selling</h3>
              <p className="text-sm text-gray-600">
                List your items, manage orders, and receive earnings directly to your bank account.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid gap-6 sm:grid-cols-2 mb-8">
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">New Vendors</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ready to sell? Register as a vendor and set up your shop. You&apos;ll be guided
              through Stripe Connect onboarding during setup.
            </p>
            <Link
              href="/vendor-registration"
              className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-2.5 text-sm font-semibold transition-colors"
            >
              Register as Vendor
            </Link>
          </div>
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Existing Vendors</h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage your Stripe Connect account, update payout preferences, or view your payment
              dashboard from vendor settings.
            </p>
            <Link
              href="/vendor/settings/payouts"
              className="inline-block bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 text-sm font-semibold transition-colors"
            >
              Payout Settings
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What is Stripe Connect?</h4>
              <p className="text-sm text-gray-600">
                Stripe Connect is a secure payment platform that handles all transactions between
                buyers and sellers. Your financial data is never stored on our servers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">How do I get paid?</h4>
              <p className="text-sm text-gray-600">
                Earnings are deposited directly to your linked bank account via Stripe. You can view
                your balance and request withdrawals from your vendor dashboard.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What are the fees?</h4>
              <p className="text-sm text-gray-600">
                Ageless Literature charges a platform commission on each sale. The exact rate is
                displayed in your vendor earnings. Stripe&apos;s standard processing fees also
                apply.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
