/**
 * Stripe Controller
 * Handle Stripe payment operations
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Setup Intent for saving payment method
 * POST /api/stripe/setup-intent
 */
export const createSetupIntent = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId.toString(),
      },
    });

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create setup intent',
      error: error.message,
    });
  }
};
