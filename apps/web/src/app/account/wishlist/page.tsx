'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/hooks/useWishlist';
import { BookCard } from '@/components/books/BookCard';

export default function WishlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const { data: wishlistItems, isLoading } = useWishlist();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">My Wishlist</h1>
        <p className="text-gray-600 text-lg">
          {wishlistItems && wishlistItems.length > 0
            ? `${wishlistItems.length} ${wishlistItems.length === 1 ? 'book' : 'books'} saved`
            : 'No books in your wishlist yet'}
        </p>
      </div>

      {wishlistItems && wishlistItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) =>
            item.book ? <BookCard key={item.id} book={item.book} /> : null,
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mb-6">
            <svg
              className="w-24 h-24 mx-auto text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">Start adding books you love to keep track of them</p>
          <Link
            href="/books"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-8 py-3 font-semibold transition-colors"
          >
            Browse Books
          </Link>
        </div>
      )}
    </div>
  );
}
