/**
 * Account Settings Page
 * Comprehensive settings including profile, password, payments, and addresses
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import PhoneInput from '@/components/forms/PhoneInput';
import PageLoading from '@/components/ui/PageLoading';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type TabType = 'profile' | 'password' | 'payment' | 'billing' | 'shipping';

interface Address {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Address states
  const [billingAddress, setBillingAddress] = useState<Address>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  const [shippingAddress, setShippingAddress] = useState<Address>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>('');
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user) {
      // Load user data
      loadUserData();
    }
  }, [status, session, router]);

  const loadUserData = async () => {
    try {
      // Load profile
      const profileRes = await api.get('/users/me');
      if (profileRes.data?.success) {
        const user = profileRes.data.data;
        setProfileData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
        });
      }

      // Load addresses
      try {
        const billingRes = await api.get('/account/billing-address');
        if (billingRes.data?.success && billingRes.data.data) {
          setBillingAddress(billingRes.data.data);
        }
      } catch (err) {
        // No billing address saved yet
      }

      try {
        const shippingRes = await api.get('/account/shipping-address');
        if (shippingRes.data?.success && shippingRes.data.data) {
          setShippingAddress(shippingRes.data.data);
        }
      } catch (err) {
        // No shipping address saved yet
      }

      // Load payment methods
      loadPaymentMethods();
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const res = await api.get('/stripe/payment-methods');
      if (res.data?.success) {
        setPaymentMethods(res.data.data.paymentMethods || []);
        setDefaultPaymentMethod(res.data.data.defaultPaymentMethod || '');
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch(`/users/${session?.user?.id}`, profileData);
      if (res.data?.success) {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/account/update-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (res.data?.success) {
        toast.success('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBillingAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/account/billing-address', billingAddress);
      if (res.data?.success) {
        toast.success('Billing address updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update billing address');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShippingAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/account/shipping-address', shippingAddress);
      if (res.data?.success) {
        toast.success('Shipping address updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update shipping address');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultPayment = async (paymentMethodId: string) => {
    setLoading(true);
    try {
      const res = await api.post('/stripe/set-default-payment', { paymentMethodId });
      if (res.data?.success) {
        setDefaultPaymentMethod(paymentMethodId);
        toast.success('Default payment method updated');
      }
    } catch (error) {
      toast.error('Failed to update default payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    setLoading(true);
    try {
      const res = await api.delete(`/stripe/payment-methods/${paymentMethodId}`);
      if (res.data?.success) {
        toast.success('Payment method deleted');
        loadPaymentMethods();
      }
    } catch (error) {
      toast.error('Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <PageLoading message="Loading settings..." fullPage={true} />;
  }

  if (!session) return null;

  const tabs = [
    {
      key: 'profile' as TabType,
      label: 'Profile Information',
      icon: ['fal', 'user'] as [string, string],
    },
    { key: 'password' as TabType, label: 'Password', icon: ['fal', 'key'] as [string, string] },
    {
      key: 'payment' as TabType,
      label: 'Payment Methods',
      icon: ['fal', 'credit-card'] as [string, string],
    },
    {
      key: 'billing' as TabType,
      label: 'Billing Address',
      icon: ['fal', 'map-marker-alt'] as [string, string],
    },
    {
      key: 'shipping' as TabType,
      label: 'Shipping Address',
      icon: ['fal', 'truck'] as [string, string],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">Account Settings</h1>

      <div className="flex gap-0">
        {/* Tabs - Left Side Navigation */}
        <div className="bg-white shadow-sm border border-gray-200 w-64 flex-shrink-0">
          <nav className="flex flex-col" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-6 border-l-4 font-medium text-sm flex items-center gap-3 transition-colors text-left ${
                  activeTab === tab.key
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="text-base" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content - Right Side */}
        <div className="bg-white shadow-sm border border-l-0 border-gray-200 p-8 flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <PhoneInput
                    value={profileData.phoneNumber}
                    onChange={(value) => setProfileData({ ...profileData, phoneNumber: value })}
                    className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white  hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <FontAwesomeIcon
                      icon={['fal', 'spinner-third']}
                      className="text-base animate-spin"
                    />
                  ) : (
                    <FontAwesomeIcon icon={['fal', 'save']} className="text-base" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-2xl">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white  hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <FontAwesomeIcon
                      icon={['fal', 'spinner-third']}
                      className="text-base animate-spin"
                    />
                  ) : (
                    <FontAwesomeIcon icon={['fal', 'save']} className="text-base" />
                  )}
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Payment Methods</h2>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="px-4 py-2 bg-primary text-white  hover:bg-primary/90 flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
                  Add Card
                </button>
              </div>

              {showAddCard && (
                <Elements stripe={stripePromise}>
                  <AddPaymentMethodForm
                    onSuccess={() => {
                      setShowAddCard(false);
                      loadPaymentMethods();
                    }}
                    onCancel={() => setShowAddCard(false)}
                  />
                </Elements>
              )}

              {paymentMethods.length === 0 && !showAddCard ? (
                <div className="text-center py-12 bg-gray-50 ">
                  <FontAwesomeIcon
                    icon={['fal', 'credit-card']}
                    className="text-5xl text-gray-300 mb-4"
                  />
                  <p className="text-gray-500">No payment methods saved</p>
                  <p className="text-sm text-gray-400 mt-2">Add a card to make checkout faster</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className={`p-4 border-2  flex justify-between items-center ${
                        pm.id === defaultPaymentMethod
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <FontAwesomeIcon
                          icon={['fal', 'credit-card']}
                          className="text-2xl text-gray-400"
                        />
                        <div>
                          <p className="font-medium">
                            {pm.brand.toUpperCase()} •••• {pm.last4}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires {pm.expMonth}/{pm.expYear}
                          </p>
                        </div>
                        {pm.id === defaultPaymentMethod && (
                          <span className="px-2 py-1 bg-primary text-white text-xs  flex items-center gap-1">
                            <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-sm" />
                            Default
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {pm.id !== defaultPaymentMethod && (
                          <button
                            onClick={() => handleSetDefaultPayment(pm.id)}
                            className="px-3 py-1 text-sm border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePaymentMethod(pm.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <FontAwesomeIcon icon={['fal', 'trash']} className="text-base" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billing Address Tab */}
          {activeTab === 'billing' && (
            <form onSubmit={handleUpdateBillingAddress} className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Billing Address</h2>

              <AddressForm address={billingAddress} onChange={setBillingAddress} />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white  hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <FontAwesomeIcon
                      icon={['fal', 'spinner-third']}
                      className="text-base animate-spin"
                    />
                  ) : (
                    <FontAwesomeIcon icon={['fal', 'save']} className="text-base" />
                  )}
                  Save Billing Address
                </button>
              </div>
            </form>
          )}

          {/* Shipping Address Tab */}
          {activeTab === 'shipping' && (
            <form onSubmit={handleUpdateShippingAddress} className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>

              <AddressForm address={shippingAddress} onChange={setShippingAddress} />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white  hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <FontAwesomeIcon
                      icon={['fal', 'spinner-third']}
                      className="text-base animate-spin"
                    />
                  ) : (
                    <FontAwesomeIcon icon={['fal', 'save']} className="text-base" />
                  )}
                  Save Shipping Address
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Address Form Component
function AddressForm({
  address,
  onChange,
}: {
  address: Address;
  onChange: (address: Address) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address.fullName}
          onChange={(e) => onChange({ ...address, fullName: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address.addressLine1}
          onChange={(e) => onChange({ ...address, addressLine1: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
        <input
          type="text"
          value={address.addressLine2}
          onChange={(e) => onChange({ ...address, addressLine2: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          City <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address.city}
          onChange={(e) => onChange({ ...address, city: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          State/Province <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address.state}
          onChange={(e) => onChange({ ...address, state: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Postal Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address.postalCode}
          onChange={(e) => onChange({ ...address, postalCode: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          value={address.country}
          onChange={(e) => onChange({ ...address, country: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="ES">Spain</option>
          <option value="IT">Italy</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <PhoneInput
          value={address.phone}
          onChange={(value) => onChange({ ...address, phone: value })}
          className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
          required
        />
      </div>
    </div>
  );
}

// Add Payment Method Form Component
function AddPaymentMethodForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message || 'Failed to create payment method');
        setLoading(false);
        return;
      }

      // Save to backend
      const res = await api.post('/stripe/payment-methods', {
        paymentMethodId: paymentMethod.id,
      });

      if (res.data?.success) {
        toast.success('Payment method added successfully');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-300  p-6 bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Add New Card</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="p-3 border border-gray-300  bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200  text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300  hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="px-4 py-2 bg-primary text-white  hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <FontAwesomeIcon icon={['fal', 'spinner-third']} className="text-base animate-spin" />
          ) : (
            <FontAwesomeIcon icon={['fal', 'plus']} className="text-base" />
          )}
          Add Card
        </button>
      </div>
    </form>
  );
}
