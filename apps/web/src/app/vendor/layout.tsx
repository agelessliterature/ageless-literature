import type { Metadata } from 'next';
import VendorLayout from '@/components/layout/VendorLayout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vendor Dashboard - Ageless Literature',
  description:
    'Manage your bookstore on Ageless Literature. View sales statistics, track inventory, process orders, and monitor earnings for your rare book business.',
};

export default function VendorLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <VendorLayout>{children}</VendorLayout>;
}
