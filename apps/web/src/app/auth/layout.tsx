import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Ageless Literature',
  description:
    'Sign in to your Ageless Literature account or create a new account. Access your profile, manage your book collection, and explore exclusive membership benefits.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
