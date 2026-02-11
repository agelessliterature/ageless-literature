/**
 * Auction Winnings Controller
 */

import db from '../models/index.js';
const { AuctionWin, Auction, Book, Order, OrderItem } = db;

/**
 * Get user's auction winnings
 * GET /api/user/winnings
 */
export const getUserWinnings = async (req, res) => {
  try {
    const { userId } = req.user;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId };
    if (status) where.status = status;

    const winnings = await AuctionWin.findAndCountAll({
      where,
      include: [
        {
          model: Auction,
          as: 'auction',
          include: [{ model: Book, as: 'book' }],
        },
        { model: Order, as: 'order' },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: winnings.rows,
      pagination: {
        total: winnings.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(winnings.count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get specific winning details
 * GET /api/auctions/:id/winning
 */
export const getAuctionWinning = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { userId } = req.user;

    const winning = await AuctionWin.findOne({
      where: { auctionId, userId },
      include: [
        {
          model: Auction,
          as: 'auction',
          include: [{ model: Book, as: 'book' }],
        },
        { model: Order, as: 'order' },
      ],
    });

    if (!winning) {
      return res.status(404).json({ success: false, message: 'Winning not found' });
    }

    res.json({ success: true, data: winning });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Claim auction win (creates order)
 * POST /api/auctions/:id/claim
 */
export const claimWinning = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { userId } = req.user;
    const { shippingAddress } = req.body;

    const winning = await AuctionWin.findOne({
      where: { auctionId, userId },
      include: [
        {
          model: Auction,
          as: 'auction',
          include: [{ model: Book, as: 'book' }],
        },
      ],
    });

    if (!winning) {
      return res.status(404).json({ success: false, message: 'Winning not found' });
    }

    if (winning.orderId) {
      return res.status(400).json({ success: false, message: 'Winning already claimed' });
    }

    // Create order for the won auction
    const orderNumber = `ORD-${Date.now()}`;
    const order = await Order.create({
      userId,
      orderNumber,
      status: 'pending',
      subtotal: winning.winningAmount,
      tax: 0,
      shipping: 0,
      total: winning.winningAmount,
      currency: 'USD',
      shippingAddress: shippingAddress || {},
      billingAddress: shippingAddress || {},
    });

    // Create order item
    await OrderItem.create({
      orderId: order.id,
      bookId: winning.auction.bookId,
      vendorId: winning.auction.vendorId,
      quantity: 1,
      price: winning.winningAmount,
      subtotal: winning.winningAmount,
    });

    // Link order to winning
    await winning.update({ orderId: order.id });

    const updatedWinning = await AuctionWin.findByPk(winning.id, {
      include: [
        {
          model: Auction,
          as: 'auction',
          include: [{ model: Book, as: 'book' }],
        },
        { model: Order, as: 'order' },
      ],
    });

    res.json({
      success: true,
      message: 'Winning claimed successfully',
      data: updatedWinning,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Pay for auction win
 * POST /api/auctions/:id/pay
 */
export const payForWinning = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { userId } = req.user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { paymentMethodId } = req.body;

    const winning = await AuctionWin.findOne({
      where: { auctionId, userId },
      include: [{ model: Order, as: 'order' }],
    });

    if (!winning) {
      return res.status(404).json({ success: false, message: 'Winning not found' });
    }

    if (!winning.orderId) {
      return res.status(400).json({ success: false, message: 'Please claim the winning first' });
    }

    if (winning.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

    // TODO: Integrate Stripe payment here
    // For now, just mark as paid
    await winning.update({
      status: 'paid',
      paidAt: new Date(),
    });

    await winning.order.update({
      status: 'paid',
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: winning,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
