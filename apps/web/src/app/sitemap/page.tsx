import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sitemap | Ageless Literature',
};

export default function SitemapPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">Sitemap</h1>
      <div className="grid md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Shop</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/shop" className="text-secondary hover:underline">
                Browse Books
              </Link>
            </li>
            <li>
              <Link href="/vendors" className="text-secondary hover:underline">
                Vendors
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Account</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/auth/login" className="text-secondary hover:underline">
                Login
              </Link>
            </li>
            <li>
              <Link href="/account/profile" className="text-secondary hover:underline">
                Profile
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Info</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/about" className="text-secondary hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className="text-secondary hover:underline">
                Accessibility
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
