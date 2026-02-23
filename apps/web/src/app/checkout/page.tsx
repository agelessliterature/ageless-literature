'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import getStripe from '@/lib/stripe';
import { withBasePath } from '@/lib/path-utils';
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

interface Address {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

const stripePromise = getStripe();

// ─── Payment method definitions (in priority order) ─────────────────────────
const PAYMENT_METHOD_ORDER = ['card', 'apple_pay', 'klarna', 'paypal', 'cashapp', 'venmo'] as const;
type PaymentMethodId = (typeof PAYMENT_METHOD_ORDER)[number];

function buildMethodOrder(selected: PaymentMethodId): string[] {
  return [selected, ...PAYMENT_METHOD_ORDER.filter((m) => m !== selected)];
}

// Inline brand SVG logos ──────────────────────────────────────────────────────
const CardLogo = () => (
  <div className="flex flex-col items-center gap-1">
    <svg viewBox="0 0 32 22" fill="none" className="h-7 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1F36" stroke="#E0E0E0" />
      <rect y="5" width="32" height="6" fill="#F7C948" />
      <rect x="3" y="15" width="9" height="2" rx="1" fill="#E0E0E0" opacity="0.6" />
    </svg>
    <span className="text-xs font-semibold text-gray-700 leading-none">Card</span>
  </div>
);

const ApplePayLogo = () => (
  <div className="flex flex-col items-center gap-1">
    <svg viewBox="0 0 50 20" className="h-7 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#000" />
      <path
        d="M9.5 4.8c.5-.6.8-1.4.7-2.2-.7 0-1.5.4-2 1-.5.5-.8 1.3-.7 2.1.7 0 1.5-.4 2-1zM10.2 5.9c-1.1-.1-2.1.6-2.6.6-.5 0-1.3-.6-2.2-.6C4.2 6 3 6.7 2.3 7.9 1 10.3 1.9 14 3.2 16c.6.9 1.4 1.9 2.4 1.9.9 0 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.7-.9 2.4-1.9.4-.6.7-1.2.9-1.9-1.1-.4-1.9-1.5-1.9-2.7 0-1.1.6-2.1 1.6-2.6-.7-1-1.7-1.8-3.2-1.9z"
        fill="#fff"
      />
      <text x="18" y="14" fontSize="9" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        Pay
      </text>
    </svg>
    <span className="text-xs font-semibold text-gray-700 leading-none">Apple Pay</span>
  </div>
);

const KlarnaLogo = () => (
  <div className="flex flex-col items-center gap-1">
    <svg viewBox="0 0 50 20" className="h-7 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#FFB3C7" />
      <text
        x="7"
        y="14"
        fontSize="9"
        fontWeight="800"
        fill="#1a1a2e"
        fontFamily="Arial, sans-serif"
      >
        klarna
      </text>
    </svg>
    <span className="text-xs font-semibold text-gray-700 leading-none">Klarna</span>
  </div>
);

const PayPalLogo = () => (
  <div className="flex flex-col items-center gap-1">
    <svg viewBox="0 0 50 20" className="h-7 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#003087" />
      <text
        x="7"
        y="14"
        fontSize="8"
        fontWeight="800"
        fill="#009cde"
        fontFamily="Arial, sans-serif"
      >
        Pay
      </text>
      <text x="21" y="14" fontSize="8" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
        Pal
      </text>
    </svg>
    <span className="text-xs font-semibold text-gray-700 leading-none">PayPal</span>
  </div>
);

const CashAppLogo = () => (
  <div className="flex flex-col items-center gap-1">
    <svg viewBox="0 0 28 28" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="#00D632" />
      <text
        x="14"
        y="20"
        fontSize="16"
        fontWeight="800"
        fill="#fff"
        fontFamily="Arial, sans-serif"
        textAnchor="middle"
      >
        $
      </text>
    </svg>
    <span className="text-xs font-semibold text-gray-700 leading-none">Cash App</span>
  </div>
);

const VenmoLogo = () => (
  <div className="flex flex-col items-center gap-1">
    <svg viewBox="0 0 50 20" className="h-7 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#3D95CE" />
      <text x="6" y="14" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
        venmo
      </text>
    </svg>
    <span className="text-xs font-semibold text-gray-700 leading-none">Venmo</span>
  </div>
);

const PAYMENT_METHODS: { id: PaymentMethodId; logo: React.ReactNode; sub: string }[] = [
  { id: 'card', logo: <CardLogo />, sub: 'Credit & Debit' },
  { id: 'apple_pay', logo: <ApplePayLogo />, sub: 'Touch/Face ID' },
  { id: 'klarna', logo: <KlarnaLogo />, sub: 'Buy now, pay later' },
  { id: 'paypal', logo: <PayPalLogo />, sub: 'PayPal balance' },
  { id: 'cashapp', logo: <CashAppLogo />, sub: 'Cash App Pay' },
  { id: 'venmo', logo: <VenmoLogo />, sub: 'Venmo account' },
];

// ─── Payment Method Picker ───────────────────────────────────────────────────
function PaymentMethodPicker({
  selected,
  onChange,
}: {
  selected: PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
      {PAYMENT_METHODS.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange(method.id)}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-2.5 transition-all cursor-pointer focus:outline-none ${
            selected === method.id
              ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          {method.logo}
          <span
            className={`text-[10px] text-center leading-tight ${
              selected === method.id ? 'text-primary' : 'text-gray-500'
            }`}
          >
            {method.sub}
          </span>
        </button>
      ))}
    </div>
  );
}

interface CheckoutFormProps {
  clientSecret: string;
}

function CheckoutForm({ clientSecret }: CheckoutFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();

  const [shippingAddress, setShippingAddress] = useState<Address>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'United States',
  });

  const [billingAddress, setBillingAddress] = useState<Address>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'United States',
  });

  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId>('card');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    label: string;
    discountAmount: number;
    freeShipping: boolean;
  } | null>(null);

  // Fetch cart items
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await api.get<CartResponse>('/cart');
      return response.data.data;
    },
    enabled: !!session,
  });

  // Load applied coupon from cart data
  useEffect(() => {
    if (cartData && (cartData as any).coupon) {
      const c = (cartData as any).coupon;
      setAppliedCoupon({
        code: c.code,
        label: c.label,
        discountAmount: c.discountAmount,
        freeShipping: c.freeShipping || false,
      });
      setCouponCode(c.code);
    }
  }, [cartData]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const response = await api.post('/coupons/apply', { code: couponCode.trim() });
      const data = (response.data as any).data;
      setAppliedCoupon({
        code: data.code,
        label: data.label,
        discountAmount: data.discountAmount,
        freeShipping: data.freeShipping || false,
      });
      toast.success(`Coupon "${data.code}" applied! ${data.label}`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Invalid coupon code';
      toast.error(message);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await api.delete('/coupons/remove');
      setAppliedCoupon(null);
      setCouponCode('');
      toast.success('Coupon removed');
    } catch {
      // Ignore
    }
  };
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethodId?: string) => {
      const items = cartData?.items.map((item: any) => ({
        bookId: item.bookId || undefined,
        productId: item.productId || undefined,
        quantity: item.quantity,
      }));

      const finalBillingAddress = sameAsShipping ? shippingAddress : billingAddress;

      const response = await api.post('/orders', {
        items,
        shippingAddress,
        billingAddress: finalBillingAddress,
        paymentMethodId,
        couponCode: appliedCoupon?.code || undefined,
      });

      return response.data.data;
    },
    onSuccess: (order) => {
      toast.success('Order placed successfully!');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push(withBasePath(`/account/orders/${order.id}`));
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to place order';
      toast.error(message);
      setIsProcessing(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      toast.error('Payment system not ready. Please wait...');
      return;
    }

    // Validate shipping address
    if (
      !shippingAddress.fullName ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.stateProvince ||
      !shippingAddress.postalCode ||
      !shippingAddress.country
    ) {
      toast.error('Please fill in all required shipping address fields');
      return;
    }

    // Validate billing address if different
    if (!sameAsShipping) {
      if (
        !billingAddress.fullName ||
        !billingAddress.addressLine1 ||
        !billingAddress.city ||
        !billingAddress.stateProvince ||
        !billingAddress.postalCode ||
        !billingAddress.country
      ) {
        toast.error('Please fill in all required billing address fields');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Submit payment element
      const submitResult = await elements.submit();
      if (submitResult.error) {
        toast.error(submitResult.error.message || 'Failed to submit payment details');
        setIsProcessing(false);
        return;
      }

      // Confirm setup intent to get payment method
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.payment_method) {
        const paymentMethodId = setupIntent.payment_method as string;
        createOrderMutation.mutate(paymentMethodId);
      } else {
        toast.error('Failed to process payment');
        setIsProcessing(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
      setIsProcessing(false);
    }
  };

  const items = cartData?.items || [];
  const isEmpty = items.length === 0;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const shippingCost = appliedCoupon?.freeShipping ? 0 : 10.0;
  const subtotalBeforeDiscount = cartData?.subtotal || 0;
  const subtotalAfterDiscount = Math.max(
    0,
    subtotalBeforeDiscount - (appliedCoupon?.freeShipping ? 0 : discountAmount),
  );
  const tax = subtotalAfterDiscount * 0.08;
  const total = subtotalAfterDiscount + shippingCost + tax;

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <FontAwesomeIcon
              icon={['fal', 'spinner-third']}
              spin
              className="text-5xl text-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center py-12">
              <FontAwesomeIcon
                icon={['fal', 'shopping-cart']}
                className="text-6xl text-gray-400 mb-4"
              />
              <h3 className="mt-2 text-xl font-medium text-gray-900">Your cart is empty</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add items to your cart before checking out.
              </p>
              <div className="mt-6">
                <a
                  href={withBasePath('/shop')}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                >
                  Browse Books
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Items */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
                <div className="space-y-4">
                  {items.map((item) => {
                    const product = item.product;
                    if (!product) return null;

                    const imageUrl =
                      product.images?.[0]?.url ||
                      product.media?.[0]?.imageUrl ||
                      '/placeholder.jpg';

                    return (
                      <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24">
                          <CloudinaryImage
                            src={imageUrl}
                            alt={product.title}
                            width={80}
                            height={96}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                            {product.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
                          <p className="text-base sm:text-lg font-bold text-primary mt-1">
                            {formatMoney(product.price)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shipping Address</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.fullName}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, fullName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.addressLine1}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine2}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, city: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.stateProvince}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, stateProvince: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.postalCode}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={shippingAddress.country}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, country: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Billing Address</h2>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      disabled={isProcessing}
                    />
                    <span className="text-gray-700">Same as shipping</span>
                  </label>
                </div>

                {!sameAsShipping && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={!sameAsShipping}
                        value={billingAddress.fullName}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, fullName: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={!sameAsShipping}
                        value={billingAddress.addressLine1}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, addressLine1: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={billingAddress.addressLine2}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, addressLine2: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsShipping}
                          value={billingAddress.city}
                          onChange={(e) =>
                            setBillingAddress({ ...billingAddress, city: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State/Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsShipping}
                          value={billingAddress.stateProvince}
                          onChange={(e) =>
                            setBillingAddress({ ...billingAddress, stateProvince: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsShipping}
                          value={billingAddress.postalCode}
                          onChange={(e) =>
                            setBillingAddress({ ...billingAddress, postalCode: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          required={!sameAsShipping}
                          value={billingAddress.country}
                          onChange={(e) =>
                            setBillingAddress({ ...billingAddress, country: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                          disabled={isProcessing}
                        >
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Australia">Australia</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
                <div className="space-y-4">
                  <PaymentMethodPicker
                    selected={selectedPaymentMethod}
                    onChange={setSelectedPaymentMethod}
                  />
                  {clientSecret ? (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <PaymentElement
                        key={selectedPaymentMethod}
                        options={{
                          layout: 'tabs',
                          paymentMethodOrder: buildMethodOrder(selectedPaymentMethod),
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-gray-500">
                      <FontAwesomeIcon
                        icon={['fal', 'spinner-third']}
                        spin
                        className="text-2xl mr-2"
                      />
                      Loading payment form...
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                    <FontAwesomeIcon
                      icon={['fal', 'lock']}
                      className="text-sm mt-0.5 text-green-600"
                    />
                    <p>
                      Your payment information is secure and encrypted. We use Stripe to process
                      payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

                {/* Coupon Code Input */}
                <div className="mb-4">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-green-800">
                          <FontAwesomeIcon icon={['fal', 'ticket-alt']} className="mr-1.5" />
                          {appliedCoupon.code}
                        </span>
                        <span className="block text-xs text-green-600">{appliedCoupon.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-red-500 p-1"
                        title="Remove coupon"
                      >
                        <FontAwesomeIcon icon={['fal', 'times']} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        disabled={isProcessing || couponLoading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                        className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        {couponLoading ? (
                          <FontAwesomeIcon icon={['fal', 'spinner-third']} spin />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({items.length} items)</span>
                    <span>{formatMoney(subtotalBeforeDiscount, { fromCents: false })}</span>
                  </div>
                  {appliedCoupon && discountAmount > 0 && !appliedCoupon.freeShipping && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon.label})</span>
                      <span>-{formatMoney(discountAmount, { fromCents: false })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    {appliedCoupon?.freeShipping ? (
                      <span className="text-green-600">
                        <span className="line-through text-gray-400 mr-1">
                          {formatMoney(10, { fromCents: false })}
                        </span>
                        Free
                      </span>
                    ) : (
                      <span>{formatMoney(shippingCost, { fromCents: false })}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (estimated)</span>
                    <span>{formatMoney(tax, { fromCents: false })}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatMoney(total, { fromCents: false })}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !stripe || !clientSecret}
                  className="w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <FontAwesomeIcon icon={['fal', 'spinner-third']} spin className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={['fal', 'lock']} className="mr-2" />
                      Place Order
                    </>
                  )}
                </button>

                <div className="mt-4 text-xs text-center text-gray-500">
                  By placing your order, you agree to our terms and conditions
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/checkout');
    }
  }, [status, router]);

  // Fetch setup intent client secret
  useEffect(() => {
    if (session && status === 'authenticated') {
      setIsLoadingPayment(true);
      fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            toast.error('Failed to initialize payment');
          }
        })
        .catch((error) => {
          console.error('Failed to fetch setup intent:', error);
          toast.error('Failed to initialize payment');
        })
        .finally(() => {
          setIsLoadingPayment(false);
        });
    }
  }, [session, status]);

  if (status === 'loading' || isLoadingPayment) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <FontAwesomeIcon
              icon={['fal', 'spinner-third']}
              spin
              className="text-5xl text-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Failed to initialize payment system</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
}
