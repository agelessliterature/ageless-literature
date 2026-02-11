'use client';

/**
 * Vendor Settings Page
 * Manage vendor profile, logo, banner, and business information
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageUploader, BannerUploader } from '@/components/cloudinary';
import { updateVendorLogo, updateVendorBanner } from '@/lib/cloudinary-api';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import Link from 'next/link';
import PhoneInput from '@/components/forms/PhoneInput';

export default function VendorSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    shopName: '',
    businessDescription: '',
    websiteUrl: '',
    phoneNumber: '',
    logoUrl: '',
    logoPublicId: '',
    bannerUrl: '',
    bannerPublicId: '',
    socialFacebook: '',
    socialTwitter: '',
    socialInstagram: '',
    socialLinkedin: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    billingAddress: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    taxId: '',
    preferredPayoutMethod: '',
  });

  // Fetch vendor profile
  const { data: vendorData, isLoading } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: async () => {
      const res = await api.get('/api/vendor/profile');
      console.log('Vendor profile response:', res.data);
      return res.data.data;
    },
    enabled: !!session,
  });

  useEffect(() => {
    console.log('vendorData changed:', vendorData);
    if (vendorData) {
      setFormData({
        shopName: vendorData.shopName || '',
        businessDescription: vendorData.businessDescription || '',
        websiteUrl: vendorData.websiteUrl || '',
        phoneNumber: vendorData.phoneNumber || '',
        logoUrl: vendorData.logoUrl || '',
        logoPublicId: vendorData.logoPublicId || '',
        bannerUrl: vendorData.bannerUrl || '',
        bannerPublicId: vendorData.bannerPublicId || '',
        socialFacebook: vendorData.socialFacebook || '',
        socialTwitter: vendorData.socialTwitter || '',
        socialInstagram: vendorData.socialInstagram || '',
        socialLinkedin: vendorData.socialLinkedin || '',
        businessAddress: {
          street: vendorData.businessAddress?.street || '',
          city: vendorData.businessAddress?.city || '',
          state: vendorData.businessAddress?.state || '',
          country: vendorData.businessAddress?.country || '',
          postalCode: vendorData.businessAddress?.postalCode || '',
        },
        billingAddress: {
          street: vendorData.billingAddress?.street || '',
          city: vendorData.billingAddress?.city || '',
          state: vendorData.billingAddress?.state || '',
          country: vendorData.billingAddress?.country || '',
          postalCode: vendorData.billingAddress?.postalCode || '',
        },
        taxId: vendorData.taxId || '',
        preferredPayoutMethod: vendorData.preferredPayoutMethod || '',
      });
    }
  }, [vendorData]);

  // Update vendor profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.patch('/api/vendor/profile', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleLogoUpload = async (result: { url: string; publicId: string }) => {
    try {
      await updateVendorLogo(result);
      setFormData({ ...formData, logoUrl: result.url, logoPublicId: result.publicId });
      toast.success('Logo updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
    } catch (error) {
      toast.error('Failed to update logo');
    }
  };

  const handleBannerUpload = async (result: { url: string; publicId: string }) => {
    try {
      await updateVendorBanner(result);
      setFormData({ ...formData, bannerUrl: result.url, bannerPublicId: result.publicId });
      toast.success('Banner updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
    } catch (error) {
      toast.error('Failed to update banner');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/vendor/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendor Settings</h1>
          <p className="text-gray-600 mt-2">Manage your shop profile and information</p>
        </div>

        <div className="bg-white shadow-md p-4 sm:p-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab('basic')}
                className={`${
                  activeTab === 'basic'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`${
                  activeTab === 'contact'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Contact & Social
              </button>
              <button
                onClick={() => setActiveTab('address')}
                className={`${
                  activeTab === 'address'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Addresses
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`${
                  activeTab === 'financial'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Financial
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={['fal', 'store']} className="text-2xl" />
                    Shop Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Your Rare Books Emporium"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Description
                      </label>
                      <textarea
                        value={formData.businessDescription}
                        onChange={(e) =>
                          setFormData({ ...formData, businessDescription: e.target.value })
                        }
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Tell customers about your business, specialties, years of experience..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {formData.businessDescription.length} characters
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shop Images */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shop Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop Logo
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Square logo for vendor identification
                      </p>
                      <ImageUploader
                        currentImage={formData.logoUrl}
                        onUploadSuccess={handleLogoUpload}
                        folder={`vendors/${vendorData?.id || 'temp'}/logo`}
                        aspectRatio="1:1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop Banner
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Wide banner for vendor page header
                      </p>
                      <BannerUploader
                        currentBanner={formData.bannerUrl}
                        onUploadSuccess={handleBannerUpload}
                        folder={`vendors/${vendorData?.id || 'temp'}/banner`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact & Social Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <PhoneInput
                        value={formData.phoneNumber}
                        onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                        className="px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website URL (Optional)
                      </label>
                      <div className="relative">
                        <FontAwesomeIcon
                          icon={['fal', 'globe']}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-400"
                        />
                        <input
                          type="url"
                          value={formData.websiteUrl}
                          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Social Media Links (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        value={formData.socialFacebook}
                        onChange={(e) =>
                          setFormData({ ...formData, socialFacebook: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter/X URL
                      </label>
                      <input
                        type="url"
                        value={formData.socialTwitter}
                        onChange={(e) =>
                          setFormData({ ...formData, socialTwitter: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        value={formData.socialInstagram}
                        onChange={(e) =>
                          setFormData({ ...formData, socialInstagram: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        value={formData.socialLinkedin}
                        onChange={(e) =>
                          setFormData({ ...formData, socialLinkedin: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-6">
                {/* Business Address */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Business Address</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.businessAddress.street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            businessAddress: {
                              ...formData.businessAddress,
                              street: e.target.value,
                            },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          value={formData.businessAddress.city}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              businessAddress: {
                                ...formData.businessAddress,
                                city: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State/Province
                        </label>
                        <input
                          type="text"
                          value={formData.businessAddress.state}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              businessAddress: {
                                ...formData.businessAddress,
                                state: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="State"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          value={formData.businessAddress.country}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              businessAddress: {
                                ...formData.businessAddress,
                                country: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Country"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.businessAddress.postalCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              businessAddress: {
                                ...formData.businessAddress,
                                postalCode: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Postal Code"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Billing Address</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          billingAddress: { ...formData.businessAddress },
                        })
                      }
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Copy from Business Address
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress.street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: { ...formData.billingAddress, street: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          value={formData.billingAddress.city}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: { ...formData.billingAddress, city: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State/Province
                        </label>
                        <input
                          type="text"
                          value={formData.billingAddress.state}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: { ...formData.billingAddress, state: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="State"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          value={formData.billingAddress.country}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: {
                                ...formData.billingAddress,
                                country: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Country"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.billingAddress.postalCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: {
                                ...formData.billingAddress,
                                postalCode: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="Postal Code"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Financial Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax ID / VAT Number
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="12-3456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Payout Method
                      </label>
                      <select
                        value={formData.preferredPayoutMethod}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredPayoutMethod: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Select method...</option>
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Configure your payout method in{' '}
                        <Link
                          href="/vendor/settings/payouts"
                          className="text-primary hover:underline"
                        >
                          Payout Settings
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                {vendorData && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 p-4">
                        <p className="text-sm text-green-700 font-medium">Available Balance</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          ${parseFloat(vendorData.balanceAvailable || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 p-4">
                        <p className="text-sm text-yellow-700 font-medium">Pending Balance</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-1">
                          ${parseFloat(vendorData.balancePending || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-4">
                        <p className="text-sm text-blue-700 font-medium">Lifetime Earnings</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          ${parseFloat(vendorData.lifetimeVendorEarnings || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex-1 bg-primary text-white py-3 px-6 font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {updateProfileMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
              </button>
              <Link
                href="/vendor/dashboard"
                className="px-8 py-2 border border-gray-300 font-medium hover:bg-gray-50 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
