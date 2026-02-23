import db from '../models/index.js';
import { generateOrderNumber } from '../utils/helpers.js';
import { sendTemplatedEmail, sendSms } from '../services/emailService.js';
import { emitNotification } from '../sockets/index.js';
import inventoryService from '../services/inventoryService.js';
import { validateCoupon, calculateDiscount, recordRedemption } from '../services/couponService.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const {
  Order,
  OrderItem,
  Book,
  Product,
  Vendor,
  VendorEarning,
  User,
  Notification,
  Cart,
  sequelize,
} = db;

export const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId } = req.user;
    const { items, shippingAddress, billingAddress, paymentMethodId } = req.body;

    // Validate payment method
    if (!paymentMethodId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Payment method is required',
      });
    }

    // Validate and reserve inventory for all items first
    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      let itemData, vendorId, itemPrice, inventoryResult;

      // Check if it's a book or product
      if (item.bookId) {
        const book = await Book.findByPk(item.bookId, { transaction });
        if (!book) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: `Book ${item.bookId} not found`,
          });
        }

        // Check availability and reserve inventory
        inventoryResult = await inventoryService.reserveBookInventory(
          item.bookId,
          item.quantity || 1,
          transaction,
        );

        if (!inventoryResult.success) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: `Book "${book.title}" is not available: ${inventoryResult.error}`,
          });
        }

        itemData = inventoryResult.book;
        vendorId = book.vendorId;
        itemPrice = book.price;
      } else if (item.productId) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: `Product ${item.productId} not found`,
          });
        }

        // Reserve product inventory
        inventoryResult = await inventoryService.reserveProductInventory(
          item.productId,
          item.quantity || 1,
          transaction,
        );

        if (!inventoryResult.success) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: `Product "${product.title}" is not available: ${inventoryResult.error}`,
          });
        }

        itemData = inventoryResult.product;
        vendorId = product.vendorId;
        itemPrice = product.salePrice || product.price;
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Each item must have either bookId or productId',
        });
      }

      const itemSubtotal = parseFloat(itemPrice) * (item.quantity || 1);
      subtotal += itemSubtotal;

      validatedItems.push({
        bookId: item.bookId || null,
        productId: item.productId || null,
        title: itemData.title,
        vendorId: vendorId,
        quantity: item.quantity || 1,
        price: itemPrice,
        subtotal: itemSubtotal,
      });
    }

    const tax = subtotal * 0.08; // Example tax rate
    const shippingCost = 10.0; // Flat shipping

    // --- Coupon Processing ---
    let couponId = null;
    let couponCode = null;
    let discountAmount = 0;
    let appliedCoupon = null;

    // Check if user has a coupon code (from cart or request body)
    const requestCouponCode = req.body.couponCode;
    let effectiveCouponCode = requestCouponCode;

    if (!effectiveCouponCode) {
      // Check if a coupon is stored on the cart
      const userCart = await Cart.findOne({ where: { userId }, transaction });
      if (userCart && userCart.couponCode) {
        effectiveCouponCode = userCart.couponCode;
      }
    }

    if (effectiveCouponCode) {
      try {
        appliedCoupon = await validateCoupon(effectiveCouponCode, userId, validatedItems, subtotal);
        discountAmount = calculateDiscount(appliedCoupon, validatedItems, subtotal, shippingCost);
        couponId = appliedCoupon.id;
        couponCode = appliedCoupon.code;
      } catch (couponError) {
        // If coupon validation fails, we don't block the order - just skip the discount
        console.warn(`Coupon validation failed during order: ${couponError.message}`);
      }
    }

    const totalAmount = subtotal + tax + shippingCost - discountAmount;

    // Look up / create Stripe Customer for this user
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        metadata: { userId: user.id.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save({ transaction });
    }

    // Attach PaymentMethod to Customer (required for PMs from SetupIntents)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (attachError) {
      // PM may already be attached to this customer — that's fine
      if (
        attachError.code !== 'resource_already_exists' &&
        !attachError.message?.includes('already been attached')
      ) {
        await transaction.rollback();
        console.error('Stripe attach PM error:', attachError);
        return res.status(400).json({
          success: false,
          error: attachError.message || 'Failed to attach payment method',
        });
      }
    }

    // Process payment with Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Stripe expects amount in cents
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          userId: userId.toString(),
          orderNumber: 'pending', // Will update after order creation
        },
      });

      // Check if payment succeeded
      if (paymentIntent.status !== 'succeeded') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Payment ${paymentIntent.status}. Please try again or use a different payment method.`,
        });
      }
    } catch (stripeError) {
      await transaction.rollback();
      console.error('Stripe payment error:', stripeError);
      return res.status(400).json({
        success: false,
        error:
          stripeError.message || 'Payment failed. Please check your card details and try again.',
      });
    }

    // Create order (payment succeeded)
    const order = await Order.create(
      {
        userId,
        orderNumber: generateOrderNumber(),
        status: 'pending',
        paymentStatus: 'completed', // Payment succeeded
        paymentMethod: 'card',
        stripePaymentIntentId: paymentIntent.id,
        subtotal,
        tax,
        shippingCost,
        totalAmount,
        couponId,
        couponCode,
        discountAmount,
        shippingAddress,
        billingAddress,
      },
      { transaction },
    );

    // Create order items
    for (const item of validatedItems) {
      await OrderItem.create({ ...item, orderId: order.id }, { transaction });
    }

    // Record coupon redemption if a coupon was applied
    if (appliedCoupon && discountAmount > 0) {
      await recordRedemption(appliedCoupon.id, userId, order.id, discountAmount, transaction);

      // Clear coupon from cart
      const userCart = await Cart.findOne({ where: { userId }, transaction });
      if (userCart) {
        await userCart.update({ couponCode: null }, { transaction });
      }
    }

    // Update PaymentIntent metadata with order number (async, don't block)
    stripe.paymentIntents
      .update(paymentIntent.id, {
        metadata: {
          userId: userId.toString(),
          orderNumber: order.orderNumber,
          orderId: order.id.toString(),
        },
      })
      .catch((err) => console.error('Failed to update PaymentIntent metadata:', err.message));

    // Commit transaction - inventory is now reserved and payment is complete
    await transaction.commit();

    // Process commission since payment is completed
    setImmediate(async () => {
      try {
        await processOrderCommission(order);
      } catch (commissionError) {
        console.error('Failed to process order commission:', commissionError.message);
      }
    });

    // Send order confirmation emails (async, don't block)
    setImmediate(() => {
      sendOrderNotifications(order.id, userId, validatedItems).catch((err) => {
        console.error('Failed to send order emails:', err.message);
      });
    });

    // Send SMS notification if user opted in (async)
    setImmediate(async () => {
      try {
        const user = await User.findByPk(userId);
        const metadata = user?.metadata || {};

        if (metadata.smsOptIn && user?.phoneNumber) {
          await sendSms(
            user.phoneNumber,
            `Ageless Literature: Order #${order.orderNumber} confirmed! Total: $${totalAmount.toFixed(2)}. Track your order at agelessliterature.com/account/orders`,
            {
              type: 'order_confirmation',
              entityId: order.id,
              correlationId: `order_${order.id}`,
            },
          );
          console.log(`[Order] SMS confirmation sent to user ${userId}`);
        }
      } catch (smsError) {
        console.error('Failed to send order SMS:', smsError.message);
      }
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { userId } = req.user;
    const orders = await Order.findAll({
      where: { userId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            { model: Book, as: 'book' },
            { model: Product, as: 'product' },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Book,
              as: 'book',
              include: [
                {
                  model: db.BookMedia,
                  as: 'media',
                  limit: 3,
                  order: [
                    ['isPrimary', 'DESC'],
                    ['displayOrder', 'ASC'],
                  ],
                },
              ],
            },
            { model: Product, as: 'product' },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            { model: Book, as: 'book' },
            { model: Product, as: 'product' },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const previousStatus = order.status;
    await order.update({ status });

    // Process commission when order is paid/completed
    if (
      (status === 'paid' || status === 'completed') &&
      previousStatus !== 'paid' &&
      previousStatus !== 'completed'
    ) {
      await processOrderCommission(order);
    }

    // Settle earnings when order is delivered
    if (status === 'delivered' && previousStatus !== 'delivered') {
      await settleOrderEarnings(order);
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Process vendor commission for paid order
 * Creates VendorEarning records and updates vendor balances
 */
async function processOrderCommission(order) {
  const transaction = await sequelize.transaction();

  try {
    // Process each order item
    for (const item of order.items) {
      if (!item.vendorId) continue; // Skip non-vendor items

      const vendor = await Vendor.findByPk(item.vendorId, { transaction });
      if (!vendor) continue;

      // Calculate commission breakdown
      const grossAmount = parseFloat(item.subtotal);
      const commissionRate = parseFloat(vendor.commissionRate) || 0.08;
      const platformCommission = grossAmount * commissionRate;
      const vendorEarnings = grossAmount - platformCommission;

      // Determine transaction type based on item type
      const transactionType = item.productId ? 'product_sale' : 'book_sale';

      // Create earning record
      await VendorEarning.create(
        {
          vendorId: vendor.id,
          orderId: order.id,
          amount: grossAmount, // Database column: amount (gross amount before commission)
          commissionRateBps: Math.round(commissionRate * 10000), // Convert to basis points
          platformFee: platformCommission, // Database column: platformFee
          netAmount: vendorEarnings, // Database column: netAmount (vendor earnings)
          transactionType,
          status: 'pending', // Will move to completed when order is delivered
        },
        { transaction },
      );

      // Update vendor balances (add to pending until order delivered)
      await vendor.update(
        {
          balancePending: parseFloat(vendor.balancePending) + vendorEarnings,
          lifetimeGrossSales: parseFloat(vendor.lifetimeGrossSales) + grossAmount,
          lifetimeCommissionTaken: parseFloat(vendor.lifetimeCommissionTaken) + platformCommission,
          lifetimeVendorEarnings: parseFloat(vendor.lifetimeVendorEarnings) + vendorEarnings,
          totalSales: vendor.totalSales + 1,
        },
        { transaction },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
}

/**
 * Send order notification emails to buyer and vendors
 * Called after order creation (asynchronously, doesn't block order creation)
 */
async function sendOrderNotifications(orderId, userId, _orderItems) {
  try {
    // Load full order details
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            { model: Book, as: 'book', attributes: ['id', 'title', 'vendorId'] },
            { model: Product, as: 'product', attributes: ['id', 'title', 'vendorId'] },
          ],
        },
      ],
    });

    if (!order) return;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // 1. Send buyer confirmation email
    const buyer = await User.findByPk(userId);
    if (buyer?.email && buyer.emailNotifications !== false) {
      // Check if already sent using JSONB query
      const existingBuyerNotification = Notification
        ? await Notification.findOne({
            where: {
              type: 'ORDER_CONFIRMED_BUYER',
              [sequelize.Op.and]: [
                sequelize.where(
                  sequelize.cast(sequelize.json('data.entityId'), 'text'),
                  String(order.id),
                ),
              ],
            },
          })
        : null;

      if (existingBuyerNotification) {
        console.log(
          `Notification already sent: ORDER_CONFIRMED_BUYER ${order.id} ${existingBuyerNotification.data.recipientEmail}`,
        );
      } else {
        const items = order.items.map((item) => ({
          title: item.book?.title || item.product?.title || 'Item',
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
        }));

        const shippingAddr = order.shippingAddress;
        const shippingAddressStr = shippingAddr
          ? `${shippingAddr.address1 || ''}${shippingAddr.address2 ? ', ' + shippingAddr.address2 : ''}<br/>${shippingAddr.city || ''}, ${shippingAddr.state || ''} ${shippingAddr.postalCode || ''}`
          : 'N/A';

        const orderTotal = parseFloat(order.totalAmount || order.total).toFixed(2);

        // Send email
        await sendTemplatedEmail('order_confirmation_buyer', buyer.email, {
          userName: buyer.name || buyer.firstName || 'Customer',
          orderNumber: order.orderNumber,
          orderTotal,
          items,
          shippingAddress: shippingAddressStr,
          orderLink: `${frontendUrl}/account/orders/${order.id}`,
        });

        console.log(
          `EMAIL: order_confirmation_buyer | recipient=${buyer.email} | orderId=${order.id}`,
        );

        // Persist notification after successful send
        if (Notification) {
          const notificationRecord = await Notification.create({
            userId: buyer.id,
            type: 'ORDER_CONFIRMED_BUYER',
            data: {
              entityType: 'order',
              entityId: String(order.id),
              templateName: 'order_confirmation_buyer',
              recipientEmail: buyer.email,
              sentAt: new Date().toISOString(),
              metadata: {
                orderNumber: order.orderNumber,
                orderTotal,
                itemCount: items.length,
              },
            },
            isRead: false,
          });

          // Emit real-time notification via Socket.IO
          try {
            emitNotification(buyer.id, 'notification:new', notificationRecord.toJSON());
          } catch (socketError) {
            console.error('Failed to emit notification socket event:', socketError.message);
          }
        }
      }
    }

    // 2. Send vendor new order emails (group by vendor)
    const vendorItemsMap = {};
    for (const item of order.items) {
      const vendorId = item.book?.vendorId || item.product?.vendorId;
      if (!vendorId) continue;
      if (!vendorItemsMap[vendorId]) {
        vendorItemsMap[vendorId] = [];
      }
      vendorItemsMap[vendorId].push(item);
    }

    for (const [vendorId, vendorItems] of Object.entries(vendorItemsMap)) {
      const vendor = await Vendor.findByPk(vendorId, {
        include: [{ model: User, as: 'user' }],
      });

      if (!vendor?.user?.email) continue;
      if (vendor.user.emailNotifications === false) continue;

      // Check if already sent to this vendor for this order using JSONB query
      const existingVendorNotification = Notification
        ? await Notification.findOne({
            where: {
              type: 'ORDER_NEW_VENDOR',
              [sequelize.Op.and]: [
                sequelize.where(
                  sequelize.cast(sequelize.json('data.entityId'), 'text'),
                  String(order.id),
                ),
                sequelize.where(
                  sequelize.cast(sequelize.json('data.metadata.vendorId'), 'text'),
                  String(vendor.id),
                ),
              ],
            },
          })
        : null;

      if (existingVendorNotification) {
        console.log(
          `Notification already sent: ORDER_NEW_VENDOR ${order.id} ${vendor.id} ${existingVendorNotification.data.recipientEmail}`,
        );
      } else {
        const items = vendorItems.map((item) => ({
          title: item.book?.title || item.product?.title || 'Item',
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
        }));

        const vendorTotal = vendorItems
          .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
          .toFixed(2);

        // Send email
        await sendTemplatedEmail('order_new_vendor', vendor.user.email, {
          vendorName: vendor.shopName || vendor.user.name || 'Vendor',
          orderNumber: order.orderNumber,
          orderDate: order.createdAt.toLocaleDateString(),
          items,
          vendorTotal,
          orderLink: `${frontendUrl}/vendor/orders/${order.id}`,
        });

        console.log(
          `EMAIL: order_new_vendor | recipient=${vendor.user.email} | orderId=${order.id} | vendorId=${vendor.id}`,
        );

        // Persist notification after successful send
        if (Notification) {
          const notificationRecord = await Notification.create({
            userId: vendor.user.id,
            type: 'ORDER_NEW_VENDOR',
            data: {
              entityType: 'order',
              entityId: String(order.id),
              templateName: 'order_new_vendor',
              recipientEmail: vendor.user.email,
              sentAt: new Date().toISOString(),
              metadata: {
                orderNumber: order.orderNumber,
                vendorId: String(vendor.id),
                vendorName: vendor.shopName,
                vendorTotal,
                itemCount: items.length,
              },
            },
            isRead: false,
          });

          // Emit real-time notification via Socket.IO
          try {
            emitNotification(vendor.user.id, 'notification:new', notificationRecord.toJSON());
          } catch (socketError) {
            console.error('Failed to emit notification socket event:', socketError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('sendOrderNotifications error:', error);
    throw error;
  }
}

/**
 * Move earnings from pending to available when order is delivered
 * Call this when order status changes to 'delivered'
 */
async function settleOrderEarnings(order) {
  const transaction = await sequelize.transaction();

  try {
    // Get all earnings for this order
    const earnings = await VendorEarning.findAll({
      where: { orderId: order.id, status: 'pending' },
      transaction,
    });

    for (const earning of earnings) {
      const vendor = await Vendor.findByPk(earning.vendorId, { transaction });
      if (!vendor) continue;

      const vendorEarnings = parseFloat(earning.netAmount);

      // Move from pending to available
      await vendor.update(
        {
          balancePending: parseFloat(vendor.balancePending) - vendorEarnings,
          balanceAvailable: parseFloat(vendor.balanceAvailable) + vendorEarnings,
        },
        { transaction },
      );

      // Mark earning as completed
      await earning.update(
        {
          status: 'completed',
          completedAt: new Date(),
        },
        { transaction },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
}
