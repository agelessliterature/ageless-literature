import db from '../models/index.js';
import { Op } from 'sequelize';

const { Cart, CartItem, Book, Product, Auction } = db;

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
            { model: Book, as: 'book' },
            { model: Product, as: 'product' },
          ],
        },
      ],
    });

    if (!cart) {
      cart = await Cart.create({ userId });
    }

    res.json({ success: true, data: cart });
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
