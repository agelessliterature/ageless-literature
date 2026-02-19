import db from '../models/index.js';
import { Op } from 'sequelize';
import {
  validateCoupon,
  calculateDiscount,
  getDiscountSummary,
} from '../services/couponService.js';

const { Cart, CartItem, Book, Product, Auction, BookMedia } = db;

export const getCart = async (req, res) => {
  try {
    const { userId } = req.user;
    let cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: Book,
              as: 'book',
              include: BookMedia ? [{ model: BookMedia, as: 'media' }] : [],
            },
            { model: Product, as: 'product' },
          ],
        },
      ],
    });

    if (!cart) {
      cart = await Cart.create({ userId });
      return res.json({
        success: true,
        data: { items: [], subtotal: 0, total: 0 },
      });
    }

    // Normalize items into the shape the frontend expects
    const items = (cart.items || [])
      .map((item) => {
        const raw = item.toJSON ? item.toJSON() : item;
        const isBook = !!raw.bookId;
        const source = isBook ? raw.book : raw.product;

        if (!source) {
          // Item references a deleted book/product – skip on the client
          return null;
        }

        // Build a unified product object the frontend can consume
        const product = {
          id: source.id,
          title: source.title,
          price: parseFloat(source.salePrice || source.price) || 0,
          quantity: source.quantity ?? 1,
          sid: source.sid || source.slug || null,
          // Books use BookMedia (array of { imageUrl }), Products use images JSONB (array of { url })
          images: source.images || [],
          media: source.media || [],
        };

        return {
          id: raw.id,
          bookId: raw.bookId || null,
          productId: raw.productId || null,
          productType: isBook ? 'book' : 'product',
          quantity: raw.quantity,
          product,
        };
      })
      .filter(Boolean);

    // Compute subtotal and total
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const total = subtotal; // Shipping / tax are computed at checkout

    // Check for applied coupon
    let couponData = null;
    if (cart.couponCode) {
      try {
        const coupon = await validateCoupon(cart.couponCode, userId, items, subtotal);
        const shippingCost = 10;
        const discountAmount = calculateDiscount(coupon, items, subtotal, shippingCost);
        const summary = getDiscountSummary(coupon, discountAmount);
        couponData = {
          ...summary,
          couponId: coupon.id,
          discountAmount,
          freeShipping: coupon.discountType === 'free_shipping',
        };
      } catch {
        // Coupon is no longer valid - remove it silently
        await cart.update({ couponCode: null });
      }
    }

    res.json({ success: true, data: { items, subtotal, total, coupon: couponData } });
  } catch (error) {
    console.error('getCart error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be at least 1',
      });
    }

    const cartItem = await CartItem.findByPk(itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found',
      });
    }

    await cartItem.update({ quantity });
    res.json({ success: true, message: 'Cart item updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { bookId, productId, quantity = 1 } = req.body;

    if (!bookId && !productId) {
      return res.status(400).json({
        success: false,
        error: 'Either bookId or productId is required',
      });
    }

    if (bookId && productId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot specify both bookId and productId',
      });
    }

    // Check if item is currently in an active auction
    const auctionableType = bookId ? 'book' : 'product';
    const auctionableId = (bookId || productId).toString();

    const activeAuction = await Auction.findOne({
      where: {
        auctionableId,
        auctionableType,
        status: 'active',
        endsAt: { [Op.gt]: new Date() },
      },
    });

    if (activeAuction) {
      return res.status(400).json({
        success: false,
        error:
          'This item is currently in an active auction and cannot be added to cart. Please place a bid instead.',
      });
    }

    let cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      cart = await Cart.create({ userId });
    }

    // Check if item already exists in cart
    const whereClause = bookId ? { cartId: cart.id, bookId } : { cartId: cart.id, productId };
    const existingItem = await CartItem.findOne({ where: whereClause });

    if (existingItem) {
      await existingItem.update({ quantity: existingItem.quantity + quantity });
    } else {
      await CartItem.create({
        cartId: cart.id,
        bookId: bookId || null,
        productId: productId || null,
        quantity,
      });
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    await CartItem.destroy({ where: { id: itemId } });
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const cart = await Cart.findOne({ where: { userId } });
    if (cart) {
      await CartItem.destroy({ where: { cartId: cart.id } });
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
