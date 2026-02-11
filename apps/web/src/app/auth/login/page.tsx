/**
 * Login Page with Server-Side Authentication Check
 *
 * SECURITY AUDIT (Nov 12, 2025):
 * - Server-side authentication check (prevents flash)
 * - Instant redirect for authenticated users
 * - Zod schema validation in client component
 * - DOMPurify XSS sanitization
 * - ARIA accessibility attributes
 * - Google/Apple OAuth integration
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Ageless Literature',
  description:
    'Sign in to your Ageless Literature account. Access your profile, manage your book collection, place orders, and explore exclusive membership benefits.',
};

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic'; // Disable static generation for this page

// Server component that checks authentication before rendering
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // In Next.js 15, searchParams must be awaited
  const params = await searchParams;

  // Server-side session check - prevents flash of login form
  const session = await getServerSession(authOptions);

  if (session) {
    // User is already logged in, redirect immediately on server
    const callbackUrl = params.callbackUrl || '/account';
    redirect(callbackUrl);
  }

  // User is not logged in, render the login form
  return <LoginForm callbackUrl={params.callbackUrl} />;
}
