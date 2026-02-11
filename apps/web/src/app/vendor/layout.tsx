import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendor Dashboard - Ageless Literature',
  description:
    'Manage your bookstore on Ageless Literature. View sales statistics, track inventory, process orders, and monitor earnings for your rare book business.',
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
