/**
 * Vendor Registration Page
 * Complete vendor application form with 8% commission structure
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import PhoneInput from '@/components/forms/PhoneInput';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface VendorApplicationForm {
  shopName: string;
  shopUrl: string;
  phoneNumber: string;
  businessDescription: string;
  websiteUrl?: string;
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  taxId?: string;
  preferredPayoutMethod?: string;
  sampleFiles?: string[];
  agreedToTerms: boolean;
}

export default function VendorRegistrationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<VendorApplicationForm>();

  // Check if user already has a vendor profile
  useEffect(() => {
    const checkVendorStatus = async () => {
      if (status === 'authenticated') {
        try {
          const response = await api.get('/vendor/profile');
          if (response.data.success) {
            const vendor = response.data.data;
            setVendorStatus(vendor.status);
            setRejectionReason(vendor.rejectionReason);

            // Redirect if already approved
            if (vendor.status === 'approved' || vendor.status === 'active') {
              router.push('/vendor/dashboard');
            }
          }
        } catch (error: any) {
          // No vendor profile yet - this is expected for new applicants
          if (error.response?.status !== 404) {
            console.error('Error checking vendor status:', error);
          }
        }
      }
    };

    checkVendorStatus();
  }, [status, router]);

  // Pre-fill user information if logged in
  useEffect(() => {
    if (session?.user) {
      // Phone number can be set if available in extended user object
      // setValue('phoneNumber', session.user.phoneNumber || '');
    }
  }, [session, setValue]);

  // Generate URL slug from shop name
  const shopName = watch('shopName');
  useEffect(() => {
    if (shopName) {
      const slug = shopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('shopUrl', slug);
    }
  }, [shopName, setValue]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      // Upload to your media service (adjust endpoint as needed)
      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const urls = response.data.data.map((file: any) => file.url);
        setUploadedFiles([...uploadedFiles, ...urls]);
        setValue('sampleFiles', [...uploadedFiles, ...urls]);
        toast.success('Files uploaded successfully');
      }
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setValue('sampleFiles', newFiles);
  };

  const onSubmit = async (data: VendorApplicationForm) => {
    if (!session) {
      toast.error('Please sign in to apply as a vendor');
      router.push('/auth/login?callbackUrl=/vendor-registration');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/vendor/apply', {
        ...data,
        sampleFiles: uploadedFiles,
      });

      if (response.data.success) {
        toast.success('Vendor application submitted successfully!');
        setVendorStatus('pending');
      } else {
        toast.error(response.data.message || 'Application failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit application';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show status screens
  if (vendorStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FontAwesomeIcon
              icon={['fal', 'clock']}
              className="text-6xl text-yellow-500 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Under Review</h1>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for applying to become a vendor at Ageless Literature!
            </p>
            <p className="text-gray-600 mb-8">
              Our team is currently reviewing your application. You'll receive an email notification
              within 2-3 business days once your application has been reviewed.
            </p>
            <Link
              href="/account"
              className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
            >
              Go to My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (vendorStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <FontAwesomeIcon
              icon={['fal', 'times-circle']}
              className="text-6xl text-red-500 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
              Application Not Approved
            </h1>
            <p className="text-lg text-gray-600 mb-6 text-center">
              We've reviewed your vendor application and have some concerns:
            </p>
            {rejectionReason && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-800">{rejectionReason}</p>
              </div>
            )}
            <p className="text-gray-600 mb-8 text-center">
              You're welcome to address these concerns and reapply. If you have questions, please
              contact our support team.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setVendorStatus(null)}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Reapply Now
              </button>
              <Link
                href="/contact"
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main registration form
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Become a Vendor</h1>
          <p className="text-xl text-gray-600 mb-2">
            Join our marketplace and reach thousands of rare book collectors worldwide
          </p>
          <p className="text-sm text-gray-500">
            Platform commission: <span className="font-semibold text-primary">8%</span> per sale
            (you keep 92%)
          </p>

          {/* FAQ Link Banner */}
          <div className="bg-white border-2 border-secondary/30 rounded-lg p-4 mt-6 inline-block shadow-sm">
            <p className="text-gray-700 mb-2">
              <FontAwesomeIcon icon={['fal', 'circle-question']} className="text-secondary mr-2" />
              Have questions about becoming a bookseller?
            </p>
            <Link
              href="/faq"
              className="text-secondary hover:text-secondary/80 font-semibold underline transition-colors text-lg"
            >
              View our Comprehensive FAQ →
            </Link>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Account Information - Only show if not logged in */}
            {!session && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-800">
                  Please{' '}
                  <Link
                    href="/auth/login?callbackUrl=/vendor-registration"
                    className="underline font-semibold"
                  >
                    sign in
                  </Link>{' '}
                  or{' '}
                  <Link
                    href="/auth/register?callbackUrl=/vendor-registration"
                    className="underline font-semibold"
                  >
                    create an account
                  </Link>{' '}
                  to apply as a vendor.
                </p>
              </div>
            )}

            {session && (
              <>
                {/* User Info Display */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                  <p className="text-gray-600">
                    {session.user.name} • {session.user.email}
                  </p>
                </div>

                {/* Shop Information */}
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
                        {...register('shopName', { required: 'Shop name is required' })}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Your Rare Books Emporium"
                      />
                      {errors.shopName && (
                        <p className="text-red-500 text-sm mt-1">{errors.shopName.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop URL <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <span className="bg-gray-100 px-4 py-3 border border-r-0 border-gray-300 rounded-l-lg text-gray-600">
                          agelessliterature.com/shop/
                        </span>
                        <input
                          {...register('shopUrl', { required: 'Shop URL is required' })}
                          type="text"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="your-shop-name"
                        />
                      </div>
                      {errors.shopUrl && (
                        <p className="text-red-500 text-sm mt-1">{errors.shopUrl.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FontAwesomeIcon
                          icon={['fal', 'phone']}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-400 z-10"
                        />
                        <PhoneInput
                          {...register('phoneNumber', { required: 'Phone number is required' })}
                          value={watch('phoneNumber') || ''}
                          onChange={(value) => setValue('phoneNumber', value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="+44 1234 567890 or +1 (123) 456-7890"
                          required
                        />
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
                      )}
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
                          {...register('websiteUrl')}
                          type="url"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Description */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={['fal', 'file-alt']} className="text-2xl" />
                    Business Description
                  </h3>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your business and include any relevant links{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('businessDescription', {
                      required: 'Business description is required',
                      minLength: {
                        value: 100,
                        message: 'Please provide at least 100 characters',
                      },
                    })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Tell us about your business, specialties, years of experience, and why you'd like to join our marketplace..."
                  />
                  {errors.businessDescription && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.businessDescription.message}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {watch('businessDescription')?.length || 0} / 100 characters minimum
                  </p>
                </div>

                {/* Sample Files Upload */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={['fal', 'image']} className="text-2xl" />
                    Sample Images
                  </h3>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload sample images of your books or shop (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <FontAwesomeIcon
                        icon={['fal', 'image']}
                        className="text-5xl text-gray-400 mb-2"
                      />
                      <span className="text-sm text-gray-600">
                        {uploading ? 'Uploading...' : 'Click to upload images'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB each</span>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {uploadedFiles.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Sample ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <FontAwesomeIcon icon={['fal', 'times-circle']} className="text-xl" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Business Details (Optional) */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Additional Information (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax/VAT ID
                      </label>
                      <input
                        {...register('taxId')}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Tax identification number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Payout Method
                      </label>
                      <select
                        {...register('preferredPayoutMethod')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Select method</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="paypal">PayPal</option>
                        <option value="stripe">Stripe</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Commission Structure Info */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Commission Structure</h4>
                  <p className="text-blue-800 mb-2">
                    Ageless Literature takes an <strong>8% commission</strong> on all sales made
                    through our platform.
                  </p>
                  <p className="text-blue-700 text-sm">
                    Example: For a $100 book sale, you receive $92.00 and the platform receives
                    $8.00. All commission calculations are transparent and displayed in your vendor
                    dashboard.
                  </p>
                </div>

                {/* Terms Agreement */}
                <div>
                  <label className="flex items-start gap-3">
                    <input
                      {...register('agreedToTerms', {
                        required: 'You must agree to the terms and conditions',
                      })}
                      type="checkbox"
                      className="mt-1 text-xl text-primary border-gray-300 rounded focus:ring-black"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      , and I understand that Ageless Literature will take an 8% commission on all
                      sales.
                    </span>
                  </label>
                  {errors.agreedToTerms && (
                    <p className="text-red-500 text-sm mt-1">{errors.agreedToTerms.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-primary text-white py-4 px-6 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin text-xl"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-2xl" />
                        Submit Application
                      </>
                    )}
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-4 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                How long does the approval process take?
              </h4>
              <p className="text-gray-600">
                Most applications are reviewed within 2-3 business days. You'll receive an email
                notification once your application has been reviewed.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What happens after approval?</h4>
              <p className="text-gray-600">
                Once approved, you'll gain access to your vendor dashboard where you can list
                products, manage inventory, track sales, and view your earnings.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How do payouts work?</h4>
              <p className="text-gray-600">
                Earnings are calculated automatically with our 8% commission deducted. Payouts are
                processed monthly to your preferred payment method.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Can I update my information later?
              </h4>
              <p className="text-gray-600">
                Yes! Once approved, you can update your shop information, business details, and
                payment preferences anytime from your vendor dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
