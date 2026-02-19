/**
 * Admin Vendor Edit Page
 * Edit vendor information
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import adminApi from '@/lib/admin-api-client';
import { ImageUploader, BannerUploader } from '@/components/cloudinary';
import { PhoneInput } from '@/components/forms';

export default function AdminVendorEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    shopName: '',
    shopUrl: '',
    phoneNumber: '',
    businessEmail: '',
    websiteUrl: '',
    businessDescription: '',
    commissionRate: 8,
    status: 'pending',
    adminNotes: '',
    rejectionReason: '',
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
    rating: 0,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch vendor details
  const {
    data: vendorData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-vendor', id],
    queryFn: async () => {
      const session = await getSession();
      const { data } = await adminApi.get(`/admin/vendors/${id}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });
      return data.data;
    },
    enabled: !!id && isMounted,
  });

  // Set form data when vendor loads
  useEffect(() => {
    if (vendorData) {
      setFormData({
        shopName: vendorData.shopName || '',
        shopUrl: vendorData.shopUrl || '',
        phoneNumber: vendorData.phoneNumber || '',
        businessEmail: vendorData.businessEmail || '',
        websiteUrl: vendorData.websiteUrl || '',
        businessDescription: vendorData.businessDescription || '',
        commissionRate: vendorData.commissionRate * 100 || 8,
        status: vendorData.status || 'pending',
        adminNotes: vendorData.adminNotes || '',
        rejectionReason: vendorData.rejectionReason || '',
        logoUrl: vendorData.logoUrl || '',
        logoPublicId: vendorData.logoPublicId || '',
        bannerUrl: vendorData.bannerUrl || '',
        bannerPublicId: vendorData.bannerPublicId || '',
        socialFacebook: vendorData.socialFacebook || '',
        socialTwitter: vendorData.socialTwitter || '',
        socialInstagram: vendorData.socialInstagram || '',
        socialLinkedin: vendorData.socialLinkedin || '',
        businessAddress: vendorData.businessAddress || {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        },
        billingAddress: vendorData.billingAddress || {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        },
        taxId: vendorData.taxId || '',
        preferredPayoutMethod: vendorData.preferredPayoutMethod || '',
        rating: vendorData.rating || 0,
      });
    }
  }, [vendorData]);

  const getErrorMessage = (err: unknown, fallback: string) => {
    const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
    return errorObj.response?.data?.message || errorObj.message || fallback;
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const session = await getSession();
      const response = await adminApi.put(
        `/admin/vendors/${id}`,
        {
          ...data,
          commissionRate: data.commissionRate / 100,
        },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Vendor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-vendor', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      router.push(`/admin/vendors/${id}`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update vendor'));
    },
  });

  const updateImagesMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      const session = await getSession();
      const response = await adminApi.put(`/admin/vendors/${id}`, data, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Images updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-vendor', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to update images'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.shopName || !formData.shopUrl) {
      toast.error('Shop name and URL are required');
      setActiveTab('basic'); // Switch to the tab with missing fields
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white  shadow-md p-12 text-center">
            <div className="animate-spin  h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading vendor details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white  shadow-md p-12 text-center">
            <div className="text-red-500 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="text-6xl mx-auto"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Vendor</h2>
            <p className="text-gray-600 mb-4">
              {getErrorMessage(error, 'Failed to load vendor details')}
            </p>
            <Link
              href="/admin/vendors"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
            >
              <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
              Back to Vendors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white  shadow-md p-12 text-center">
            <p className="text-gray-600">No vendor data found</p>
            <Link
              href="/admin/vendors"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium mt-4"
            >
              <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
              Back to Vendors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href={`/admin/vendors/${id}`}
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium"
          >
            <FontAwesomeIcon icon={['fal', 'arrow-left']} className="text-base" />
            Back to Vendor Details
          </Link>
        </div>

        <div className="bg-white  shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Edit Vendor</h1>
            <p className="text-gray-600 mt-2">Update vendor information and business details</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`${
                  activeTab === 'basic'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`${
                  activeTab === 'contact'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Contact & Social
              </button>
              <button
                onClick={() => setActiveTab('address')}
                className={`${
                  activeTab === 'address'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Addresses
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`${
                  activeTab === 'financial'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Financial
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`${
                  activeTab === 'admin'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Admin Settings
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Your Rare Books Emporium"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop URL <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <span className="bg-gray-100 px-4 py-3 border border-r-0 border-gray-300  text-gray-600">
                          agelessliterature.com/shop/
                        </span>
                        <input
                          type="text"
                          value={formData.shopUrl}
                          onChange={(e) => setFormData({ ...formData, shopUrl: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="your-shop-name"
                          required
                        />
                      </div>
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Tell us about the business, specialties, years of experience..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {formData.businessDescription.length} / 100 characters minimum
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
                        onUploadSuccess={(result) => {
                          const nextFormData = {
                            ...formData,
                            logoUrl: result.url,
                            logoPublicId: result.publicId,
                          };
                          setFormData(nextFormData);
                          updateImagesMutation.mutate({
                            logoUrl: result.url,
                            logoPublicId: result.publicId,
                          });
                        }}
                        folder={`vendors/${id}/logo`}
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
                        onUploadSuccess={(result) => {
                          const nextFormData = {
                            ...formData,
                            bannerUrl: result.url,
                            bannerPublicId: result.publicId,
                          };
                          setFormData(nextFormData);
                          updateImagesMutation.mutate({
                            bannerUrl: result.url,
                            bannerPublicId: result.publicId,
                          });
                        }}
                        folder={`vendors/${id}/banner`}
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.businessEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, businessEmail: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="contact@business.com"
                      />
                    </div>

                    <div className="md:col-span-2">
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="12-3456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payout Method
                      </label>
                      <select
                        value={formData.preferredPayoutMethod}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredPayoutMethod: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Select method...</option>
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                      </select>
                    </div>

                    {vendorData?.stripeAccountId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stripe Connect Status
                        </label>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex px-3 py-1  text-sm font-medium ${
                              vendorData.stripeAccountStatus === 'active'
                                ? 'bg-green-100 text-green-800'
                                : vendorData.stripeAccountStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : vendorData.stripeAccountStatus === 'restricted'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {vendorData.stripeAccountStatus || 'Unknown'}
                          </span>
                          <span className="text-sm text-gray-600">
                            ID: {vendorData.stripeAccountId}
                          </span>
                        </div>
                      </div>
                    )}

                    {vendorData?.paypalEmail && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          PayPal Email
                        </label>
                        <div className="px-4 py-3 border border-gray-300  text-gray-700">
                          {vendorData.paypalEmail}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="50"
                        value={formData.commissionRate}
                        onChange={(e) =>
                          setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })
                        }
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor Rating
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="5"
                        value={formData.rating}
                        onChange={(e) =>
                          setFormData({ ...formData, rating: parseFloat(e.target.value) })
                        }
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {vendorData && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Balance Summary (Read-Only)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200  p-4">
                        <p className="text-sm text-green-700 font-medium">Available Balance</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          ${parseFloat(vendorData.balanceAvailable || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200  p-4">
                        <p className="text-sm text-yellow-700 font-medium">Pending Balance</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-1">
                          ${parseFloat(vendorData.balancePending || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200  p-4">
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

            {/* Admin Settings Tab */}
            {activeTab === 'admin' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Admin Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason (Shown to Vendor)
                      </label>
                      <textarea
                        value={formData.rejectionReason}
                        onChange={(e) =>
                          setFormData({ ...formData, rejectionReason: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Provide reason if status is rejected..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes (Internal Only)
                      </label>
                      <textarea
                        value={formData.adminNotes}
                        onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Add internal notes about this vendor..."
                      />
                    </div>
                  </div>
                </div>

                {vendorData && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor History</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Member Since:</span>{' '}
                        {new Date(vendorData.createdAt).toLocaleDateString()}
                      </p>
                      {vendorData.approvedAt && (
                        <p>
                          <span className="font-medium">Approved On:</span>{' '}
                          {new Date(vendorData.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Total Sales:</span>{' '}
                        {vendorData.totalSales || 0} transactions
                      </p>
                      <p>
                        <span className="font-medium">User ID:</span> {vendorData.userId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 bg-primary text-white py-3 px-6  font-medium hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/admin/vendors/${id}`}
                className="px-6 py-3 border border-gray-300  font-medium hover:transition text-center"
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
