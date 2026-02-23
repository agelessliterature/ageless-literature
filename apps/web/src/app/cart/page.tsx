'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { withBasePath } from '@/lib/path-utils';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/format';

interface CartItem {
  id: number;
  bookId: number | null;
  productId: number | null;
  productType: 'book' | 'product';
  quantity: number;
  product: {
    id: number;
    title: string;
    price: number;
    images?: Array<{ url: string }>;
    media?: Array<{ imageUrl: string }>;
    quantity: number;
    sid?: string;
  };
}

interface CartResponse {
  success: boolean;
  data: {
    items: CartItem[];
    subtotal: number;
    total: number;
  };
}

export default function CartPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Fetch cart items
  const { data: cartData, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await api.get<CartResponse>('/cart');
      return response.data.data;
    },
    enabled: !!session,
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Item removed from cart');
    },
    onError: () => {
      toast.error('Failed to remove item');
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      await api.put(`/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      toast.error('Failed to update quantity');
    },
  });

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Shopping Cart</h1>
            <div className="bg-white rounded-lg shadow-md p-8 mt-8">
              <div className="text-center py-12">
                <FontAwesomeIcon
                  icon={['fal', 'shopping-cart']}
                  className="text-6xl text-gray-400 mb-4"
                />
                <h3 className="mt-2 text-xl font-medium text-gray-900">Please log in</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You need to be logged in to view your cart.
                </p>
                <div className="mt-6">
                  <Link
                    href={withBasePath('/auth/login')}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                  >
                    Log In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
          <PageLoading message="Loading your cart..." fullPage={false} />
        </div>
      </div>
    );
  }

  const items = cartData?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {isEmpty ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <EmptyState
              icon={['fal', 'shopping-cart']}
              title="Your cart is empty"
              description="Start shopping to add items to your cart."
              actionLabel="Browse Books"
              actionHref={withBasePath('/shop')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const product = item.product;

                // Skip items with null/deleted products
                if (!product) {
                  return null;
                }

                const imageUrl =
                  product.images?.[0]?.url || product.media?.[0]?.imageUrl || '/placeholder.jpg';
                const productUrl = withBasePath(`/products/${product.sid || product.id}`);

                return (
                  <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link href={productUrl} className="flex-shrink-0">
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-24 h-24 object-cover rounded"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <Link href={productUrl} className="hover:text-primary">
                          <h3 className="text-lg font-semibold text-gray-900 break-words">
                            {product.title}
                          </h3>
                        </Link>
                        <p className="text-xl font-bold text-primary mt-2">
                          {formatMoney(product.price)}
                        </p>

                        {/* Quantity Display */}
                        <p className="text-sm text-gray-600 mt-4">Qty: {item.quantity}</p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCartMutation.mutate(item.id)}
                        disabled={removeFromCartMutation.isPending}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <FontAwesomeIcon icon={['fal', 'trash-alt']} className="text-xl" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatMoney(cartData?.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatMoney(cartData?.total || 0)}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={withBasePath('/checkout')}
                  className="w-full block text-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href={withBasePath('/shop')}
                  className="w-full block text-center px-6 py-3 mt-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
