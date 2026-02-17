/**
 * Auction Status Service
 * Handles automatic auction status transitions and lifecycle management
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendTemplatedEmail, sendSms } from '../services/emailService.js';
import { emitNotification } from '../sockets/index.js';
import { removeBookFromIndex } from '../utils/meilisearch.js';

const { Auction, AuctionBid, AuctionWin, Vendor, User, Notification, VendorEarning, sequelize } =
  db;

/**
 * Update auction statuses
 * Handles upcoming -> active and active -> ended transitions
 */
export const updateAuctionStatuses = async () => {
  try {
    const now = new Date();

    // Activate upcoming auctions
    const activatedCount = await Auction.update(
      { status: 'active' },
      {
        where: {
          status: 'upcoming',
          start_date: { [Op.lte]: now },
        },
      },
    );

    // Process ending auctions with full lifecycle logic
    const endedCount = await processEndingAuctions();

    if (activatedCount[0] > 0 || endedCount > 0) {
      console.log(`[Auction Status] Updated: ${activatedCount[0]} activated, ${endedCount} ended`);
    }

    return {
      activated: activatedCount[0],
      ended: endedCount,
    };
  } catch (error) {
    console.error('[Auction Status] Error:', error);
    throw error;
  }
};

/**
 * Process ending auctions with full lifecycle logic
 * Determines winners, checks reserves, applies end policies
 */
async function processEndingAuctions() {
  const now = new Date();
  let processedCount = 0;

  try {
    // Find auctions that need to end
    const endingAuctions = await Auction.findAll({
      where: {
        status: 'active',
        end_date: { [Op.lte]: now },
      },
      include: [{ model: Vendor, as: 'vendor' }],
    });

    // Process each auction individually with transaction locking
    for (const auction of endingAuctions) {
      try {
        await processAuctionEnding(auction);
        processedCount++;
      } catch (error) {
        console.error(`[Auction ${auction.id}] Failed to process ending:`, error.message);
        // Continue processing other auctions
      }
    }

    return processedCount;
  } catch (error) {
    console.error('[Auction Status] Error processing endings:', error);
    throw error;
  }
}

/**
 * Process a single auction ending
 * Uses transaction with row-level locking for concurrency safety
 */
async function processAuctionEnding(auction) {
  const transaction = await sequelize.transaction();

  try {
    // Re-fetch auction with row lock to prevent concurrent processing
    const lockedAuction = await Auction.findByPk(auction.id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
      include: [{ model: Vendor, as: 'vendor' }],
    });

    // Skip if already ended (another process got it)
    if (lockedAuction.status !== 'active') {
      await transaction.commit();
      return;
    }

    const endedAt = new Date();
    const paymentWindowHours = lockedAuction.paymentWindowHours || 48;
    const paymentDeadline = new Date(endedAt.getTime() + paymentWindowHours * 60 * 60 * 1000);

    // Find highest bid
    const highestBid = await AuctionBid.findOne({
      where: { auctionId: lockedAuction.id },
      order: [['amount', 'DESC']],
      transaction,
    });

    let updates = {
      endedAt,
      winnerBidId: null,
      winnerId: null,
      status: 'ended_no_bids',
      endOutcomeReason: 'NO_BIDS',
      paymentDeadline: null,
    };

    // Determine outcome
    if (!highestBid) {
      // NO BIDS - ended_no_bids
      updates.status = 'ended_no_bids';
      updates.endOutcomeReason = 'NO_BIDS';
      await AuctionBid.update(
        { status: 'lost' },
        { where: { auctionId: lockedAuction.id }, transaction },
      );
    } else if (lockedAuction.reservePrice && highestBid.amount < lockedAuction.reservePrice) {
      // RESERVE NOT MET - ended_reserve_not_met
      updates.status = 'ended_reserve_not_met';
      updates.endOutcomeReason = 'RESERVE_NOT_MET';
      updates.winnerBidId = highestBid.id;
      await AuctionBid.update(
        { status: 'lost' },
        { where: { auctionId: lockedAuction.id }, transaction },
      );
    } else {
      // SOLD - ended_sold
      updates.status = 'ended_sold';
      updates.endOutcomeReason = 'SOLD';
      updates.winnerId = highestBid.userId;
      updates.winnerBidId = highestBid.id;
      updates.paymentDeadline = paymentDeadline;

      // Update bid statuses
      await AuctionBid.update({ status: 'won' }, { where: { id: highestBid.id }, transaction });
      await AuctionBid.update(
        { status: 'lost' },
        { where: { auctionId: lockedAuction.id, id: { [Op.ne]: highestBid.id } } },
        { transaction },
      );

      // Create auction win record
      await AuctionWin.create(
        {
          auctionId: lockedAuction.id,
          userId: highestBid.userId,
          winningAmount: highestBid.amount,
          status: 'pending_payment',
        },
        { transaction },
      );

      // Process vendor commission for auction sale
      if (lockedAuction.vendorId) {
        await processAuctionCommission(lockedAuction, highestBid.amount, transaction);
      }
    }

    // Update auction with final state
    await lockedAuction.update(updates, { transaction });

    // Commit transaction before notifications
    await transaction.commit();

    // Send winner notifications (don't block on failures)
    if (updates.status === 'ended_sold' && highestBid) {
      setImmediate(async () => {
        try {
          await sendWinnerNotifications(lockedAuction, highestBid);
        } catch (error) {
          console.error(
            `[Auction ${lockedAuction.id}] Failed to send winner notifications:`,
            error.message,
          );
        }
      });
    }

    // Remove from search index if ended without sale
    if (updates.status !== 'ended_sold') {
      setImmediate(async () => {
        try {
          await removeAuctionFromSearchIndex(lockedAuction);
        } catch (error) {
          console.error(
            `[Auction ${lockedAuction.id}] Failed to remove from search index:`,
            error.message,
          );
        }
      });
    }

    // Apply end policies (asynchronously)
    setImmediate(async () => {
      try {
        await applyEndPolicies(lockedAuction, updates.status);
      } catch (error) {
        console.error(`[Auction ${lockedAuction.id}] Failed to apply end policies:`, error.message);
      }
    });

    console.log(
      `[Auction ${lockedAuction.id}] Ended: ${updates.status} | Reason: ${updates.endOutcomeReason}`,
    );
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Process vendor commission for auction sale
 */
async function processAuctionCommission(auction, winningAmount, transaction) {
  try {
    const vendor = await Vendor.findByPk(auction.vendorId, { transaction });
    if (!vendor) return;

    const grossAmount = parseFloat(winningAmount);
    const commissionRate = parseFloat(vendor.commissionRate) || 0.08;
    const platformCommission = grossAmount * commissionRate;
    const vendorEarnings = grossAmount - platformCommission;

    const earningData = {
      vendorId: vendor.id,
      auctionId: auction.id,
      amount: grossAmount,
      platformFee: platformCommission,
      netAmount: vendorEarnings,
      commissionRateBps: Math.round(commissionRate * 10000),
      transactionType: 'auction_sale',
      status: 'completed',
      completedAt: new Date(),
    };

    if (auction.auctionableType === 'book') {
      earningData.bookId = auction.auctionableId;
    } else if (auction.auctionableType === 'product') {
      earningData.productId = auction.auctionableId;
    }

    await VendorEarning.create(earningData, { transaction });

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
  } catch (error) {
    console.error(`[Auction ${auction.id}] Commission processing failed:`, error.message);
    throw error;
  }
}

/**
 * Send winner notifications with idempotency
 */
async function sendWinnerNotifications(auction, highestBid) {
  try {
    // Load auction item details
    const item = await getAuctionableItem(auction);
    const auctionTitle = item?.title || 'Auction Item';

    // Get winner details
    const winner = await User.findByPk(highestBid.userId);
    if (!winner) return;

    const winningAmount = parseFloat(highestBid.amount).toFixed(2);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Send email with idempotency check
    if (winner.email && winner.emailNotifications !== false) {
      const existingNotification = Notification
        ? await Notification.findOne({
            where: {
              type: 'AUCTION_WON_PAYMENT_DUE',
              [Op.and]: sequelize.where(
                sequelize.cast(sequelize.json('data.entityId'), 'text'),
                auction.id.toString(),
              ),
            },
          })
        : null;

      if (!existingNotification) {
        await sendTemplatedEmail('auction_won_payment_due', winner.email, {
          userName: winner.name || winner.firstName || 'Collector',
          auctionTitle,
          winningAmount,
          auctionId: auction.id,
          paymentLink: `${frontendUrl}/account/winnings`,
        });

        console.log(
          `EMAIL: auction_won_payment_due | recipient=${winner.email} | auctionId=${auction.id}`,
        );

        if (Notification) {
          const notificationRecord = await Notification.create({
            userId: highestBid.userId,
            type: 'AUCTION_WON_PAYMENT_DUE',
            data: {
              entityType: 'auction',
              entityId: auction.id,
              templateName: 'auction_won_payment_due',
              recipientEmail: winner.email,
              sentAt: new Date().toISOString(),
              metadata: { auctionTitle, winningAmount, auctionId: auction.id },
            },
            isRead: false,
          });

          try {
            emitNotification(highestBid.userId, 'notification:new', notificationRecord.toJSON());
          } catch (socketError) {
            console.error('Failed to emit notification socket event:', socketError.message);
          }
        }
      }
    }

    // Send SMS if opted in
    if (winner.phoneNumber && winner.smsNotifications !== false) {
      const existingSmsNotification = await Notification.findOne({
        where: {
          userId: winner.id,
          type: 'SMS_AUCTION_WON_PAYMENT_DUE',
          [Op.and]: [
            sequelize.where(
              sequelize.cast(sequelize.json('data.entityId'), 'text'),
              auction.id.toString(),
            ),
          ],
        },
      });

      if (!existingSmsNotification) {
        const smsMessage = `Congratulations! You won "${auctionTitle}" for $${winningAmount}. Payment due. View: ${frontendUrl}/account/winnings`;
        const smsResult = await sendSms(winner.phoneNumber, smsMessage, {
          correlationId: auction.id,
          type: 'SMS_AUCTION_WON_PAYMENT_DUE',
          entityId: auction.id,
        });

        if (smsResult.ok) {
          const smsNotificationRecord = await Notification.create({
            userId: winner.id,
            type: 'SMS_AUCTION_WON_PAYMENT_DUE',
            data: {
              entityType: 'auction',
              entityId: auction.id,
              channel: 'sms',
              recipientPhone: winner.phoneNumber,
              providerMessageId: smsResult.providerMessageId,
              sentAt: new Date().toISOString(),
              metadata: { auctionTitle, winningAmount },
            },
            isRead: false,
          });

          console.log(
            `SMS: SMS_AUCTION_WON_PAYMENT_DUE | recipient=${winner.phoneNumber} | auctionId=${auction.id}`,
          );

          try {
            emitNotification(winner.id, 'notification:new', smsNotificationRecord.toJSON());
          } catch (socketError) {
            console.error('Failed to emit SMS notification socket event:', socketError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Auction ${auction.id}] Notification error:`, error.message);
  }
}

/**
 * Get auctionable item (Book or Product)
 */
async function getAuctionableItem(auction) {
  const models = sequelize.models;
  if (auction.auctionableType === 'book') {
    return await models.Book.findByPk(auction.auctionableId);
  } else if (auction.auctionableType === 'product') {
    return await models.Product.findByPk(auction.auctionableId);
  }
  return null;
}

/**
 * Remove auction item from search index
 */
async function removeAuctionFromSearchIndex(auction) {
  try {
    if (auction.auctionableType === 'book') {
      await removeBookFromIndex(auction.auctionableId);
    }
    // TODO: Add product search index removal when implemented
  } catch (error) {
    console.error(`[Auction ${auction.id}] Search index removal failed:`, error.message);
  }
}

/**
 * Apply end policies (relist, convert, unlist)
 * Called asynchronously after auction ends without sale
 */
async function applyEndPolicies(auction, endStatus) {
  // Only apply policies for no-sale outcomes
  if (
    endStatus === 'ended_sold' ||
    !auction.endPolicyOnNoSale ||
    auction.endPolicyOnNoSale === 'NONE'
  ) {
    return;
  }

  try {
    const policy = auction.endPolicyOnNoSale;
    const delayHours = auction.endPolicyRelistDelayHours || 0;
    const maxRelists = auction.endPolicyRelistMaxCount || 0;

    // Check if max relists reached
    if (policy === 'RELIST_AUCTION' && maxRelists > 0 && auction.relistCount >= maxRelists) {
      console.log(`[Auction ${auction.id}] Max relists (${maxRelists}) reached, skipping relist`);
      return;
    }

    // Queue policy application based on delay
    const executeAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

    console.log(`[Auction ${auction.id}] Policy ${policy} queued for ${executeAt.toISOString()}`);

    // TODO: Implement policy queue table for delayed execution
    // For now, policies can be executed manually via vendor endpoints
  } catch (error) {
    console.error(`[Auction ${auction.id}] Policy application failed:`, error.message);
  }
}

/**
 * Check helper functions (currently unused but kept for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function canSendSms(user) {
  return user && user.phoneNumber && user.smsNotifications !== false;
}

export const getAuctionStatusStats = async () => {
  try {
    const stats = await Auction.findAll({
      attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['status'],
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.get('count'));
      return acc;
    }, {});
  } catch (error) {
    console.error('[Auction Status] Error getting stats:', error);
    throw error;
  }
};
