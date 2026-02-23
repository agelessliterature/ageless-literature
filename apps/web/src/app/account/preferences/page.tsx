'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/clientTranslations';
import toast from 'react-hot-toast';
import LanguageSelector from '@/components/common/LanguageSelector';
import api from '@/lib/api';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import PhoneInput from '@/components/forms/PhoneInput';

export default function PreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('preferences'); // i18n: language-preference fix
  const [formData, setFormData] = useState({
    emailNotifications: true,
    bidAlerts: true,
    auctionReminders: true,
    newsletter: true,
    smsNotifications: false,
    currency: 'USD',
    language: 'en',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session?.user) {
      // Load user preferences
      loadUserPreferences();
    }
  }, [status, router, session]);

  const loadUserPreferences = async () => {
    try {
      const { data } = await api.get('/user/me');
      if (data.success && data.data) {
        const user = data.data;
        const meta = user.metadata || {};

        setFormData((prev) => ({
          ...prev,
          emailNotifications: user.emailNotifications !== false,
          smsNotifications: meta.smsOptIn === true,
        }));

        setPhoneNumber(user.phoneNumber || '');
        setPhoneVerified(meta.phoneVerified === true);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setSendingCode(true);
    try {
      const { data } = await api.post('/sms/start-verification', { phoneNumber });
      if (data.success) {
        setCodeSent(true);
        toast.success('Verification code sent!');
      } else {
        toast.error(data.message || 'Failed to send code');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data } = await api.post('/sms/confirm-verification', { code: verificationCode });
      if (data.success) {
        setPhoneVerified(true);
        setFormData((prev) => ({ ...prev, smsNotifications: true }));
        toast.success('Phone verified! SMS notifications enabled.');
        setCodeSent(false);
        setVerificationCode('');
      } else {
        toast.error(data.message || 'Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify code');
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleSms = async (enabled: boolean) => {
    if (!phoneVerified) {
      toast.error('Please verify your phone number first');
      return;
    }

    try {
      const endpoint = enabled ? '/sms/opt-in' : '/sms/opt-out';
      const { data } = await api.post(endpoint);
      if (data.success) {
        setFormData((prev) => ({ ...prev, smsNotifications: enabled }));
        toast.success(enabled ? 'SMS notifications enabled' : 'SMS notifications disabled');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update SMS preference');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.patch(`/users/${(session?.user as any)?.id}`, {
        emailNotifications: formData.emailNotifications,
        metadata: {
          bidAlerts: formData.bidAlerts,
          auctionReminders: formData.auctionReminders,
          newsletter: formData.newsletter,
        },
        currency: formData.currency,
        defaultLanguage: formData.language,
      });
      if (res.data?.success) {
        toast.success('Preferences updated successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full text-3xl border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
      <p className="text-gray-600 mb-8">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Notification Preferences */}
        <div className="bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('notifications')}</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">{t('emailNotifications')}</span>
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                className="text-base text-secondary focus:ring-secondary border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">{t('bidAlerts')}</span>
              <input
                type="checkbox"
                checked={formData.bidAlerts}
                onChange={(e) => setFormData({ ...formData, bidAlerts: e.target.checked })}
                className="text-base text-secondary focus:ring-secondary border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">{t('auctionReminders')}</span>
              <input
                type="checkbox"
                checked={formData.auctionReminders}
                onChange={(e) => setFormData({ ...formData, auctionReminders: e.target.checked })}
                className="text-base text-secondary focus:ring-secondary border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">{t('newsletter')}</span>
              <input
                type="checkbox"
                checked={formData.newsletter}
                onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                className="text-base text-secondary focus:ring-secondary border-gray-300"
              />
            </label>

            {/* SMS Notifications Section */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">SMS Notifications</h3>

              {/* Phone Number Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <PhoneInput
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      placeholder="+1 (234) 567-8900"
                      disabled={phoneVerified}
                      className="flex-1"
                    />
                    {!phoneVerified && (
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={sendingCode || !phoneNumber}
                        className="px-4 py-2 bg-secondary text-primary font-medium rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {sendingCode ? 'Sending...' : codeSent ? 'Resend Code' : 'Send Code'}
                      </button>
                    )}
                  </div>
                  {phoneVerified && (
                    <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                      <FontAwesomeIcon icon={['fal', 'check-circle']} className="w-4 h-4" />
                      Verified
                    </p>
                  )}
                </div>

                {/* Verification Code Input */}
                {codeSent && !phoneVerified && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) =>
                          setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="123456"
                        maxLength={6}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verifying || verificationCode.length !== 6}
                        className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifying ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the 6-digit code sent to your phone
                    </p>
                  </div>
                )}

                {/* SMS Toggle */}
                <label className="flex items-start justify-between pt-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">Enable SMS Notifications</span>
                      {!phoneVerified && (
                        <span className="text-xs text-gray-500">(Verify phone first)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      By enabling SMS, you agree to receive transactional notifications. Message &
                      data rates may apply. Reply STOP to unsubscribe.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.smsNotifications}
                    onChange={(e) => handleToggleSms(e.target.checked)}
                    disabled={!phoneVerified}
                    className="ml-4 text-base text-secondary focus:ring-secondary border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('displaySettings')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-secondary focus:border-secondary"
              >
                <option value="USD">{t('currencyUSD')}</option>
                <option value="EUR">{t('currencyEUR')}</option>
                <option value="GBP">{t('currencyGBP')}</option>
                <option value="CAD">{t('currencyCAD')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('language')}
              </label>
              <LanguageSelector className="w-full" />
              <p className="mt-2 text-xs text-gray-500">{t('languageDescription')}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('saving') : t('savePreferences')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-white text-gray-700 font-medium border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
