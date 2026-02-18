import type { Metadata } from 'next';
import AdminLayout from '@/components/layout/AdminLayout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Ageless Literature',
  description:
    'Administrative control panel for Ageless Literature. Manage users, vendors, memberships, payouts, and all platform settings for the rare book marketplace.',
};

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
