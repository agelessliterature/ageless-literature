/**
 * Stripe Configuration
 * Centralized Stripe setup for Connect and standard payments
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Get Stripe publishable key
 */
export const getStripePublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
};

/**
 * Get Stripe webhook secret
 */
export const getWebhookSecret = () => {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
};

/**
 * Check if Stripe is configured
 */
export const isStripeConfigured = () => {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
};

export default stripe;
