'use client';

import AccountNav from '@/components/account/AccountNav';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { usePathname } from 'next/navigation';

export default function AccountLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainAccountPage = pathname === '/account';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show AccountNav on sub-pages, not on main account page */}
      {!isMainAccountPage && <AccountNav />}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Account link on sub-pages */}
        {!isMainAccountPage && (
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark mb-4"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-xs" />
            Back to Account
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
