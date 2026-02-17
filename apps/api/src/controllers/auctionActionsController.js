/**
 * Auction Actions Controller
 * Vendor actions for ended auctions: relist, convert to fixed price, unlist
 */

import db from '../models/index.js';

const { Auction, Book, Product, Vendor } = db;

/**
 * Relist ended auction
 * POST /api/vendor/auctions/:id/relist
 */
export const relistAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { startingPrice, reservePrice, durationDays = 7 } = req.body;

    // Find original auction
    const originalAuction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!originalAuction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Verify ownership
    if (originalAuction.vendor.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if auction can be relisted
    if (
      !['ended_no_bids', 'ended_reserve_not_met', 'ended_no_sale'].includes(originalAuction.status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Only unsold auctions can be relisted',
      });
    }

    // Check item still exists and is available
    const item = await getAuctionableItem(originalAuction);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Auction item not found' });
    }

    // Check quantity > 0 for relisting
    if (item.trackQuantity && (!item.quantity || item.quantity < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Item is out of stock and cannot be relisted',
      });
    }

    // Check if max relist count reached
    const maxRelists = originalAuction.endPolicyRelistMaxCount || 0;
    if (maxRelists > 0 && originalAuction.relistCount >= maxRelists) {
      return res.status(400).json({
        success: false,
        message: `Maximum relist limit (${maxRelists}) reached`,
      });
    }

    // Create new auction
    const startDate = new Date();
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const newAuction = await Auction.create({
      auctionableType: originalAuction.auctionableType,
      auctionableId: originalAuction.auctionableId,
      bookId: originalAuction.bookId,
      vendorId: originalAuction.vendorId,
      startingPrice: startingPrice || originalAuction.startingPrice,
      startingBid: startingPrice || originalAuction.startingPrice,
      reservePrice: reservePrice !== undefined ? reservePrice : originalAuction.reservePrice,
      currentBid: null,
      startDate,
      endDate,
      startsAt: startDate,
      endsAt: endDate,
      status: 'active',
      relistCount: originalAuction.relistCount + 1,
      parentAuctionId: originalAuction.parentAuctionId || originalAuction.id,
      paymentWindowHours: originalAuction.paymentWindowHours,
      endPolicyOnNoSale: originalAuction.endPolicyOnNoSale,
      endPolicyRelistDelayHours: originalAuction.endPolicyRelistDelayHours,
      endPolicyRelistMaxCount: originalAuction.endPolicyRelistMaxCount,
      endPolicyConvertPriceSource: originalAuction.endPolicyConvertPriceSource,
      endPolicyConvertPriceMarkupBps: originalAuction.endPolicyConvertPriceMarkupBps,
    });

    // Lock item for auction duration
    await lockItemForAuction(item, originalAuction.auctionableType, endDate);

    res.json({
      success: true,
      message: 'Auction relisted successfully',
      data: newAuction,
    });
  } catch (error) {
    console.error('[Relist Auction] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Convert ended auction to fixed price listing
 * POST /api/vendor/auctions/:id/convert-to-fixed
 */
export const convertToFixed = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { price } = req.body;

    // Find auction
    const auction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Verify ownership
    if (auction.vendor.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if auction can be converted
    if (!['ended_no_bids', 'ended_reserve_not_met', 'ended_no_sale'].includes(auction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only unsold auctions can be converted to fixed price',
      });
    }

    // Get item
    const item = await getAuctionableItem(auction);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Auction item not found' });
    }

    // Check quantity > 0
    if (item.trackQuantity && (!item.quantity || item.quantity < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Item is out of stock and cannot be converted',
      });
    }

    // Determine price if not provided
    let fixedPrice = price;
    if (!fixedPrice) {
      const priceSource = auction.endPolicyConvertPriceSource || 'MANUAL';
      const markupBps = auction.endPolicyConvertPriceMarkupBps || 0;

      switch (priceSource) {
        case 'RESERVE':
          fixedPrice = auction.reservePrice;
          break;
        case 'HIGHEST_BID':
          fixedPrice = auction.currentBid || auction.startingPrice;
          break;
        case 'STARTING_BID':
          fixedPrice = auction.startingPrice;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Price required for manual conversion',
          });
      }

      // Apply markup if configured
      if (markupBps > 0) {
        fixedPrice = parseFloat(fixedPrice) * (1 + markupBps / 10000);
      }
    }

    // Update item price and status
    await item.update({
      price: fixedPrice,
      status: 'published',
      auctionLockedUntil: null, // Release lock
    });

    // Archive the auction
    await auction.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Auction converted to fixed price listing',
      data: {
        itemType: auction.auctionableType,
        itemId: auction.auctionableId,
        price: fixedPrice,
      },
    });
  } catch (error) {
    console.error('[Convert Auction] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unlist ended auction item
 * POST /api/vendor/auctions/:id/unlist
 */
export const unlistAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Find auction
    const auction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Verify ownership
    if (auction.vendor.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if auction can be unlisted
    if (!['ended_no_bids', 'ended_reserve_not_met', 'ended_no_sale'].includes(auction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only unsold auctions can be unlisted',
      });
    }

    // Get item
    const item = await getAuctionableItem(auction);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Auction item not found' });
    }

    // Archive item
    await item.update({
      status: 'archived',
      auctionLockedUntil: null, // Release lock
    });

    // Cancel auction
    await auction.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Auction item unlisted successfully',
      data: {
        itemType: auction.auctionableType,
        itemId: auction.auctionableId,
      },
    });
  } catch (error) {
    console.error('[Unlist Auction] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update auction end policy
 * PATCH /api/vendor/auctions/:id/end-policy
 */
export const updateEndPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const {
      endPolicyOnNoSale,
      endPolicyRelistDelayHours,
      endPolicyRelistMaxCount,
      endPolicyConvertPriceSource,
      endPolicyConvertPriceMarkupBps,
    } = req.body;

    // Find auction
    const auction = await Auction.findByPk(id, {
      include: [{ model: Vendor, as: 'vendor' }],
    });

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    // Verify ownership
    if (auction.vendor.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Can only update policy for upcoming or active auctions
    if (!['upcoming', 'active'].includes(auction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only update policy for upcoming or active auctions',
      });
    }

    // Build updates object
    const updates = {};
    if (endPolicyOnNoSale !== undefined) updates.endPolicyOnNoSale = endPolicyOnNoSale;
    if (endPolicyRelistDelayHours !== undefined)
      updates.endPolicyRelistDelayHours = endPolicyRelistDelayHours;
    if (endPolicyRelistMaxCount !== undefined)
      updates.endPolicyRelistMaxCount = endPolicyRelistMaxCount;
    if (endPolicyConvertPriceSource !== undefined)
      updates.endPolicyConvertPriceSource = endPolicyConvertPriceSource;
    if (endPolicyConvertPriceMarkupBps !== undefined)
      updates.endPolicyConvertPriceMarkupBps = endPolicyConvertPriceMarkupBps;

    await auction.update(updates);

    res.json({
      success: true,
      message: 'End policy updated successfully',
      data: auction,
    });
  } catch (error) {
    console.error('[Update End Policy] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper: Get auctionable item (Book or Product)
 */
async function getAuctionableItem(auction) {
  if (auction.auctionableType === 'book') {
    return await Book.findByPk(auction.auctionableId);
  } else if (auction.auctionableType === 'product') {
    return await Product.findByPk(auction.auctionableId);
  }
  return null;
}

/**
 * Helper: Lock item for auction duration
 */
async function lockItemForAuction(item, itemType, lockUntil) {
  await item.update({ auctionLockedUntil: lockUntil });
}
