'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

/**
 * Admin Root Page
 * Redirects to /admin/login if not authenticated
 * Redirects to /admin/dashboard if authenticated
 */
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return; // Wait for session to load
    }

    if (status === 'unauthenticated' || !session) {
      // Not logged in - redirect to login
      router.replace('/admin/login');
    } else if (session?.user?.role?.toLowerCase() === 'admin') {
      // Logged in as admin - redirect to dashboard
      router.replace('/admin/dashboard');
    } else {
      // Logged in but not admin - redirect to login with error
      router.replace('/admin/login');
    }
  }, [status, session, router]);

  // Show loading state while checking auth
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="text-5xl text-gray-900" />
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    </div>
  );
}
