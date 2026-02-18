'use client';

import { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import ImageZoomModal from '@/components/modals/ImageZoomModal';
import AuctionBadge from '@/components/auctions/AuctionBadge';
import AuctionDetailsPanel from '@/components/auctions/AuctionDetailsPanel';
import PlaceBidModal from '@/components/auctions/PlaceBidModal';
import BuyerOfferModal from '@/components/modals/BuyerOfferModal';
import { AuctionSummary } from '@/types/Auction';
import { formatMoney } from '@/lib/format';
import RelatedItemsCarousel from '@/components/ui/RelatedItemsCarousel';

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auctionIdParam = searchParams.get('auctionId');
  const slugArray = params.slug as string[];
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Extract sid from slug array (format: ["title-slug", "sid"] or ["sid"])
  const sid = slugArray.length > 1 ? slugArray[slugArray.length - 1] : slugArray[0];

  // Try to fetch as a product first, if not found, try as a book
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', sid],
    queryFn: async () => {
      // Try books endpoint first (since books are more common and use sid format)
      try {
        const bookResponse = await api.get(`/books/${sid}`);
        return { ...bookResponse.data.data, type: 'book' };
      } catch (bookErr: any) {
        // If book not found, try products endpoint
        if (bookErr.response?.status === 404) {
          try {
            const productResponse = await api.get(`/products/${sid}`);
            return { ...productResponse.data.data, type: 'product' };
          } catch (productErr: any) {
            // If both fail, throw the original book error
            throw bookErr;
          }
        }
        throw bookErr;
      }
    },
    retry: false,
  });

  // Fetch auction by ID if auctionId is in the URL (from auctions page)
  const { data: auctionById } = useQuery<AuctionSummary | null>({
    queryKey: ['auctionById', auctionIdParam],
    queryFn: async () => {
      if (!auctionIdParam) return null;
      try {
        const response = await api.get(`/auctions/${auctionIdParam}`);
        if (response.data.success && response.data.data) {
          const a = response.data.data;
          return {
            id: a.id,
            auctionableType: a.auctionableType,
            auctionableId: a.auctionableId,
            startingPrice: a.startingPrice || a.startingBid,
            currentBid: a.currentBid || a.startingPrice || a.startingBid,
            bidCount: a.bidCount || 0,
            startsAt: a.startsAt || a.startDate,
            endsAt: a.endsAt || a.endDate,
            status: a.status,
            vendor: a.vendor,
            item: a.item || a.book || a.product,
          } as AuctionSummary;
        }
        return null;
      } catch (err) {
        console.error('Error fetching auction by ID:', err);
        return null;
      }
    },
    enabled: !!auctionIdParam,
  });

  // Fetch active auction for this product (fallback when no auctionId in URL)
  const { data: activeAuctionByProduct } = useQuery<AuctionSummary | null>({
    queryKey: ['activeAuction', product?.id, product?.type],
    queryFn: async () => {
      if (!product?.id) return null;
      try {
        const response = await api.get(`/auctions/active`, {
          params: {
            productId: product.id,
            productType: product.type,
          },
        });
        return response.data.data;
      } catch (err) {
        console.error('Error fetching active auction:', err);
        return null;
      }
    },
    enabled: !!product?.id && !auctionIdParam,
  });

  // Use auction from URL param first, then fallback to active auction lookup
  const activeAuction = auctionById || activeAuctionByProduct;

  // Check if current user can edit this product (vendor ownership check)
  const { data: canEdit } = useQuery({
    queryKey: ['can-edit-product', product?.id, product?.type],
    queryFn: async () => {
      if (!session || !product?.id) return false;

      // Admins can edit anything
      if (session.user?.role === 'admin') return true;

      // Vendors can only edit their own products
      if (session.user?.role === 'vendor') {
        try {
          const endpoint =
            product.type === 'book'
              ? `/vendor/books/${product.id}`
              : `/vendor/collectibles/${product.id}`;
          const response = await api.get(endpoint);
          return response.data.success;
        } catch (err) {
          return false;
        }
      }

      return false;
    },
    enabled: !!session && !!product?.id,
  });

  const { data: related } = useQuery({
    queryKey: ['related-items', product?.id, product?.type],
    queryFn: async () => {
      if (!product?.id) return { products: [], auctions: [] };
      try {
        const endpoint =
          product.type === 'book'
            ? `/books/${product.id}/related`
            : `/products/${product.id}/related`;
        const response = await api.get(endpoint, {
          params: {
            limit: 12,
            debugMode: false, // Set to true for debugging
          },
        });
        return response.data.data;
      } catch (err) {
        console.error('Error fetching related items:', err);
        return { products: [], auctions: [] };
      }
    },
    enabled: !!product?.id,
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const itemIdField = product.type === 'book' ? 'bookId' : 'productId';
      await api.post('/cart', {
        [itemIdField]: product.id,
        quantity: 1,
      });
    },
    onSuccess: () => {
      toast.success('Added to cart!');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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
        // Optionally redirect to login
        // router.push('/auth/login');
      } else if (message) {
        toast.error(message);
      } else {
        toast.error('Failed to add to cart. Please try again.');
      }
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      await api.post('/wishlist', {
        productId: product.id,
      });
    },
    onSuccess: () => {
      toast.success('Added to wishlist!');
    },
    onError: () => {
      toast.error('Failed to add to wishlist');
    },
  });

  const handleMessageSeller = () => {
    if (!session) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
    } else {
      setShowChatWidget(true);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out ${product.title}`,
          url: window.location.href,
        });
      } catch (err) {
        // Share dialog cancelled or failed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePlaceBid = () => {
    if (!session) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
    } else {
      setShowBidModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Product not found</p>
          {error && (
            <p className="text-sm text-red-600 mt-2">
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Handle both products (images array) and books (media array)
  const images =
    product.images ||
    product.media?.map((m: any) => ({
      url: m.imageUrl,
      thumbnail: m.thumbnailUrl,
      publicId: m.publicId,
    })) ||
    [];
  const hasMultipleImages = images.length > 1;

  return (
    <div className="mx-auto px-4 pb-4 sm:pb-8">
      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        images={images}
        initialIndex={selectedImage}
      />

      {/* Image Carousel Section */}
      <div className="relative mb-6 sm:mb-8">
        <div className="bg-gray-100 overflow-hidden">
          <div className="relative aspect-square sm:aspect-[4/3] md:aspect-[3/1]">
            <img
              src={images[selectedImage]?.url || '/placeholder.jpg'}
              alt={product.title}
              className="w-full h-full object-contain cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            />

            {/* Navigation Arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={() =>
                    setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1)
                  }
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-all"
                  aria-label="Previous image"
                >
                  <FontAwesomeIcon
                    icon={['fal', 'chevron-left'] as [string, string]}
                    className="text-lg sm:text-xl text-gray-800"
                  />
                </button>
                <button
                  onClick={() =>
                    setSelectedImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1)
                  }
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-all"
                  aria-label="Next image"
                >
                  <FontAwesomeIcon
                    icon={['fal', 'chevron-right'] as [string, string]}
                    className="text-lg sm:text-xl text-gray-800"
                  />
                </button>
              </>
            )}

            {/* Image Counter */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-black/70 text-white px-2 sm:px-3 py-1 text-xs sm:text-sm">
                {selectedImage + 1} / {images.length}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {hasMultipleImages && (
          <div className="flex gap-2 mt-3 sm:mt-4 overflow-x-auto pb-2 -mx-1 px-1">
            {images.map((img: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`flex-shrink-0 border-2 overflow-hidden transition-all ${
                  selectedImage === idx ? 'border-primary' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img
                  src={img.thumbnail || img.url}
                  alt={`${product.title} ${idx + 1}`}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auction Badge */}
      {activeAuction && (
        <div className="mb-4">
          <AuctionBadge />
        </div>
      )}

      {/* Product Title */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
        {product.title}
      </h1>

      {/* Auction Details Panel or Regular Price */}
      {activeAuction ? (
        <AuctionDetailsPanel auction={activeAuction} className="mb-6 sm:mb-8" />
      ) : (
        <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
          {formatMoney(product.price, { fromCents: false })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 sm:mb-8">
        {/* Edit Product Button - Only for vendor/admin who owns the product */}
        {canEdit && (
          <div className="mb-3">
            <Link
              href={
                product.type === 'book'
                  ? `/vendor/books/${product.id}/edit`
                  : `/vendor/products/${product.id}/edit`
              }
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 px-6 flex items-center justify-center gap-2 hover:scale-105 transition-all text-base sm:text-lg font-semibold border-2 border-orange-500 hover:border-orange-600"
              style={{ borderRadius: '1.5rem' }}
            >
              <FontAwesomeIcon
                icon={['fal', 'edit'] as [string, string]}
                className="text-xl sm:text-2xl"
              />
              <span>Edit Product</span>
            </Link>
          </div>
        )}

        {/* Mobile: Single Primary CTA + Overflow Menu */}
        <div className="lg:hidden">
          {/* Primary CTA */}
          <div className="mb-3">
            {activeAuction ? (
              <button
                onClick={handlePlaceBid}
                className="w-full bg-black hover:bg-secondary text-white hover:text-black py-4 px-6 flex items-center justify-center gap-2 transition-colors text-base font-semibold border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon icon={['fal', 'gavel'] as [string, string]} className="text-xl" />
                <span>{session ? 'Place Bid' : 'Login to Bid'}</span>
              </button>
            ) : (
              <button
                onClick={() => addToCartMutation.mutate()}
                disabled={addToCartMutation.isPending || product.quantity < 1}
                className="w-full bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white text-base font-semibold border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                {addToCartMutation.isPending ? (
                  <>
                    <FontAwesomeIcon
                      icon={['fal', 'spinner'] as [string, string]}
                      className="text-xl animate-spin"
                    />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={['fal', 'shopping-cart'] as [string, string]}
                      className="text-xl"
                    />
                    <span>{product.quantity < 1 ? 'Out of Stock' : 'Add to Cart'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Secondary Actions - Overflow Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOverflowMenu(!showOverflowMenu)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-6 flex items-center justify-center gap-2 transition-all text-base font-medium border-2 border-gray-200 hover:border-gray-300"
              style={{ borderRadius: '1.5rem' }}
            >
              <FontAwesomeIcon
                icon={['fal', 'ellipsis-h'] as [string, string]}
                className="text-xl"
              />
              <span>More Actions</span>
            </button>

            {/* Overflow Menu Dropdown */}
            {showOverflowMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowOverflowMenu(false)} />

                {/* Menu */}
                <div
                  className="absolute left-0 right-0 mt-2 bg-white shadow-2xl border border-gray-200 z-50 overflow-hidden"
                  style={{ borderRadius: '1.5rem' }}
                >
                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      handleMessageSeller();
                    }}
                    className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left border-b border-gray-100"
                  >
                    <FontAwesomeIcon
                      icon={['fal', 'envelope'] as [string, string]}
                      className="text-xl text-gray-700"
                    />
                    <span className="font-medium text-gray-900">Message Vendor</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      if (!session) {
                        toast.error('Please log in to send an offer');
                      } else {
                        setShowOfferModal(true);
                      }
                    }}
                    className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left border-b border-gray-100"
                  >
                    <FontAwesomeIcon
                      icon={['fal', 'tags'] as [string, string]}
                      className="text-xl text-gray-700"
                    />
                    <span className="font-medium text-gray-900">Make Offer</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      addToWishlistMutation.mutate();
                    }}
                    disabled={addToWishlistMutation.isPending}
                    className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left border-b border-gray-100 disabled:opacity-50"
                  >
                    <FontAwesomeIcon
                      icon={['fal', 'heart'] as [string, string]}
                      className="text-xl text-gray-700"
                    />
                    <span className="font-medium text-gray-900">
                      {addToWishlistMutation.isPending ? 'Adding...' : 'Add to Wishlist'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOverflowMenu(false);
                      handleShare();
                    }}
                    className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left"
                  >
                    <FontAwesomeIcon
                      icon={['fal', 'share-alt'] as [string, string]}
                      className="text-xl text-gray-700"
                    />
                    <span className="font-medium text-gray-900">Share</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop: All Buttons Visible */}
        <div className="hidden lg:block">
          {activeAuction ? (
            // Auction Mode - Show Place Bid Button
            <div className="flex gap-3">
              <button
                onClick={handlePlaceBid}
                className="flex-[2] bg-black hover:bg-secondary text-white hover:text-black py-4 px-6 flex items-center justify-center gap-2 transition-colors text-base sm:text-lg font-semibold border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'gavel'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>{session ? 'Place Bid' : 'Login to Bid'}</span>
              </button>

              <button
                onClick={handleMessageSeller}
                className="flex-1 bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors text-base sm:text-lg font-medium"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'envelope'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>Message</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors text-base sm:text-lg font-medium"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'share-alt'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>Share</span>
              </button>
            </div>
          ) : (
            // Regular Purchase Mode
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleMessageSeller}
                className="bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-colors text-base sm:text-lg font-medium flex-1 border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'envelope'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>Message</span>
              </button>

              <button
                onClick={() => addToCartMutation.mutate()}
                disabled={addToCartMutation.isPending || product.quantity < 1}
                className="bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg font-medium flex-1 border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                {addToCartMutation.isPending ? (
                  <>
                    <FontAwesomeIcon
                      icon={['fal', 'spinner'] as [string, string]}
                      className="text-xl sm:text-2xl animate-spin"
                    />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={['fal', 'shopping-cart'] as [string, string]}
                      className="text-xl sm:text-2xl"
                    />
                    <span>{product.quantity < 1 ? 'Out of Stock' : 'Add to Cart'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (!session) {
                    toast.error('Please log in to send an offer');
                    return;
                  }
                  setShowOfferModal(true);
                }}
                className="bg-primary text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-colors text-base sm:text-lg font-medium flex-1 border-2 border-primary hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'tags'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>{session ? 'Send Offer' : 'Login to Send Offer'}</span>
              </button>

              <button
                onClick={() => addToWishlistMutation.mutate()}
                disabled={addToWishlistMutation.isPending}
                className="bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-colors text-base sm:text-lg font-medium flex-1 border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'heart'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>{addToWishlistMutation.isPending ? 'Adding...' : 'Wishlist'}</span>
              </button>

              <button
                onClick={handleShare}
                className="bg-black text-white py-4 px-6 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-colors text-base sm:text-lg font-medium flex-1 border-2 border-black hover:border-secondary"
                style={{ borderRadius: '1.5rem' }}
              >
                <FontAwesomeIcon
                  icon={['fal', 'share-alt'] as [string, string]}
                  className="text-xl sm:text-2xl"
                />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Book/Product Description */}
      <div className="mb-8 sm:mb-12">
        {/* Short Description */}
        {product.shortDescription && (
          <p className="text-base text-gray-700 mb-6 leading-relaxed">
            {typeof product.shortDescription === 'object'
              ? product.shortDescription?.en || product.shortDescription?.html || ''
              : product.shortDescription}
          </p>
        )}

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
          {product.type === 'book' ? 'Book Description' : 'Product Description'}
        </h2>
        <div className="text-gray-700 leading-relaxed">
          {(() => {
            // Get description from various possible sources
            let descText = '';

            // Try fullDescription first (books)
            if (product.fullDescription) {
              if (typeof product.fullDescription === 'object') {
                descText = product.fullDescription?.en || product.fullDescription?.html || '';
              } else {
                descText = product.fullDescription;
              }
            }

            // Fall back to description
            if (!descText && product.description) {
              if (typeof product.description === 'object') {
                descText = product.description?.en || product.description?.html || '';
              } else {
                descText = product.description;
              }
            }

            if (!descText || descText.trim() === '') {
              return <p className="text-gray-500 italic">No description available.</p>;
            }

            // Process the description text - reduce excessive spacing
            const processedHtml = descText
              .replace(/\\n\\n+/g, '</p><p class="mt-3">') // Double newlines become paragraph breaks with reduced spacing
              .replace(/\\n/g, '<br>') // Single newlines become line breaks
              .replace(/\n\n+/g, '</p><p class="mt-3">') // Handle regular double newlines
              .replace(/\n/g, '<br>'); // Single newlines

            return (
              <>
                <div
                  className={`prose prose-sm sm:prose-base max-w-none ${!showFullDescription ? 'line-clamp-3' : ''}`}
                  dangerouslySetInnerHTML={{ __html: `<p class="mt-0">${processedHtml}</p>` }}
                  style={{ lineHeight: '1.6' }}
                />
                {descText.length > 200 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-4 bg-black hover:bg-secondary text-white hover:text-black px-6 py-3 transition-all duration-300 inline-flex items-center gap-2 border-2 border-black hover:border-secondary hover:scale-105 font-semibold"
                    style={{ borderRadius: '1.5rem' }}
                  >
                    {showFullDescription ? 'Show Less' : 'Read More'}
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Additional Details */}
        {(product.category || product.categories || product.materials || product.dimensions) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.categories && product.categories.length > 0 ? (
              <div>
                <span className="font-semibold text-gray-900">
                  {product.categories.length > 1 ? 'Categories:' : 'Category:'}
                </span>{' '}
                <span className="text-gray-700">
                  {product.categories.map((cat: any) => cat.name).join(', ')}
                </span>
              </div>
            ) : (
              product.category && (
                <div>
                  <span className="font-semibold text-gray-900">Category:</span>{' '}
                  <span className="text-gray-700">{product.category}</span>
                </div>
              )
            )}
            {product.materials && (
              <div>
                <span className="font-semibold text-gray-900">Materials:</span>{' '}
                <span className="text-gray-700">{product.materials}</span>
              </div>
            )}
            {product.dimensions && (
              <div>
                <span className="font-semibold text-gray-900">Dimensions:</span>{' '}
                <span className="text-gray-700">{product.dimensions}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vendor/Seller Info */}
      {product.vendor && (
        <div className="bg-gray-50 p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
              {/* Vendor Logo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {product.vendor.logoUrl ? (
                  <img
                    src={product.vendor.logoUrl}
                    alt={product.vendor.shopName || product.vendor.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={['fal', 'store'] as [string, string]}
                    className="text-2xl sm:text-3xl md:text-4xl text-gray-400"
                  />
                )}
              </div>

              {/* Vendor Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {product.vendor.shopName || product.vendor.businessName}
                </h3>
                {product.vendor.isTrustedDealer && (
                  <div className="flex items-center gap-2 mt-1 sm:mt-2">
                    <FontAwesomeIcon
                      icon={['fas', 'shield-check'] as [string, string]}
                      className="text-base sm:text-lg md:text-xl text-green-600"
                    />
                    <span className="text-sm sm:text-base text-green-600 font-semibold">
                      Trusted Dealer
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* View Store Button */}
            <Link
              href={withBasePath(
                `/shop/${product.vendor.shopUrl || product.vendor.slug || product.vendor.id}`,
              )}
              className="bg-black text-white px-6 py-3 sm:px-8 hover:bg-secondary hover:text-black transition-all duration-300 flex items-center justify-center gap-2 border-2 border-black hover:border-secondary hover:scale-105 w-full sm:w-auto"
              style={{ borderRadius: '1.5rem' }}
            >
              <FontAwesomeIcon icon={['fal', 'store'] as [string, string]} className="text-lg" />
              <span className="font-semibold">View Store</span>
            </Link>
          </div>
        </div>
      )}

      {/* Related Products and Auctions */}
      {related && (related.products?.length > 0 || related.auctions?.length > 0) && (
        <>
          {/* Related Products Carousel */}
          {related.products && related.products.length > 0 && (
            <RelatedItemsCarousel
              items={related.products}
              title="Related Items"
              emptyMessage="No related items found"
            />
          )}

          {/* Related Auctions Carousel */}
          {related.auctions && related.auctions.length > 0 && (
            <RelatedItemsCarousel
              items={related.auctions}
              title="Related Auctions"
              emptyMessage="No related auctions found"
            />
          )}
        </>
      )}

      {/* Place Bid Modal */}
      {activeAuction && (
        <PlaceBidModal
          isOpen={showBidModal}
          onClose={() => setShowBidModal(false)}
          auction={activeAuction}
        />
      )}

      {/* Send Offer Modal */}
      {showOfferModal && session && (
        <BuyerOfferModal
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => {
            setShowOfferModal(false);
            toast.success('Offer submitted! The seller will review your offer.');
          }}
          item={{
            type: product.type === 'book' ? 'book' : 'product',
            id: product.id,
            title: product.title,
            price: product.price,
            primaryImage: images?.[0]?.url || images?.[0],
            vendor: product.vendor
              ? {
                  id: product.vendor.id,
                  shopName: product.vendor.shopName || product.vendor.businessName,
                }
              : undefined,
          }}
        />
      )}

      {/* Chat Widget */}
      {showChatWidget && (
        <div className="fixed right-6 bottom-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-lg shadow-2xl z-50 flex flex-col max-h-[600px] border border-gray-200">
          {/* Header */}
          <div className="bg-primary text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Message Seller</h3>
              <p className="text-sm text-white/80 truncate">{product.title}</p>
            </div>
            <button
              onClick={() => setShowChatWidget(false)}
              className="text-white hover:text-gray-200 transition"
            >
              <FontAwesomeIcon icon={['fal', 'times'] as [string, string]} className="text-xl" />
            </button>
          </div>

          {/* Message Area */}
          <div className="flex-1 p-4 min-h-[200px] bg-gray-50">
            <p className="text-sm text-gray-600 mb-4">
              Start a conversation with the seller about "{product.title}"
            </p>
            <button
              onClick={() => {
                if (product.vendor?.id) {
                  window.location.href = `/chat?vendorId=${product.vendor.id}`;
                }
              }}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-all font-semibold"
            >
              Go to Chat
            </button>
          </div>
        </div>
      )}

      {/* Sticky Mobile Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40 pb-safe">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Price Display */}
            <div className="flex-1">
              {activeAuction ? (
                <div>
                  <div className="text-xs text-gray-600">Current Bid</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatMoney(activeAuction.currentBid || activeAuction.startingPrice, {
                      fromCents: false,
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-gray-600">Price</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatMoney(product.price, { fromCents: false })}
                  </div>
                </div>
              )}
            </div>

            {/* Primary CTA Button */}
            <div className="flex-[2]">
              {activeAuction ? (
                <button
                  onClick={handlePlaceBid}
                  className="w-full bg-black hover:bg-secondary text-white hover:text-black py-3 px-4 flex items-center justify-center gap-2 transition-all text-sm font-semibold border-2 border-black hover:border-secondary"
                  style={{ borderRadius: '1.5rem' }}
                >
                  <FontAwesomeIcon
                    icon={['fal', 'gavel'] as [string, string]}
                    className="text-lg"
                  />
                  <span>{session ? 'Place Bid' : 'Login to Bid'}</span>
                </button>
              ) : (
                <button
                  onClick={() => addToCartMutation.mutate()}
                  disabled={addToCartMutation.isPending || product.quantity < 1}
                  className="w-full bg-black text-white py-3 px-4 flex items-center justify-center gap-2 hover:bg-secondary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white text-sm font-semibold border-2 border-black hover:border-secondary"
                  style={{ borderRadius: '1.5rem' }}
                >
                  {addToCartMutation.isPending ? (
                    <>
                      <FontAwesomeIcon
                        icon={['fal', 'spinner'] as [string, string]}
                        className="text-lg animate-spin"
                      />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon
                        icon={['fal', 'shopping-cart'] as [string, string]}
                        className="text-lg"
                      />
                      <span>{product.quantity < 1 ? 'Out of Stock' : 'Add to Cart'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Padding for Sticky Bar - Mobile Only */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
