'use client';

import AccountNav from '@/components/account/AccountNav';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { usePathname } from 'next/navigation';

export default function AccountLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainAccountPage = pathname === '/account';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show AccountNav on sub-pages, not on main account page */}
      {!isMainAccountPage && <AccountNav />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Only show breadcrumbs on sub-pages */}
        {!isMainAccountPage && <Breadcrumbs />}
        {children}
      </div>
    </div>
  );
}
