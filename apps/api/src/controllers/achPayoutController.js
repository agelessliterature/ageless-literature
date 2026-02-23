/**
 * ACH Payout Controller
 * Handles secure ACH bank account setup using Stripe tokenization
 * SECURITY: NO raw bank account numbers or routing numbers are accepted
 * All bank data must be tokenized via Stripe.js before reaching this controller
 */

import stripe from '../config/stripe.js';
import { isStripeConfigured } from '../config/stripe.js';
import db from '../models/index.js';

const { Vendor, User } = db;

/**
 * Setup ACH bank account (TOKENIZED)
 * POST /api/vendor/payouts/ach/setup
 *
 * SECURITY: Accepts ONLY Stripe tokens, never raw bank details
 */
export const setupACHAccount = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const userId = req.user?.userId || req.user?.id; // Support both userId and id
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { stripeToken } = req.body;

    // SECURITY CHECK: Reject if raw bank details are sent
    if (req.body.routingNumber || req.body.accountNumber) {
      console.error('ERROR: SECURITY VIOLATION: Raw bank details submitted');
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Bank details must be tokenized via Stripe.js',
      });
    }

    if (!stripeToken || !stripeToken.startsWith('btok_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing Stripe bank account token',
      });
    }

    // Find vendor
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

    // Check if vendor has Stripe Connect account
    if (!vendor.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Please connect your Stripe account first before adding ACH',
      });
    }

    // Check Stripe account status
    const stripeAccount = await stripe.accounts.retrieve(vendor.stripeAccountId);
    if (!stripeAccount || stripeAccount.charges_enabled === false) {
      return res.status(400).json({
        success: false,
        message: 'Your Stripe account must be fully verified before adding bank accounts',
      });
    }

    // Remove existing ACH account if present
    if (vendor.achExternalAccountId) {
      try {
        await stripe.accounts.deleteExternalAccount(
          vendor.stripeAccountId,
          vendor.achExternalAccountId,
        );
      } catch (error) {
        console.error('Warning: Could not remove old ACH account:', error.message);
        // Continue anyway - old account may already be deleted
      }
    }

    // Create external bank account using tokenized data
    const bankAccount = await stripe.accounts.createExternalAccount(vendor.stripeAccountId, {
      external_account: stripeToken,
      default_for_currency: true, // Make this the default payout account
    });

    // Update vendor with ONLY non-sensitive data
    await vendor.update({
      achExternalAccountId: bankAccount.id,
      achBankName: bankAccount.bank_name,
      achAccountLast4: bankAccount.last4,
      achAccountType: bankAccount.account_holder_type || 'individual',
      achRoutingNumber: bankAccount.routing_number, // For display/reference only
      achFingerprint: bankAccount.fingerprint,
      achStatus: bankAccount.status,
      achVerified: bankAccount.status === 'verified',
      achCreatedAt: new Date(),
      payoutMethod: 'ach', // Set ACH as active payout method
    });

    return res.json({
      success: true,
      message: 'ACH bank account connected successfully',
      data: {
        bankName: bankAccount.bank_name,
        last4: bankAccount.last4,
        accountType: bankAccount.account_holder_type,
        routingNumber: bankAccount.routing_number,
        status: bankAccount.status,
        verified: bankAccount.status === 'verified',
      },
    });
  } catch (error) {
    console.error('ERROR: ACH Setup Error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid bank account token',
      });
    }

    if (error.type === 'StripePermissionError' || error.code === 'oauth_not_supported') {
      return res.status(400).json({
        success: false,
        message:
          'Your Stripe Connect account needs additional verification before adding bank accounts. Please complete your Stripe onboarding or contact support.',
        details:
          'Stripe Connect account requires full verification and transfer capabilities to add external bank accounts.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to setup ACH bank account',
      error: error.message,
    });
  }
};

/**
 * Get ACH account info (NON-SENSITIVE ONLY)
 * GET /api/vendor/payouts/ach
 */
export const getACHAccount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const vendor = await Vendor.findOne({
      where: { userId },
      attributes: [
        'id',
        'achExternalAccountId',
        'achBankName',
        'achAccountLast4',
        'achAccountType',
        'achRoutingNumber',
        'achStatus',
        'achVerified',
        'achCreatedAt',
        'payoutMethod',
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor account not found',
      });
    }

    if (!vendor.achExternalAccountId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          message: 'No ACH account connected',
        },
      });
    }

    // Return ONLY non-sensitive data
    return res.json({
      success: true,
      data: {
        connected: true,
        bankName: vendor.achBankName,
        last4: vendor.achAccountLast4,
        accountType: vendor.achAccountType,
        routingNumber: vendor.achRoutingNumber,
        status: vendor.achStatus,
        verified: vendor.achVerified,
        createdAt: vendor.achCreatedAt,
        isDefault: vendor.payoutMethod === 'ach',
      },
    });
  } catch (error) {
    console.error('Get ACH Account Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ACH account info',
    });
  }
};

/**
 * Remove ACH bank account
 * DELETE /api/vendor/payouts/ach
 */
export const removeACHAccount = async (req, res) => {
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

    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor account not found',
      });
    }

    if (!vendor.achExternalAccountId) {
      return res.json({
        success: true,
        message: 'No ACH account to remove',
      });
    }

    // Delete from Stripe
    if (vendor.stripeAccountId) {
      try {
        await stripe.accounts.deleteExternalAccount(
          vendor.stripeAccountId,
          vendor.achExternalAccountId,
        );
      } catch (error) {
        console.error('Warning: Could not remove ACH from Stripe:', error.message);
        // Continue to clear from database anyway
      }
    }

    // Clear ACH fields from vendor
    await vendor.update({
      achExternalAccountId: null,
      achBankName: null,
      achAccountLast4: null,
      achAccountType: null,
      achRoutingNumber: null,
      achFingerprint: null,
      achStatus: null,
      achVerified: false,
      achCreatedAt: null,
      // Switch payout method to paypal if ACH was default
      payoutMethod: vendor.payoutMethod === 'ach' ? 'paypal' : vendor.payoutMethod,
    });

    return res.json({
      success: true,
      message: 'ACH bank account removed successfully',
    });
  } catch (error) {
    console.error('Remove ACH Account Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove ACH bank account',
      error: error.message,
    });
  }
};

/**
 * Verify ACH account with micro-deposits
 * POST /api/vendor/payouts/ach/verify
 * Body: { amount1: 32, amount2: 45 } (in cents)
 */
export const verifyACHAccount = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured',
      });
    }

    const userId = req.user?.userId || req.user?.id;
    const { amount1, amount2 } = req.body;

    if (!amount1 || !amount2) {
      return res.status(400).json({
        success: false,
        message: 'Both micro-deposit amounts are required',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });

    if (!vendor || !vendor.achExternalAccountId) {
      return res.status(404).json({
        success: false,
        message: 'No ACH account found to verify',
      });
    }

    // Verify micro-deposits
    await stripe.accounts.verifyExternalAccount(
      vendor.stripeAccountId,
      vendor.achExternalAccountId,
      {
        amounts: [parseInt(amount1), parseInt(amount2)],
      },
    );

    // Update verification status
    await vendor.update({
      achStatus: 'verified',
      achVerified: true,
    });

    return res.json({
      success: true,
      message: 'Bank account verified successfully',
      data: {
        verified: true,
        status: 'verified',
      },
    });
  } catch (error) {
    console.error('Verify ACH Account Error:', error);

    if (error.code === 'bank_account_verification_failed') {
      return res.status(400).json({
        success: false,
        message: 'Incorrect micro-deposit amounts. Please try again.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to verify bank account',
      error: error.message,
    });
  }
};
