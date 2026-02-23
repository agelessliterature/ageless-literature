'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from '@/hooks/useWishlist';
import api from '@/lib/api';
import type { Book, BookListItem } from '@/types';

interface BookCardProps {
  book: Book | BookListItem;
}

export function BookCard({ book }: BookCardProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const isInWishlist = useIsInWishlist(book.id);

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await api.post('/cart', {
        bookId: book.id,
        quantity: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (error: any) => {
      console.error('Add to cart error:', error);
      const status = error.response?.status;
      const message = error.response?.data?.message || error.response?.data?.error;

      if (
        status === 401 ||
        status === 403 ||
        message?.includes('token') ||
        message?.includes('token required')
      ) {
        toast.error('Please log in to add items to your cart');
      } else if (message) {
        toast.error(message);
      } else {
        toast.error('Failed to add to cart. Please try again.');
      }
    },
  });

  // Get primary image - support both Book and BookListItem formats
  let primaryImage: string | null = null;

  if ('primaryImage' in book) {
    // BookListItem format
    primaryImage = book.primaryImage;
  } else if ('media' in book && book.media) {
    // Book format
    const primaryMedia = book.media.find((m) => m.isPrimary) || book.media[0];
    primaryImage = primaryMedia?.thumbnailUrl || primaryMedia?.imageUrl || null;
  } else if ('coverImageUrl' in book) {
    // Fallback to coverImageUrl
    primaryImage = book.coverImageUrl || null;
  }

  // Add Cloudinary transformation to resize large images for thumbnails
  if (
    primaryImage &&
    primaryImage.includes('cloudinary.com') &&
    !primaryImage.includes('/upload/c_fill')
  ) {
    primaryImage = primaryImage.replace('/upload/', '/upload/c_fill,w_600,h_800,q_auto,f_auto/');
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      window.location.href = '/auth/login';
      return;
    }

    if (isInWishlist) {
      removeFromWishlist.mutate(book.id);
    } else {
      addToWishlist.mutate(book.id);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      window.location.href = '/auth/login';
      return;
    }
    addToCartMutation.mutate();
  };

  const isSold = book.status === 'sold' || book.status === 'archived';

  return (
    <Link href={`/products/${book.slug}`} className="group block h-full">
      <div
        className="bg-black border border-gray-700 hover:shadow-xl hover:border-[#d4af37] transition-all duration-300 overflow-hidden h-full flex flex-col"
        style={{ borderRadius: '1.5rem' }}
      >
        {/* Book Cover */}
        <div className="relative aspect-[3/4] bg-gray-100">
          {primaryImage ? (
            <Image
              src={primaryImage}
              quality={75}
              alt={book.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className={`object-cover group-hover:scale-105 transition-transform duration-300 ${isSold ? 'opacity-60' : ''}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <FontAwesomeIcon icon={['fal', 'book']} className="text-6xl" />
            </div>
          )}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-600 text-white text-sm font-bold px-4 py-1.5 shadow-lg tracking-wider">
                SOLD
              </span>
            </div>
          )}
        </div>

        {/* Book Details */}
        <div className="p-4 flex-grow flex flex-col">
          <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2 group-hover:text-[#d4af37] transition-colors h-14">
            {book.title}
          </h3>

          {/* Price */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              {book.salePrice && Number(book.salePrice) < Number(book.price) ? (
                <>
                  <span className="text-2xl font-bold text-white">
                    {Number(book.salePrice).toFixed(0)} USD
                  </span>
                  <span className="text-lg font-medium text-gray-400 line-through">
                    {Number(book.price).toFixed(0)} USD
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-white">
                  {Number(book.price).toFixed(0)} USD
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={(_e) => {
                  // Let the parent Link handle navigation
                }}
                className="flex-1 bg-secondary hover:bg-secondary/90 text-white hover:text-black py-2 px-4 font-semibold transition-all duration-300 text-center border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                {'hasActiveAuction' in book && book.hasActiveAuction ? 'PLACE BID' : 'VIEW'}
              </button>
              <button
                onClick={handleToggleWishlist}
                className="bg-secondary hover:bg-secondary/90 text-black py-2 px-3 font-semibold transition-colors duration-300"
                style={{ borderRadius: '1.5rem' }}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <FontAwesomeIcon
                  icon={isInWishlist ? ['fas', 'heart'] : ['fal', 'heart']}
                  className="text-base"
                />
              </button>
              {/* Only show Add to Cart button if item is NOT in an auction and NOT sold */}
              {!('hasActiveAuction' in book && book.hasActiveAuction) && !isSold && (
                <button
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending}
                  className="bg-secondary hover:bg-secondary/90 text-black py-2 px-3 font-semibold transition-colors duration-300 disabled:opacity-50"
                  style={{ borderRadius: '1.5rem' }}
                  aria-label="Add to cart"
                >
                  <FontAwesomeIcon icon={['fal', 'shopping-cart']} className="text-base" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
