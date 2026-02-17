import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { withBasePath } from '@/lib/path-utils';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <FontAwesomeIcon
            icon={['fal', 'file-search']}
            className="text-8xl sm:text-9xl text-gray-300 mb-6"
          />
          <h1 className="text-6xl sm:text-7xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
          <p className="text-base sm:text-lg text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href={withBasePath('/')}
            className="block w-full px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
          >
            <FontAwesomeIcon icon={['fal', 'home']} className="mr-2" />
            Back to Home
          </Link>
          <Link
            href={withBasePath('/shop')}
            className="block w-full px-6 py-3 bg-white text-gray-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <FontAwesomeIcon icon={['fal', 'books']} className="mr-2" />
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
