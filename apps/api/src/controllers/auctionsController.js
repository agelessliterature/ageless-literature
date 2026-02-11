/**
 * Auctions Controller
 * Handles polymorphic auctions for Books and Products
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendTemplatedEmail, sendSms } from '../services/emailService.js';
import { emitNotification } from '../sockets/index.js';

const {
  Auction,
  AuctionBid,
  AuctionWin,
  Book,
  Product,
  Vendor,
  User,
  VendorEarning,
  BookMedia,
  Notification,
  sequelize,
} = db;

/**
 * Helper function to check if user is eligible for SMS (Phase 5)
 */
async function canSendSms(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user || !user.phoneNumber) return null;

    const metadata = user.metadata || {};
    const eligible =
      metadata.phoneVerified === true && metadata.smsOptIn === true && metadata.smsStop !== true;

    if (!eligible) return null;

    // Check rate limit: max 3 SMS per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const smsCount = await Notification.count({
      where: {
        userId,
        type: { [Op.like]: 'SMS_%' },
        createdAt: { [Op.gte]: today },
      },
    });

    if (smsCount >= 3) {
      console.log(`[SMS] Rate limit reached for user ${userId}: ${smsCount}/3 today`);
      return null;
    }

    return {
      phoneNumber: user.phoneNumber,
      user,
    };
  } catch (error) {
    console.error('[SMS] Error checking eligibility:', error);
    return null;
  }
}

/**
 * Helper function to load auctionable item based on type
 */
async function loadAuctionableItem(auction) {
  if (auction.auctionableType === 'book') {
    auction.dataValues.item = await Book.findByPk(auction.auctionableId);
    auction.dataValues.book = auction.dataValues.item; // backward compatibility
  } else if (auction.auctionableType === 'product') {
    auction.dataValues.item = await Product.findByPk(auction.auctionableId);
    auction.dataValues.product = auction.dataValues.item;
  }
  return auction;
}

/**
 * Helper function to load auctionable items for multiple auctions
 */
async function loadAuctionableItems(auctions) {
  const bookIds = auctions.filter((a) => a.auctionableType === 'book').map((a) => a.auctionableId);
  const productIds = auctions
    .filter((a) => a.auctionableType === 'product')
    .map((a) => a.auctionableId);

  const [books, products, bookMedia] = await Promise.all([
    bookIds.length > 0 ? Book.findAll({ where: { id: bookIds } }) : [],
    productIds.length > 0 ? Product.findAll({ where: { id: productIds } }) : [],
    bookIds.length > 0 && BookMedia
      ? BookMedia.findAll({
          where: { bookId: bookIds },
          order: [
            ['isPrimary', 'DESC'],
            ['displayOrder', 'ASC'],
          ],
        })
      : [],
  ]);

  // Create a map of book media grouped by bookId
  const bookMediaMap = {};
  if (bookMedia.length > 0) {
    bookMedia.forEach((media) => {
      if (!bookMediaMap[media.bookId]) {
        bookMediaMap[media.bookId] = [];
      }
      bookMediaMap[media.bookId].push({
        url: media.imageUrl,
        imageUrl: media.imageUrl,
        thumbnailUrl: media.thumbnailUrl,
        isPrimary: media.isPrimary,
        is_primary: media.isPrimary,
        displayOrder: media.displayOrder,
      });
    });
  }

  const booksMap = new Map(
    books.map((b) => {
      const bookData = b.toJSON();
      // Add images from BookMedia
      bookData.images = bookMediaMap[b.id] || [];
      return [b.id.toString(), bookData];
    }),
  );
  const productsMap = new Map(products.map((p) => [p.id, p]));

  return auctions.map((auction) => {
    if (auction.auctionableType === 'book') {
      auction.dataValues.item = booksMap.get(auction.auctionableId);
      auction.dataValues.book = auction.dataValues.item; // backward compatibility
    } else if (auction.auctionableType === 'product') {
      auction.dataValues.item = productsMap.get(auction.auctionableId);
      auction.dataValues.product = auction.dataValues.item;
    }
    return auction;
  });
}

/**
 * List all auctions with filters
 * GET /api/auctions?status=active&type=book&page=1&limit=20
 */
export const listAuctions = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== 'all') {
      // Explicitly specify the column to avoid ambiguity
      where.status = status;
    }
    if (type && ['book', 'product'].includes(type)) {
      where.auctionableType = type;
    }

    console.log('Auctions where clause:', where);

    const auctions = await Auction.findAndCountAll({
      where,
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'winner' },
      ],
      order: [['endDate', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Load auctionable items (books/products) for each auction
    const auctionsWithItems = await loadAuctionableItems(auctions.rows);

    res.json({
      success: true,
      data: auctionsWithItems,
      pagination: {
        total: auctions.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(auctions.count / limit),
      },
    });
  } catch (error) {
    console.error('listAuctions error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      sql: error.sql,
      original: error.original,
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get auction by ID with bids
 * GET /api/auctions/:id
 */
export const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findByPk(id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'winner', attributes: ['id', 'name'] },
        {
          model: AuctionBid,
          as: 'bids',
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
          order: [['amount', 'DESC']],
          limit: 10,
        },
      ],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Load the auctionable item (book or product)
    await loadAuctionableItem(auction);

    res.json({ success: true, data: auction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get active auction for a specific product
 * GET /api/auctions/active?productId=xxx&productType=book
 */
export const getActiveAuctionForProduct = async (req, res) => {
  try {
    const { productId, productType = 'product' } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId query parameter is required',
      });
    }

    // Query for active or scheduled auction
    const auction = await Auction.findOne({
      where: {
        auctionableId: productId.toString(),
        auctionableType: productType,
        status: { [Op.in]: ['active', 'scheduled', 'upcoming'] },
        endsAt: { [Op.gt]: new Date() },
      },
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'shopName', 'shopUrl'] },
        {
          model: AuctionBid,
          as: 'bids',
          attributes: ['id', 'amount', 'createdAt'],
          limit: 1,
          order: [['amount', 'DESC']],
        },
      ],
    });

    if (!auction) {
      return res.json({ success: true, data: null });
    }

    // Load the auctionable item
    await loadAuctionableItem(auction);

    // Format response with summary data
    const response = {
      id: auction.id,
      auctionableType: auction.auctionableType,
      auctionableId: auction.auctionableId,
      startingPrice: auction.startingPrice,
      currentBid: auction.currentBid || auction.startingPrice,
      bidCount: auction.bidCount || 0,
      startsAt: auction.startsAt,
      endsAt: auction.endsAt,
      status: auction.status,
      vendor: auction.vendor,
      item: auction.dataValues.item,
    };

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create new auction (vendors only)
 * POST /api/auctions
 * Body: { auctionableType: 'book' | 'product', auctionableId, startingPrice, reservePrice, startDate, endDate }
 * Legacy support: { bookId, ... } will be converted to { auctionableType: 'book', auctionableId: bookId }
 */
export const createAuction = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role !== 'vendor' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only vendors can create auctions' });
    }

    let {
      auctionableType,
      auctionableId,
      bookId,
      productId,
      startingPrice,
      reservePrice,
      startDate,
      endDate,
    } = req.body;

    // Legacy support: convert bookId to polymorphic format
    if (bookId && !auctionableId) {
      auctionableType = 'book';
      auctionableId = bookId.toString();
    } else if (productId && !auctionableId) {
      auctionableType = 'product';
      auctionableId = productId;
    }

    // Validate auctionable type
    if (!['book', 'product'].includes(auctionableType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid auctionable type. Must be "book" or "product"',
      });
    }

    if (!auctionableId) {
      return res.status(400).json({
        success: false,
        message: 'auctionableId is required',
      });
    }

    // Verify item exists
    let item;
    if (auctionableType === 'book') {
      item = await Book.findByPk(auctionableId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Book not found' });
      }
    } else if (auctionableType === 'product') {
      item = await Product.findByPk(auctionableId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
    }

    // Verify vendor owns the item (skip for admins)
    let vendor;
    if (role === 'admin') {
      // Admins can create auctions for any item
      // Get the vendor who owns the item
      vendor = await Vendor.findByPk(item.vendorId);
      if (!vendor) {
        return res
          .status(400)
          .json({ success: false, message: 'Item does not have a valid vendor' });
      }
    } else {
      // For vendors, verify they own the item
      vendor = await Vendor.findOne({ where: { userId } });
      if (!vendor) {
        return res.status(400).json({ success: false, message: 'Vendor profile not found' });
      }

      if (item.vendorId !== vendor.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only create auctions for your own items',
        });
      }
    }

    // Check for existing active auction
    const existingAuction = await Auction.findOne({
      where: {
        auctionableType,
        auctionableId: auctionableId.toString(),
        status: ['upcoming', 'active'],
      },
    });

    if (existingAuction) {
      return res.status(400).json({
        success: false,
        message: 'An active auction already exists for this item',
      });
    }

    // Create auction
    const auction = await Auction.create({
      auctionableType,
      auctionableId: auctionableId.toString(),
      bookId: auctionableType === 'book' ? auctionableId : null, // for backward compatibility
      vendorId: vendor.id,
      startingPrice,
      startingBid: startingPrice, // New field
      reservePrice,
      currentBid: null,
      startDate: startDate || new Date(),
      endDate,
      startsAt: startDate || new Date(), // New field
      endsAt: endDate, // New field
      status: new Date(startDate || new Date()) > new Date() ? 'upcoming' : 'active',
    });

    const createdAuction = await Auction.findByPk(auction.id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    await loadAuctionableItem(createdAuction);

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: createdAuction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update auction
 * PATCH /api/auctions/:id
 */
export const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const auction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Only auction owner or admin can update
    if (role !== 'admin' && auction.vendor.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Cannot update active auctions with bids
    if (auction.status === 'active' && auction.currentBid) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot update auction with active bids' });
    }

    const allowedFields = ['startingPrice', 'reservePrice', 'startDate', 'endDate'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await auction.update(updates);

    const updatedAuction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    await loadAuctionableItem(updatedAuction);

    res.json({
      success: true,
      message: 'Auction updated successfully',
      data: updatedAuction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Close auction manually
 * POST /api/auctions/:id/close
 */
export const closeAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const auction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Only auction owner or admin can close
    if (role !== 'admin' && auction.vendor.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (auction.status === 'ended' || auction.status === 'sold') {
      return res.status(400).json({ success: false, message: 'Auction already closed' });
    }

    // Find highest bid
    const highestBid = await AuctionBid.findOne({
      where: { auctionId: id },
      order: [['amount', 'DESC']],
    });

    let updates = { status: 'ended' };

    // If there's a winning bid above reserve
    if (highestBid && (!auction.reservePrice || highestBid.amount >= auction.reservePrice)) {
      updates.status = 'sold';
      updates.winnerId = highestBid.userId;

      // Create auction win record
      await AuctionWin.create({
        auctionId: id,
        userId: highestBid.userId,
        winningAmount: highestBid.amount,
        status: 'pending_payment',
      });

      // Send winner notification email (with idempotency check)
      try {
        // Check if notification already sent using JSONB query
        const existingNotification = Notification
          ? await Notification.findOne({
              where: {
                type: 'AUCTION_WON_PAYMENT_DUE',
                [Op.and]: sequelize.where(
                  sequelize.cast(sequelize.json('data.entityId'), 'text'),
                  id,
                ),
              },
            })
          : null;

        if (existingNotification) {
          console.log(
            `Notification already sent: AUCTION_WON_PAYMENT_DUE ${id} ${existingNotification.data.recipientEmail}`,
          );
        } else {
          // Load auction item details
          await loadAuctionableItem(auction);
          const item = auction.dataValues.item;
          const auctionTitle = item?.title || 'Auction Item';

          // Get winner details
          const winner = await User.findByPk(highestBid.userId);
          if (winner?.email && winner.emailNotifications !== false) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const winningAmount = parseFloat(highestBid.amount).toFixed(2);

            // Send email
            await sendTemplatedEmail('auction_won_payment_due', winner.email, {
              userName: winner.name || winner.firstName || 'Collector',
              auctionTitle,
              winningAmount,
              auctionId: id,
              paymentLink: `${frontendUrl}/account/winnings`,
            });

            console.log(
              `EMAIL: auction_won_payment_due | recipient=${winner.email} | auctionId=${id}`,
            );

            // Persist notification after successful send
            if (Notification) {
              const notificationRecord = await Notification.create({
                userId: highestBid.userId,
                type: 'AUCTION_WON_PAYMENT_DUE',
                data: {
                  entityType: 'auction',
                  entityId: id,
                  templateName: 'auction_won_payment_due',
                  recipientEmail: winner.email,
                  sentAt: new Date().toISOString(),
                  metadata: {
                    auctionTitle,
                    winningAmount,
                    auctionId: id,
                    productTitle: auctionTitle,
                  },
                },
                isRead: false,
              });

              // Emit real-time notification via Socket.IO
              try {
                emitNotification(
                  highestBid.userId,
                  'notification:new',
                  notificationRecord.toJSON(),
                );
              } catch (socketError) {
                console.error('Failed to emit notification socket event:', socketError.message);
              }
            }

            // Send SMS if user opted in (never block auction close)
            try {
              if (canSendSms(winner)) {
                // Check SMS idempotency
                const existingSmsNotification = await Notification.findOne({
                  where: {
                    userId: winner.id,
                    type: 'SMS_AUCTION_WON_PAYMENT_DUE',
                    [sequelize.Op.and]: [
                      sequelize.where(sequelize.cast(sequelize.json('data.entityId'), 'text'), id),
                    ],
                  },
                });

                if (!existingSmsNotification) {
                  const smsMessage = `Congratulations! You won "${auctionTitle}" for $${winningAmount}. Payment due. View: ${frontendUrl}/account/winnings`;
                  const smsResult = await sendSms(winner.phoneNumber, smsMessage, {
                    correlationId: id,
                    type: 'SMS_AUCTION_WON_PAYMENT_DUE',
                    entityId: id,
                  });

                  if (smsResult.ok) {
                    // Create SMS notification record
                    const smsNotificationRecord = await Notification.create({
                      userId: winner.id,
                      type: 'SMS_AUCTION_WON_PAYMENT_DUE',
                      data: {
                        entityType: 'auction',
                        entityId: id,
                        channel: 'sms',
                        recipientPhone: winner.phoneNumber,
                        providerMessageId: smsResult.providerMessageId,
                        sentAt: new Date().toISOString(),
                        metadata: {
                          auctionTitle,
                          winningAmount,
                        },
                      },
                      isRead: false,
                    });

                    console.log(
                      `SMS: SMS_AUCTION_WON_PAYMENT_DUE | recipient=${winner.phoneNumber} | auctionId=${id}`,
                    );

                    // Emit socket event for SMS notification
                    try {
                      emitNotification(
                        winner.id,
                        'notification:new',
                        smsNotificationRecord.toJSON(),
                      );
                    } catch (socketError) {
                      console.error(
                        'Failed to emit SMS notification socket event:',
                        socketError.message,
                      );
                    }
                  }
                }
              }
            } catch (smsError) {
              console.error('Failed to send auction winner SMS:', smsError.message);
            }
          }
        }
      } catch (emailError) {
        // Never block auction close on email failure
        console.error('Failed to send auction winner email:', emailError.message);
      }

      // Update bid statuses
      await AuctionBid.update({ status: 'won' }, { where: { id: highestBid.id } });
      await AuctionBid.update(
        { status: 'lost' },
        { where: { auctionId: id, id: { [Op.ne]: highestBid.id } } },
      );

      // Process vendor commission for auction sale
      if (auction.vendorId) {
        await processAuctionCommission(auction, highestBid.amount);
      }
    } else {
      // No winner, all bids lost
      await AuctionBid.update({ status: 'lost' }, { where: { auctionId: id } });
    }

    await auction.update(updates);

    res.json({
      success: true,
      message: 'Auction closed successfully',
      data: { winnerId: updates.winnerId, status: updates.status },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel auction
 * DELETE /api/auctions/:id
 */
export const cancelAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const auction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Only auction owner or admin can cancel
    if (role !== 'admin' && auction.vendor.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Cannot cancel sold auctions
    if (auction.status === 'sold') {
      return res.status(400).json({ success: false, message: 'Cannot cancel sold auction' });
    }

    await auction.update({ status: 'cancelled' });

    // Update all bids to cancelled
    await AuctionBid.update({ status: 'lost' }, { where: { auctionId: id } });

    res.json({ success: true, message: 'Auction cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Process vendor commission for auction sale
 * Creates VendorEarning record and updates vendor balances
 * Supports both Book and Product auctions
 */
async function processAuctionCommission(auction, winningAmount) {
  const transaction = await sequelize.transaction();

  try {
    const vendor = await Vendor.findByPk(auction.vendorId, { transaction });
    if (!vendor) {
      await transaction.rollback();
      return;
    }

    // Calculate commission breakdown
    const grossAmount = parseFloat(winningAmount);
    const commissionRate = parseFloat(vendor.commissionRate) || 0.08;
    const platformCommission = grossAmount * commissionRate;
    const vendorEarnings = grossAmount - platformCommission;

    // Prepare earning record data - using DB column names
    const earningData = {
      vendorId: vendor.id,
      auctionId: auction.id,
      amount: grossAmount,  // Total sale amount
      platformFee: platformCommission,
      netAmount: vendorEarnings,  // Vendor's share after commission
      commissionRateBps: Math.round(commissionRate * 10000),  // Convert to basis points
      transactionType: 'auction_sale',
      status: 'completed', // Auctions are completed immediately upon sale
      completedAt: new Date(),
    };

    // Add item reference based on type
    if (auction.auctionableType === 'book') {
      earningData.bookId = auction.auctionableId;
    } else if (auction.auctionableType === 'product') {
      earningData.productId = auction.auctionableId;
    }

    // Create earning record
    await VendorEarning.create(earningData, { transaction });

    // Update vendor balances (auction earnings go to available balance immediately)
    await vendor.update(
      {
        balanceAvailable: parseFloat(vendor.balanceAvailable) + vendorEarnings,
        lifetimeGrossSales: parseFloat(vendor.lifetimeGrossSales) + grossAmount,
        lifetimeCommissionTaken: parseFloat(vendor.lifetimeCommissionTaken) + platformCommission,
        lifetimeVendorEarnings: parseFloat(vendor.lifetimeVendorEarnings) + vendorEarnings,
        totalSales: vendor.totalSales + 1,
      },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
