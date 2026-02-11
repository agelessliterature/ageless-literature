import db from '../models/index.js';
import { sendTemplatedEmail } from '../services/emailService.js';
import Stripe from 'stripe';

const { MembershipPlan, MembershipSubscription, MembershipInvoice } = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get all active membership plans
 */
export const getPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.findAll({
      where: { isActive: true },
      order: [['price', 'ASC']],
    });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get current user's subscription with plan details
 */
export const getUserSubscription = async (req, res) => {
  try {
    const { userId } = req.user;
    const subscription = await MembershipSubscription.findOne({
      where: { userId },
      include: [{ model: MembershipPlan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create new subscription
 */
export const subscribe = async (req, res) => {
  try {
    const { userId, email, firstName } = req.user;
    const { planId, paymentMethodId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, error: 'Plan ID is required' });
    }

    const plan = await MembershipPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    // Check for existing active subscription
    const existingSubscription = await MembershipSubscription.findOne({
      where: { userId, status: 'active' },
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription. Please cancel or upgrade instead.',
      });
    }

    // Create or retrieve Stripe customer
    let customer;
    const existingCustomer = await MembershipSubscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    if (existingCustomer?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(existingCustomer.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email,
        name: firstName || email,
        metadata: { userId: userId.toString() },
      });
    }

    // Attach payment method to customer
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan.stripePriceId }],
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Get payment method details
    const paymentMethod = paymentMethodId
      ? await stripe.paymentMethods.retrieve(paymentMethodId)
      : null;

    // Create subscription in database
    const subscription = await MembershipSubscription.create({
      userId,
      planId,
      status: stripeSubscription.status,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customer.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      paymentMethodLast4: paymentMethod?.card?.last4 || null,
      paymentMethodBrand: paymentMethod?.card?.brand || null,
    });

    // Invoice will be created by webhook when payment succeeds

    // Send welcome email
    await sendTemplatedEmail('membership-new', email, {
      firstName: firstName || 'Member',
      planName: plan.name,
      price: `$${plan.price}`,
      interval: plan.interval,
      nextBillingDate: new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString(),
      accountUrl: `${process.env.FRONTEND_URL}/account/membership`,
    });

    const subscriptionWithPlan = await MembershipSubscription.findByPk(subscription.id, {
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    res.status(201).json({ success: true, data: subscriptionWithPlan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { userId, email, firstName } = req.user;
    const { immediate = false } = req.body;

    const subscription = await MembershipSubscription.findOne({
      where: { userId, status: 'active' },
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    // Cancel subscription in Stripe
    if (immediate) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      await subscription.update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelAtPeriodEnd: false,
      });
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      await subscription.update({
        cancelAtPeriodEnd: true,
      });
    }

    // Send cancellation email
    await sendTemplatedEmail('membership-cancelled', email, {
      firstName: firstName || 'Member',
      planName: subscription.plan.name,
      cancelDate: immediate ? 'immediately' : subscription.currentPeriodEnd.toLocaleDateString(),
    });

    res.json({
      success: true,
      message: immediate
        ? 'Subscription cancelled immediately'
        : 'Subscription will cancel at the end of billing period',
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Pause subscription
 */
export const pauseSubscription = async (req, res) => {
  try {
    const { userId, email, firstName } = req.user;

    const subscription = await MembershipSubscription.findOne({
      where: { userId, status: 'active' },
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    // Pause subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: { behavior: 'void' },
    });

    await subscription.update({
      status: 'paused',
      pausedAt: new Date(),
    });

    // Send pause email
    await sendTemplatedEmail('membership-paused', email, {
      firstName: firstName || 'Member',
      planName: subscription.plan.name,
    });

    res.json({ success: true, message: 'Subscription paused', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Resume subscription
 */
export const resumeSubscription = async (req, res) => {
  try {
    const { userId, email, firstName } = req.user;

    const subscription = await MembershipSubscription.findOne({
      where: { userId, status: 'paused' },
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No paused subscription found' });
    }

    // Resume subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: null,
    });

    await subscription.update({
      status: 'active',
      resumedAt: new Date(),
      cancelAtPeriodEnd: false,
    });

    // Send resume email
    await sendTemplatedEmail('membership-resumed', email, {
      firstName: firstName || 'Member',
      planName: subscription.plan.name,
      nextBillingDate: subscription.currentPeriodEnd.toLocaleDateString(),
    });

    res.json({ success: true, message: 'Subscription resumed', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Rejoin (create new subscription after cancellation)
 */
export const rejoinSubscription = async (req, res) => {
  try {
    const { userId } = req.user;
    const { planId, paymentMethodId } = req.body;

    const previousSubscription = await MembershipSubscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    if (previousSubscription && previousSubscription.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription',
      });
    }

    req.body = { planId, paymentMethodId };
    return subscribe(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Upgrade or downgrade subscription
 */
export const changePlan = async (req, res) => {
  try {
    const { userId, email, firstName } = req.user;
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ success: false, error: 'New plan ID is required' });
    }

    const subscription = await MembershipSubscription.findOne({
      where: { userId, status: 'active' },
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    const newPlan = await MembershipPlan.findByPk(newPlanId);
    if (!newPlan) {
      return res.status(404).json({ success: false, error: 'New plan not found' });
    }

    const oldPlan = subscription.plan;
    const isUpgrade = parseFloat(newPlan.price) > parseFloat(oldPlan.price);

    // Update subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    await subscription.update({
      planId: newPlanId,
    });

    // Send upgrade/downgrade email
    await sendTemplatedEmail(isUpgrade ? 'membership-upgraded' : 'membership-downgraded', email, {
      firstName: firstName || 'Member',
      oldPlanName: oldPlan.name,
      newPlanName: newPlan.name,
      newPrice: `$${newPlan.price}`,
      interval: newPlan.interval,
      nextBillingDate: subscription.currentPeriodEnd.toLocaleDateString(),
    });

    const updatedSubscription = await MembershipSubscription.findByPk(subscription.id, {
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    res.json({
      success: true,
      message: isUpgrade ? 'Plan upgraded successfully' : 'Plan downgraded successfully',
      data: updatedSubscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get user's billing history
 */
export const getBillingHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const invoices = await MembershipInvoice.findAndCountAll({
      where: { userId },
      include: [
        {
          model: MembershipSubscription,
          as: 'subscription',
          include: [{ model: MembershipPlan, as: 'plan' }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: invoices.rows,
      total: invoices.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update payment method
 */
export const updatePaymentMethod = async (req, res) => {
  try {
    const { userId } = req.user;
    const { paymentMethodId, last4, brand } = req.body;

    const subscription = await MembershipSubscription.findOne({
      where: { userId, status: 'active' },
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    // Attach payment method to customer in Stripe
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Update subscription's default payment method
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      default_payment_method: paymentMethodId,
    });

    await subscription.update({
      paymentMethodLast4: last4,
      paymentMethodBrand: brand,
    });

    res.json({ success: true, message: 'Payment method updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
