import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendor Dashboard - Ageless Literature',
  description: 'Manage your books, orders, and sales',
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
