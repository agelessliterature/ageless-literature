/**
 * Admin Memberships Controller
 * Manages membership plans and subscriptions
 */

import db from '../../models/index.js';
import Stripe from 'stripe';
import { sendTemplatedEmail } from '../../services/emailService.js';

const { MembershipPlan, MembershipSubscription, User } = db;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * List all membership plans
 */
export const listPlans = async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;

    const where = {};
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const plans = await MembershipPlan.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['price', 'ASC']],
    });

    return res.json({
      success: true,
      data: plans.rows,
      total: plans.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(plans.count / parseInt(limit)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve membership plans',
      error: error.message,
    });
  }
};

/**
 * Create membership plan
 */
export const createPlan = async (req, res) => {
  try {
    const { name, slug, price, interval, features, description, stripePriceId } = req.body;

    if (!name || !price || !interval) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, price, interval',
      });
    }

    const plan = await MembershipPlan.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      price,
      interval,
      features: features || [],
      description,
      stripePriceId,
    });

    return res.status(201).json({
      success: true,
      data: plan,
      message: 'Membership plan created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create membership plan',
      error: error.message,
    });
  }
};

/**
 * Update membership plan
 */
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await MembershipPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    await plan.update(updates);

    return res.json({
      success: true,
      data: plan,
      message: 'Membership plan updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update membership plan',
      error: error.message,
    });
  }
};

/**
 * Delete membership plan
 */
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await MembershipPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    // Check for active subscriptions
    const activeSubscriptions = await MembershipSubscription.count({
      where: { planId: id, status: 'active' },
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${activeSubscriptions} active subscriptions`,
      });
    }

    await plan.destroy();

    return res.json({
      success: true,
      message: 'Membership plan deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete membership plan',
      error: error.message,
    });
  }
};

/**
 * List subscriptions
 */
export const listSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 50, planId, status, userId, search } = req.query;
    const { Op } = db.Sequelize;

    const where = {};
    if (planId) where.planId = planId;
    if (status) where.status = status;
    if (userId) where.userId = parseInt(userId);

    // Build search condition for user
    const userWhere = {};
    if (search) {
      userWhere[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const subscriptions = await MembershipSubscription.findAndCountAll({
      where,
      include: [
        { model: MembershipPlan, as: 'plan' },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: subscriptions.rows,
      total: subscriptions.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(subscriptions.count / parseInt(limit)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscriptions',
      error: error.message,
    });
  }
};

/**
 * Cancel subscription (admin)
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await MembershipSubscription.findByPk(id, {
      include: [{ model: MembershipPlan, as: 'plan' }],
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    await subscription.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      metadata: { ...subscription.metadata, adminCancelReason: reason },
    });

    return res.json({
      success: true,
      data: subscription,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
};

/**
 * Create subscription for user (admin)
 * POST /api/admin/memberships/subscriptions/create
 */
export const createSubscription = async (req, res) => {
  try {
    const {
      userId,
      planId,
      status = 'active',
      startDate,
      endDate,
      paymentOption = 'skip',
      paymentMethodId,
      skipReason,
    } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'userId and planId are required',
      });
    }

    // Validate payment option
    if (paymentOption === 'skip' && !skipReason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when skipping payment',
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if plan exists
    const plan = await MembershipPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await MembershipSubscription.findOne({
      where: {
        userId,
        status: { [db.Sequelize.Op.in]: ['active', 'trialing'] },
      },
    });

    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        message: 'User already has an active subscription',
      });
    }

    // Calculate dates
    const now = new Date();
    const subscriptionStart = startDate ? new Date(startDate) : now;
    const periodEnd = endDate ? new Date(endDate) : new Date(subscriptionStart);

    // If no end date provided, calculate based on plan interval
    if (!endDate) {
      if (plan.interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (plan.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
    }

    let stripeSubscriptionId = null;
    let stripeCustomerId = null;
    let paymentMethodLast4 = null;
    let paymentMethodBrand = null;
    let subscriptionStatus = status;
    let subscriptionMetadata = {
      createdBy: 'admin',
      createdAt: now.toISOString(),
      paymentOption,
    };

    // Handle different payment options
    if (paymentOption === 'user_method' && paymentMethodId) {
      // Charge user with existing payment method
      try {
        // Get or create Stripe customer
        let customer;
        const existingSub = await MembershipSubscription.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']],
        });

        if (existingSub?.stripeCustomerId) {
          customer = await stripe.customers.retrieve(existingSub.stripeCustomerId);
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            metadata: { userId: userId.toString() },
          });
        }

        stripeCustomerId = customer.id;

        // Verify payment method belongs to user and attach if needed
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (!paymentMethod.customer || paymentMethod.customer !== customer.id) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id,
          });
        }

        // Create Stripe subscription
        if (plan.stripePriceId) {
          const stripeSubscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: plan.stripePriceId }],
            default_payment_method: paymentMethodId,
            metadata: {
              userId: userId.toString(),
              planId: planId.toString(),
              createdByAdmin: 'true',
            },
          });

          stripeSubscriptionId = stripeSubscription.id;
          subscriptionStatus = stripeSubscription.status;
          paymentMethodLast4 = paymentMethod.card?.last4 || null;
          paymentMethodBrand = paymentMethod.card?.brand || null;
        }

        subscriptionMetadata.chargedVia = 'admin_user_method';
      } catch (stripeError) {
        console.error('[Admin] Stripe subscription error:', stripeError);
        return res.status(400).json({
          success: false,
          message: `Failed to process payment: ${stripeError.message}`,
        });
      }
    } else if (paymentOption === 'send_email') {
      // Send email to user to setup payment
      subscriptionStatus = 'incomplete';
      subscriptionMetadata.emailSentAt = now.toISOString();
      subscriptionMetadata.paymentSetupRequired = true;

      // Send email
      try {
        await sendTemplatedEmail('membership-setup-required', user.email, {
          firstName: user.firstName || 'Member',
          planName: plan.name,
          price: `$${plan.price}`,
          interval: plan.interval,
          setupUrl: `${process.env.FRONTEND_URL}/account/membership/setup?planId=${planId}`,
        });
      } catch (emailError) {
        console.error('[Admin] Failed to send setup email:', emailError);
        // Continue anyway, admin can manually notify
      }
    } else if (paymentOption === 'skip') {
      // Skip payment - grant free membership
      subscriptionMetadata.skipReason = skipReason;
      subscriptionMetadata.freeGrant = true;
    }

    // Create subscription in database
    const subscription = await MembershipSubscription.create({
      userId,
      planId,
      status: subscriptionStatus,
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart: subscriptionStart,
      currentPeriodEnd: periodEnd,
      paymentMethodLast4,
      paymentMethodBrand,
      metadata: subscriptionMetadata,
    });

    // Send appropriate notification email
    if (paymentOption === 'user_method' || paymentOption === 'skip') {
      try {
        await sendTemplatedEmail('membership-new', user.email, {
          firstName: user.firstName || 'Member',
          planName: plan.name,
          price: paymentOption === 'skip' ? 'Free (Admin Grant)' : `$${plan.price}`,
          interval: plan.interval,
          nextBillingDate: periodEnd.toLocaleDateString(),
          accountUrl: `${process.env.FRONTEND_URL}/account/membership`,
        });
      } catch (emailError) {
        console.error('[Admin] Failed to send confirmation email:', emailError);
      }
    }

    // Fetch with relations
    const createdSubscription = await MembershipSubscription.findByPk(subscription.id, {
      include: [
        { model: MembershipPlan, as: 'plan' },
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      ],
    });

    return res.status(201).json({
      success: true,
      data: createdSubscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    console.error('[Admin] Create subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message,
    });
  }
};

/**
 * Update subscription (admin)
 * PUT /api/admin/memberships/subscriptions/:id
 */
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, status } = req.body;

    // Find subscription
    const subscription = await MembershipSubscription.findByPk(id, {
      include: [
        { model: MembershipPlan, as: 'plan' },
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      ],
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const updates = {};
    let shouldUpdateStripe = false;
    let newPlan = null;

    // Update plan if changed
    if (planId && planId !== subscription.planId) {
      newPlan = await MembershipPlan.findByPk(planId);
      if (!newPlan) {
        return res.status(404).json({
          success: false,
          message: 'New plan not found',
        });
      }
      updates.planId = planId;
      shouldUpdateStripe = true;
    }

    // Update status if changed
    if (status && status !== subscription.status) {
      updates.status = status;
    }

    // Update Stripe subscription if needed and exists
    if (shouldUpdateStripe && subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId,
        );

        // Update the subscription item with new price
        if (newPlan && newPlan.stripePriceId) {
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                price: newPlan.stripePriceId,
              },
            ],
            proration_behavior: 'create_prorations',
          });
        }

        // Update status in Stripe if needed
        if (status === 'cancelled' && stripeSubscription.status !== 'canceled') {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        } else if (status === 'paused') {
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            pause_collection: { behavior: 'mark_uncollectible' },
          });
        } else if (status === 'active' && stripeSubscription.pause_collection) {
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            pause_collection: null,
          });
        }
      } catch (stripeError) {
        console.error('[Admin] Stripe update error:', stripeError);
        // Continue with local update even if Stripe fails
      }
    }

    // Add metadata about the update
    const currentMetadata = subscription.metadata || {};
    updates.metadata = {
      ...currentMetadata,
      lastUpdatedBy: 'admin',
      lastUpdatedAt: new Date().toISOString(),
      updateHistory: [
        ...(currentMetadata.updateHistory || []),
        {
          timestamp: new Date().toISOString(),
          changes: { planId, status },
        },
      ].slice(-10), // Keep last 10 updates
    };

    // Recalculate period end if plan changed
    if (newPlan) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (newPlan.interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (newPlan.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
      updates.currentPeriodEnd = periodEnd;
    }

    // Update subscription in database
    await subscription.update(updates);

    // Fetch updated subscription with relations
    const updatedSubscription = await MembershipSubscription.findByPk(id, {
      include: [
        { model: MembershipPlan, as: 'plan' },
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      ],
    });

    // Send notification email if plan changed
    if (newPlan && subscription.user) {
      try {
        await sendTemplatedEmail('membership-updated', subscription.user.email, {
          firstName: subscription.user.firstName || 'Member',
          oldPlanName: subscription.plan.name,
          newPlanName: newPlan.name,
          price: `$${newPlan.price}`,
          interval: newPlan.interval,
          nextBillingDate: updates.currentPeriodEnd
            ? new Date(updates.currentPeriodEnd).toLocaleDateString()
            : new Date(subscription.currentPeriodEnd).toLocaleDateString(),
          accountUrl: `${process.env.FRONTEND_URL}/account/membership`,
        });
      } catch (emailError) {
        console.error('[Admin] Failed to send update email:', emailError);
      }
    }

    return res.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    console.error('[Admin] Update subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message,
    });
  }
};
