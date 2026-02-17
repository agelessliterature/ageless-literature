'use client';

import { useEffect } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Link from 'next/link';
import { withBasePath } from '@/lib/path-utils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <FontAwesomeIcon
            icon={['fal', 'exclamation-triangle']}
            className="text-8xl sm:text-9xl text-red-400 mb-6"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-6">
            We encountered an unexpected error. Please try again.
          </p>
          {error.message && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
              <p className="text-sm text-red-800 font-mono break-words">{error.message}</p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
          >
            <FontAwesomeIcon icon={['fal', 'redo']} className="mr-2" />
            Try Again
          </button>
          <Link
            href={withBasePath('/')}
            className="block w-full px-6 py-3 bg-white text-gray-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <FontAwesomeIcon icon={['fal', 'home']} className="mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
