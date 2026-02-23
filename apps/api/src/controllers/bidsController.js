/**
 * Bids Controller
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendSms } from '../services/emailService.js';

const { AuctionBid, Auction, User, Book } = db;

/**
 * Place a bid on an auction
 * POST /api/auctions/:id/bids
 */
export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { userId } = req.user;
    const { amount, smsOptIn, phoneNumber } = req.body;

    // Get current user
    const currentUser = await User.findByPk(userId);

    // Update user's phone number and SMS preferences if provided
    if (smsOptIn && phoneNumber) {
      const metadata = currentUser.metadata || {};
      metadata.smsOptIn = true;
      metadata.smsOptInTimestamp = new Date().toISOString();
      await currentUser.update({
        phoneNumber,
        metadata,
      });
    }

    // Get auction with current bids
    const auction = await Auction.findByPk(auctionId, {
      include: [{ model: Book, as: 'book' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Validate auction status
    if (auction.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Auction is not active' });
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.endDate)) {
      return res.status(400).json({ success: false, message: 'Auction has ended' });
    }

    // Validate bid amount
    const minBid = auction.currentBid
      ? parseFloat(auction.currentBid) + 1
      : parseFloat(auction.startingPrice);
    if (parseFloat(amount) < minBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least $${minBid.toFixed(2)}`,
      });
    }

    // Prevent self-outbidding: check if user already has the highest (winning) bid
    const existingWinningBid = await AuctionBid.findOne({
      where: { auctionId, userId, status: 'winning' },
    });
    if (existingWinningBid) {
      return res.status(400).json({
        success: false,
        message: 'You already have the highest bid on this auction',
      });
    }

    // Create new bid
    const bid = await AuctionBid.create({
      auctionId,
      userId,
      amount,
      status: 'winning',
    });

    // Update previous bids to outbid and notify users
    const outbidUsers = await AuctionBid.findAll({
      where: {
        auctionId,
        id: { [Op.ne]: bid.id },
        status: { [Op.in]: ['active', 'winning'] },
      },
      include: [{ model: User, as: 'user' }],
    });

    // Send SMS notifications to outbid users
    for (const outbidBid of outbidUsers) {
      const outbidUser = outbidBid.user;
      const metadata = outbidUser.metadata || {};

      if (metadata.smsOptIn && outbidUser.phoneNumber) {
        try {
          await sendSms(
            outbidUser.phoneNumber,
            `Ageless Literature: You've been outbid on "${auction.book?.title || 'auction item'}". Current bid: $${amount}. Place a new bid at agelessliterature.com`,
            {
              type: 'auction_outbid',
              entityId: auctionId,
              correlationId: `auction_${auctionId}_bid_${bid.id}`,
            },
          );
          // SMS sent successfully
        } catch (smsError) {
          console.error(`[Bid] Failed to send SMS to user ${outbidUser.id}:`, smsError);
        }
      }
    }

    await AuctionBid.update(
      { status: 'outbid' },
      {
        where: {
          auctionId,
          id: { [Op.ne]: bid.id },
          status: { [Op.in]: ['active', 'winning'] },
        },
      },
    );

    // Update auction current bid and bid count
    await auction.update({
      currentBid: amount,
      bidCount: (auction.bidCount || 0) + 1,
    });

    const createdBid = await AuctionBid.findByPk(bid.id, {
      include: [
        {
          model: Auction,
          as: 'auction',
          include: [{ model: Book, as: 'book' }],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: createdBid,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get bids for specific auction
 * GET /api/auctions/:id/bids
 */
export const getAuctionBids = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bids = await AuctionBid.findAndCountAll({
      where: { auctionId },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'image'] }],
      order: [
        ['amount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: bids.rows,
      pagination: {
        total: bids.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(bids.count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user's bid history
 * GET /api/user/bids
 */
export const getUserBids = async (req, res) => {
  try {
    const { userId } = req.user;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId };
    if (status) where.status = status;

    const bids = await AuctionBid.findAndCountAll({
      where,
      include: [
        {
          model: Auction,
          as: 'auction',
          include: [{ model: Book, as: 'book' }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: bids.rows,
      pagination: {
        total: bids.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(bids.count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user's active bids
 * GET /api/user/bids/active
 */
export const getUserActiveBids = async (req, res) => {
  try {
    const { userId } = req.user;

    const bids = await AuctionBid.findAll({
      where: {
        userId,
        status: { [Op.in]: ['active', 'winning', 'outbid'] },
      },
      include: [
        {
          model: Auction,
          as: 'auction',
          where: { status: 'active' },
          include: [{ model: Book, as: 'book' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: bids });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
