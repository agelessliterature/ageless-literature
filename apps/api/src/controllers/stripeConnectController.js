/**
 * Stripe Connect Controller
 * Handles vendor Stripe Connect account creation, onboarding, and payouts
 */

import stripe from '../config/stripe.js';
import { isStripeConfigured } from '../config/stripe.js';
import db from '../models/index.js';

const { Vendor, User } = db;

/**
 * Create Stripe Connect account for vendor
 * POST /api/stripe/connect/create
 */
export const createConnectAccount = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find vendor for this user
    const vendor = await Vendor.findOne({
      where: { userId },
      include: [{ model: User, as: 'user' }],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor account not found',
      });
    }

    // Check if already has Stripe account
    if (vendor.stripeAccountId) {
      return res.status(200).json({
        success: true,
        message: 'Stripe account already exists',
        data: {
          stripeAccountId: vendor.stripeAccountId,
          status: vendor.stripeAccountStatus || 'pending',
        },
      });
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: vendor.user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: vendor.shopName,
        // Only include URL if websiteUrl exists and is valid
        ...(vendor.websiteUrl && { url: vendor.websiteUrl }),
      },
    });

    // Save Stripe account ID
    await vendor.update({
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
      payoutMethod: 'stripe',
    });

    return res.json({
      success: true,
      message: 'Stripe Connect account created',
      data: {
        stripeAccountId: account.id,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Create Connect Account Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Stripe Connect account',
      error: error.message,
    });
  }
};

/**
 * Get Stripe Connect onboarding link
 * POST /api/stripe/connect/onboard
 */
export const getOnboardingLink = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const userId = req.user?.id;
    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor account not found',
      });
    }

    if (!vendor.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Stripe account not created yet',
      });
    }

    // Get URLs from request body or use defaults
    const { returnUrl, refreshUrl } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const defaultReturnUrl = `${frontendUrl}/vendor/settings/payouts?stripe=success`;
    const defaultRefreshUrl = `${frontendUrl}/vendor/settings/payouts?stripe=refresh`;

    const finalReturnUrl = returnUrl || defaultReturnUrl;
    const finalRefreshUrl = refreshUrl || defaultRefreshUrl;

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: vendor.stripeAccountId,
      refresh_url: finalRefreshUrl,
      return_url: finalReturnUrl,
      type: 'account_onboarding',
    });

    return res.json({
      success: true,
      data: {
        url: accountLink.url,
      },
    });
  } catch (error) {
    console.error('Get Onboarding Link Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create onboarding link',
      error: error.message,
    });
  }
};

/**
 * Get Stripe Connect account status
 * GET /api/stripe/connect/status
 */
export const getAccountStatus = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const userId = req.user?.id;
    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor account not found',
      });
    }

    if (!vendor.stripeAccountId) {
      return res.json({
        success: true,
        data: {
          hasAccount: false,
          status: null,
        },
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(vendor.stripeAccountId);

    // Update status in database
    let status = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.requirements?.disabled_reason) {
      status = 'restricted';
    }

    await vendor.update({ stripeAccountStatus: status });

    return res.json({
      success: true,
      data: {
        hasAccount: true,
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
      },
    });
  } catch (error) {
    console.error('Get Account Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get account status',
      error: error.message,
    });
  }
};

/**
 * Create payout to vendor Stripe account
 * POST /api/stripe/connect/payout
 */
export const createStripePayout = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const { vendorId, amount } = req.body;
    const adminUserId = req.user?.id;

    if (!vendorId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID and amount are required',
      });
    }

    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (!vendor.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor does not have a Stripe Connect account',
      });
    }

    if (vendor.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Vendor Stripe account is not active',
      });
    }

    // Check balance
    const requestedAmount = parseFloat(amount);
    if (requestedAmount > parseFloat(vendor.balanceAvailable)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${vendor.balanceAvailable}`,
      });
    }

    // Create transfer to Connect account
    const transfer = await stripe.transfers.create({
      amount: Math.round(requestedAmount * 100), // Convert to cents
      currency: 'usd',
      destination: vendor.stripeAccountId,
      description: `Payout to ${vendor.shopName}`,
    });

    // Create payout record
    const payout = await db.VendorPayout.create({
      vendorId,
      amount: requestedAmount,
      method: 'stripe',
      status: 'paid',
      transactionId: transfer.id,
      processedAt: new Date(),
      processedBy: adminUserId,
      payoutNotes: 'Automatic Stripe Connect payout',
    });

    // Update vendor balance
    await vendor.update({
      balanceAvailable: parseFloat(vendor.balanceAvailable) - requestedAmount,
    });

    return res.json({
      success: true,
      message: 'Payout completed successfully',
      data: {
        payoutId: payout.id,
        transferId: transfer.id,
        amount: requestedAmount,
      },
    });
  } catch (error) {
    console.error('Create Stripe Payout Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payout',
      error: error.message,
    });
  }
};

/**
 * Get Stripe Connect login link (for Express dashboard)
 * POST /api/stripe/connect/login
 */
export const getLoginLink = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const userId = req.user?.id;
    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor || !vendor.stripeAccountId) {
      return res.status(404).json({
        success: false,
        message: 'Stripe Connect account not found',
      });
    }

    const loginLink = await stripe.accounts.createLoginLink(vendor.stripeAccountId);

    return res.json({
      success: true,
      data: {
        url: loginLink.url,
      },
    });
  } catch (error) {
    console.error('Get Login Link Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create login link',
      error: error.message,
    });
  }
};
