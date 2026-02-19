/**
 * Coupon Service
 * Handles coupon validation, discount calculation, and redemption tracking
 */
import db from '../models/index.js';

const { Coupon, CouponRedemption, Book, Product } = db;

/**
 * Validate a coupon code for a given user and cart
 * Returns the coupon object if valid, or throws an error
 */
export async function validateCoupon(code, userId, cartItems, subtotal) {
  if (!code) {
    throw new Error('Coupon code is required');
  }

  const coupon = await Coupon.findOne({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  // Check if active
  if (!coupon.isActive) {
    throw new Error('This coupon is no longer active');
  }

  // Check date range
  const now = new Date();
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    throw new Error('This coupon is not yet active');
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    throw new Error('This coupon has expired');
  }

  // Check total usage limit
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new Error('This coupon has reached its usage limit');
  }

  // Check per-user limit
  if (userId && coupon.perUserLimit) {
    const userRedemptions = await CouponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (userRedemptions >= coupon.perUserLimit) {
      throw new Error('You have already used this coupon the maximum number of times');
    }
  }

  // Check minimum order amount
  if (coupon.minimumOrderAmount && parseFloat(subtotal) < parseFloat(coupon.minimumOrderAmount)) {
    throw new Error(
      `Minimum order amount of $${parseFloat(coupon.minimumOrderAmount).toFixed(2)} required`,
    );
  }

  // Scope-based validation
  if (coupon.scope === 'vendor' && coupon.vendorId) {
    const hasVendorItem = cartItems.some((item) => {
      const product = item.product || item;
      return product.vendorId === coupon.vendorId;
    });
    if (!hasVendorItem) {
      throw new Error("This coupon is only valid for a specific vendor's products");
    }
  }

  if (coupon.scope === 'products' && coupon.appliesTo) {
    const targetIds = coupon.appliesTo;
    const hasTargetItem = cartItems.some((item) => {
      return (
        (item.bookId && targetIds.bookIds && targetIds.bookIds.includes(item.bookId)) ||
        (item.productId && targetIds.productIds && targetIds.productIds.includes(item.productId))
      );
    });
    if (!hasTargetItem) {
      throw new Error('This coupon does not apply to any items in your cart');
    }
  }

  if (coupon.scope === 'categories' && coupon.appliesTo) {
    const targetCategoryIds = coupon.appliesTo.categoryIds || [];
    // We need to check if any cart item belongs to the target categories
    let hasCategoryMatch = false;

    for (const item of cartItems) {
      if (item.bookId) {
        const book = await Book.findByPk(item.bookId, {
          include: [{ model: db.Category, as: 'categories', through: { attributes: [] } }],
        });
        if (book && book.categories) {
          hasCategoryMatch = book.categories.some((cat) => targetCategoryIds.includes(cat.id));
        }
      }
      if (item.productId && !hasCategoryMatch) {
        const product = await Product.findByPk(item.productId, {
          include: [{ model: db.Category, as: 'categories', through: { attributes: [] } }],
        });
        if (product && product.categories) {
          hasCategoryMatch = product.categories.some((cat) => targetCategoryIds.includes(cat.id));
        }
      }
      if (hasCategoryMatch) break;
    }

    if (!hasCategoryMatch) {
      throw new Error('This coupon does not apply to any item categories in your cart');
    }
  }

  return coupon;
}

/**
 * Calculate the discount amount for a coupon applied to a cart
 */
export function calculateDiscount(coupon, cartItems, subtotal, shippingCost = 10) {
  let discountAmount = 0;
  const parsedSubtotal = parseFloat(subtotal);

  switch (coupon.discountType) {
    case 'percentage': {
      const discountValue = parseFloat(coupon.discountValue);

      if (coupon.scope === 'vendor' && coupon.vendorId) {
        // Only apply to matching vendor items
        const vendorSubtotal = cartItems.reduce((sum, item) => {
          const product = item.product || item;
          if (product.vendorId === coupon.vendorId) {
            const price = parseFloat(product.salePrice || product.price);
            return sum + price * (item.quantity || 1);
          }
          return sum;
        }, 0);
        discountAmount = vendorSubtotal * (discountValue / 100);
      } else if (coupon.scope === 'products' && coupon.appliesTo) {
        // Only apply to matching products
        const targetIds = coupon.appliesTo;
        const targetSubtotal = cartItems.reduce((sum, item) => {
          const isTarget =
            (item.bookId && targetIds.bookIds && targetIds.bookIds.includes(item.bookId)) ||
            (item.productId &&
              targetIds.productIds &&
              targetIds.productIds.includes(item.productId));
          if (isTarget) {
            const product = item.product || item;
            const price = parseFloat(product.salePrice || product.price);
            return sum + price * (item.quantity || 1);
          }
          return sum;
        }, 0);
        discountAmount = targetSubtotal * (discountValue / 100);
      } else {
        // Global scope
        discountAmount = parsedSubtotal * (discountValue / 100);
      }

      // Apply maximum discount cap
      if (coupon.maximumDiscountAmount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.maximumDiscountAmount));
      }
      break;
    }

    case 'fixed_amount': {
      discountAmount = parseFloat(coupon.discountValue);
      // Don't allow discount to exceed subtotal
      discountAmount = Math.min(discountAmount, parsedSubtotal);
      break;
    }

    case 'free_shipping': {
      discountAmount = parseFloat(shippingCost);
      break;
    }

    default:
      discountAmount = 0;
  }

  // Round to 2 decimal places
  return Math.round(discountAmount * 100) / 100;
}

/**
 * Record a coupon redemption
 */
export async function recordRedemption(couponId, userId, orderId, discountAmount, transaction) {
  // Create redemption record
  await CouponRedemption.create(
    {
      couponId,
      userId,
      orderId,
      discountAmount,
    },
    { transaction },
  );

  // Increment usage count
  await Coupon.increment('usageCount', {
    by: 1,
    where: { id: couponId },
    transaction,
  });
}

/**
 * Get discount summary for display
 */
export function getDiscountSummary(coupon, discountAmount) {
  let label;

  switch (coupon.discountType) {
    case 'percentage':
      label = `${parseFloat(coupon.discountValue)}% off`;
      break;
    case 'fixed_amount':
      label = `$${parseFloat(coupon.discountValue).toFixed(2)} off`;
      break;
    case 'free_shipping':
      label = 'Free shipping';
      break;
    default:
      label = 'Discount';
  }

  return {
    code: coupon.code,
    label,
    discountType: coupon.discountType,
    discountValue: parseFloat(coupon.discountValue),
    discountAmount: parseFloat(discountAmount),
  };
}

export default {
  validateCoupon,
  calculateDiscount,
  recordRedemption,
  getDiscountSummary,
};
