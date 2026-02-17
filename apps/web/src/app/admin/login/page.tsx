'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthBasePath, withBasePath } from '@/lib/path-utils';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.error('[AdminLogin] Sign in error:', result.error);
        setError('Invalid credentials or insufficient permissions');
      } else if (result?.ok) {
        // Check if user has admin role
        const response = await fetch(`${getAuthBasePath()}/session`);
        const session = await response.json();

        // Check for both uppercase and lowercase 'admin' role
        if (session?.user?.role?.toLowerCase() === 'admin') {
          router.push(withBasePath('/admin/dashboard'));
        } else {
          console.error('[AdminLogin] User does not have admin role:', session?.user?.role);
          setError('Access restricted to administrators');
        }
      } else {
        console.error('[AdminLogin] Unexpected sign in result:', result);
        setError('An error occurred during sign in');
      }
    } catch (err) {
      console.error('[AdminLogin] Exception during sign in:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill for local/dev
  const handleQuickLogin = () => {
    if (process.env.NODE_ENV === 'development') {
      setEmail('admin@agelessliterature.local');
      setPassword('password');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4"
      data-admin="true"
      suppressHydrationWarning
    >
      <div className="max-w-md w-full" suppressHydrationWarning>
        {/* Logo */}
        <div className="text-center mb-8" suppressHydrationWarning>
          <div className="flex justify-center mb-6" suppressHydrationWarning>
            <div
              className="flex items-center justify-center bg-primary text-white text-3xl font-serif font-bold"
              suppressHydrationWarning
            >
              A|L
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600">Sign in to manage your platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-white shadow-sm border border-gray-200 p-8" suppressHydrationWarning>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={handleQuickLogin}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 transition text-sm"
              >
                🔧 Dev: Auto-fill credentials
              </button>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>Need help? Contact your system administrator</p>
          </div>
        </div>

        {/* Environment Indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Development Mode: admin@agelessliterature.local / password</p>
          </div>
        )}
      </div>
    </div>
  );
}
