'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const isVendorPage = pathname?.startsWith('/vendor');

  if (isAdminPage || isVendorPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-grow" id="main-content" role="main">
        {children}
      </main>
      <Footer />
    </>
  );
}
