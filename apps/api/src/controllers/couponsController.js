/**
 * Coupons Controller (Public / Customer-facing)
 * Handles coupon validation and application to cart
 */
import db from '../models/index.js';
import {
  validateCoupon,
  calculateDiscount,
  getDiscountSummary,
} from '../services/couponService.js';

const { Cart, CartItem, Book, Product } = db;

/**
 * POST /coupons/validate
 * Validate a coupon code against the user's current cart
 */
export const validate = async (req, res) => {
  try {
    const { userId } = req.user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    // Get user's cart with items
    const cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            { model: Book, as: 'book' },
            { model: Product, as: 'product' },
          ],
        },
      ],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your cart is empty' });
    }

    // Compute subtotal
    const cartItems = cart.items.map((item) => {
      const prod = item.book || item.product;
      return {
        ...item.toJSON(),
        product: prod,
      };
    });

    const subtotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.product?.salePrice || item.product?.price || 0);
      return sum + price * (item.quantity || 1);
    }, 0);

    // Validate coupon
    const coupon = await validateCoupon(code, userId, cartItems, subtotal);

    // Calculate discount
    const shippingCost = 10;
    const discountAmount = calculateDiscount(coupon, cartItems, subtotal, shippingCost);
    const summary = getDiscountSummary(coupon, discountAmount);

    res.json({
      success: true,
      data: {
        ...summary,
        couponId: coupon.id,
        subtotal,
        discountAmount,
        newSubtotal: Math.max(
          0,
          subtotal - (coupon.discountType !== 'free_shipping' ? discountAmount : 0),
        ),
        freeShipping: coupon.discountType === 'free_shipping',
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * POST /coupons/apply
 * Apply a coupon code to the user's cart (stores it on the cart record)
 */
export const apply = async (req, res) => {
  try {
    const { userId } = req.user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    // Get user's cart with items
    const cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            { model: Book, as: 'book' },
            { model: Product, as: 'product' },
          ],
        },
      ],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your cart is empty' });
    }

    const cartItems = cart.items.map((item) => {
      const prod = item.book || item.product;
      return {
        ...item.toJSON(),
        product: prod,
      };
    });

    const subtotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.product?.salePrice || item.product?.price || 0);
      return sum + price * (item.quantity || 1);
    }, 0);

    // Validate
    const coupon = await validateCoupon(code, userId, cartItems, subtotal);

    // Store on cart
    await cart.update({ couponCode: coupon.code });

    // Calculate discount
    const shippingCost = 10;
    const discountAmount = calculateDiscount(coupon, cartItems, subtotal, shippingCost);
    const summary = getDiscountSummary(coupon, discountAmount);

    res.json({
      success: true,
      data: {
        ...summary,
        couponId: coupon.id,
        subtotal,
        discountAmount,
        newSubtotal: Math.max(
          0,
          subtotal - (coupon.discountType !== 'free_shipping' ? discountAmount : 0),
        ),
        freeShipping: coupon.discountType === 'free_shipping',
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /coupons/remove
 * Remove the applied coupon from the user's cart
 */
export const remove = async (req, res) => {
  try {
    const { userId } = req.user;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    await cart.update({ couponCode: null });

    res.json({ success: true, message: 'Coupon removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
