/**
 * Stripe Payment Methods Controller
 * Manage customer payment methods via Stripe API
 */

import db from '../models/index.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { User } = db;

/**
 * GET /api/stripe/payment-methods
 * Get all payment methods for authenticated user
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId, {
      include: [],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create Stripe customer if doesn't exist
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { userId: user.id },
      });

      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    const defaultPaymentMethod =
      customer.invoice_settings?.default_payment_method || user.defaultPaymentMethodId;

    res.json({
      success: true,
      data: {
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
          isDefault: pm.id === defaultPaymentMethod,
        })),
        defaultPaymentMethod,
      },
    });
  } catch (error) {
    console.error('Failed to get payment methods:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/stripe/payment-methods
 * Add new payment method
 */
export const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: 'Payment method ID required' });
    }

    const user = await User.findByPk(userId, {
      include: [],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create customer if doesn't exist
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { userId: user.id },
      });

      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default if it's the first payment method
    const existingMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    if (existingMethods.data.length === 1) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      user.defaultPaymentMethodId = paymentMethodId;
      await user.save();
    }

    res.json({ success: true, message: 'Payment method added successfully' });
  } catch (error) {
    console.error('Failed to add payment method:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/stripe/payment-methods/:paymentMethodId
 * Delete payment method
 */
export const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethodId } = req.params;

    const user = await User.findByPk(userId, {
      include: [],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    // If it was the default, clear it
    if (user.defaultPaymentMethodId === paymentMethodId) {
      user.defaultPaymentMethodId = null;
      await user.save();
    }

    res.json({ success: true, message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Failed to delete payment method:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/stripe/set-default-payment
 * Set default payment method
 */
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: 'Payment method ID required' });
    }

    const user = await User.findByPk(userId, {
      include: [],
    });
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update Stripe customer default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Update user record
    user.defaultPaymentMethodId = paymentMethodId;
    await user.save();

    res.json({ success: true, message: 'Default payment method updated' });
  } catch (error) {
    console.error('Failed to set default payment method:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
