/**
 * PayPal Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Get PayPal API credentials
 */
export const getPayPalConfig = () => {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: process.env.PAYPAL_PAYOUTS_MODE || 'sandbox', // 'sandbox' or 'live'
  };
};

/**
 * Check if PayPal is configured for API payouts
 */
export const isPayPalConfigured = () => {
  const config = getPayPalConfig();
  return !!(config.clientId && config.clientSecret);
};

/**
 * Get PayPal API base URL
 */
export const getPayPalBaseUrl = () => {
  const config = getPayPalConfig();
  return config.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
};

/**
 * Get PayPal OAuth token
 */
export const getPayPalAccessToken = async () => {
  const config = getPayPalConfig();

  if (!isPayPalConfigured()) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
};

export default {
  getPayPalConfig,
  isPayPalConfigured,
  getPayPalBaseUrl,
  getPayPalAccessToken,
};
