/**
 * Custom Offers Controller
 * Handles vendor custom price offers to specific users
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { CustomOffer, Vendor, User, Book, Product, BookMedia, Notification } = db;

/**
 * Create a custom offer (Vendor)
 * POST /api/vendor/offers
 */
export const createOffer = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetUserId, itemType, itemId, offerPrice, message, expiresInDays = 7 } = req.body;

    // Get vendor profile
    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Validate target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    // Validate item exists and belongs to vendor
    let item;
    let originalPrice;

    if (itemType === 'book') {
      item = await Book.findOne({
        where: { id: itemId, vendorId: vendor.id },
      });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Book not found or does not belong to you',
        });
      }
      originalPrice = item.price;
    } else if (itemType === 'product') {
      item = await Product.findOne({
        where: { id: itemId, vendorId: vendor.id },
      });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or does not belong to you',
        });
      }
      originalPrice = item.price;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type. Must be "book" or "product"',
      });
    }

    // Check for existing pending offer
    const existingOffer = await CustomOffer.findOne({
      where: {
        vendorId: vendor.id,
        userId: targetUserId,
        itemType,
        itemId,
        status: 'pending',
      },
    });

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: 'An active offer already exists for this item and user',
      });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create the offer
    const offer = await CustomOffer.create({
      vendorId: vendor.id,
      userId: targetUserId,
      itemType,
      itemId,
      originalPrice,
      offerPrice,
      message,
      expiresAt,
      status: 'pending',
      initiatedBy: 'vendor',
    });

    // Create notification for the user
    if (Notification) {
      await Notification.create({
        userId: targetUserId,
        type: 'custom_offer',
        title: 'New Custom Offer',
        message: `${vendor.shopName || 'A vendor'} sent you a custom offer for ${item.title}`,
        data: {
          offerId: offer.id,
          itemType,
          itemId,
          originalPrice,
          offerPrice,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error creating custom offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: error.message,
    });
  }
};

/**
 * Get vendor's offers
 * GET /api/vendor/offers
 */
export const getVendorOffers = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { status, itemType, page = 1, limit = 20 } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const where = { vendorId: vendor.id };
    if (status) where.status = status;
    if (itemType) where.itemType = itemType;

    const { count, rows: offers } = await CustomOffer.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Fetch item details for each offer
    const offersWithItems = await Promise.all(
      offers.map(async (offer) => {
        const offerData = offer.toJSON();

        if (offer.itemType === 'book') {
          const book = await Book.findByPk(offer.itemId, {
            include: [{ model: BookMedia, as: 'media', limit: 1 }],
          });
          offerData.item = book;
        } else if (offer.itemType === 'product') {
          const product = await Product.findByPk(offer.itemId);
          offerData.item = product;
        }

        return offerData;
      }),
    );

    return res.json({
      success: true,
      data: offersWithItems,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message,
    });
  }
};

/**
 * Cancel an offer (Vendor)
 * DELETE /api/vendor/offers/:id
 */
export const cancelOffer = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const offer = await CustomOffer.findOne({
      where: {
        id,
        vendorId: vendor.id,
        status: 'pending',
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or already processed',
      });
    }

    await offer.update({ status: 'cancelled' });

    return res.json({
      success: true,
      message: 'Offer cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel offer',
      error: error.message,
    });
  }
};

/**
 * Get user's received offers
 * GET /api/offers
 */
export const getUserOffers = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = { userId };
    if (status) {
      where.status = status;
    } else {
      // By default, show pending and not expired
      where.status = 'pending';
      where[Op.or] = [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }];
    }

    const { count, rows: offers } = await CustomOffer.findAndCountAll({
      where,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'logoUrl'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Fetch item details for each offer
    const offersWithItems = await Promise.all(
      offers.map(async (offer) => {
        const offerData = offer.toJSON();

        if (offer.itemType === 'book') {
          const book = await Book.findByPk(offer.itemId, {
            include: [{ model: BookMedia, as: 'media', limit: 1 }],
          });
          offerData.item = book;
        } else if (offer.itemType === 'product') {
          const product = await Product.findByPk(offer.itemId);
          offerData.item = product;
        }

        return offerData;
      }),
    );

    return res.json({
      success: true,
      data: offersWithItems,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching user offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message,
    });
  }
};

/**
 * Respond to an offer (User)
 * POST /api/offers/:id/respond
 */
export const respondToOffer = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "accept" or "decline"',
      });
    }

    const offer = await CustomOffer.findOne({
      where: {
        id,
        userId,
        status: 'pending',
      },
      include: [
        {
          model: Vendor,
          as: 'vendor',
        },
      ],
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or already processed',
      });
    }

    // Check if expired
    if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
      await offer.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'This offer has expired',
      });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await offer.update({
      status: newStatus,
      respondedAt: new Date(),
    });

    // Notify vendor
    if (Notification && offer.vendor) {
      const user = await User.findByPk(userId);
      await Notification.create({
        userId: offer.vendor.userId,
        type: 'offer_response',
        title: `Offer ${newStatus}`,
        message: `${user?.name || 'A customer'} has ${newStatus} your custom offer`,
        data: {
          offerId: offer.id,
          status: newStatus,
        },
      });
    }

    return res.json({
      success: true,
      message: `Offer ${newStatus} successfully`,
      data: offer,
    });
  } catch (error) {
    console.error('Error responding to offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to offer',
      error: error.message,
    });
  }
};

/**
 * Get a single offer by ID
 * GET /api/offers/:id
 */
export const getOfferById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const offer = await CustomOffer.findOne({
      where: { id, userId },
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'logoUrl', 'shopUrl'],
        },
      ],
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    const offerData = offer.toJSON();

    // Fetch item details
    if (offer.itemType === 'book') {
      const book = await Book.findByPk(offer.itemId, {
        include: [{ model: BookMedia, as: 'media' }],
      });
      offerData.item = book;
    } else if (offer.itemType === 'product') {
      const product = await Product.findByPk(offer.itemId);
      offerData.item = product;
    }

    return res.json({
      success: true,
      data: offerData,
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offer',
      error: error.message,
    });
  }
};

/**
 * Search users for creating offer (Vendor)
 * GET /api/vendor/offers/search-users
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${q}%` } },
          { lastName: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } },
        ],
        status: 'active',
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'image'],
      limit: 10,
    });

    return res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        email: u.email,
        image: u.image,
      })),
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message,
    });
  }
};

/**
 * Create a buyer-initiated offer (User → Vendor)
 * POST /api/users/offers
 */
export const createBuyerOffer = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { itemType, itemId, offerPrice, message } = req.body;

    if (!itemType || !itemId || !offerPrice) {
      return res.status(400).json({
        success: false,
        message: 'itemType, itemId, and offerPrice are required',
      });
    }

    if (!['book', 'product'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type. Must be "book" or "product"',
      });
    }

    // Validate item exists and get its vendor
    let item;
    let originalPrice;
    let vendorId;

    if (itemType === 'book') {
      item = await Book.findByPk(itemId, {
        include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'userId', 'shopName'] }],
      });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Book not found' });
      }
      originalPrice = item.price;
      vendorId = item.vendorId;
    } else {
      item = await Product.findByPk(itemId, {
        include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'userId', 'shopName'] }],
      });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      originalPrice = item.price;
      vendorId = item.vendorId;
    }

    // Don't allow vendors to make offers on their own items
    const userVendor = await Vendor.findOne({ where: { userId } });
    if (userVendor && userVendor.id === vendorId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot make an offer on your own item',
      });
    }

    // Check for existing pending offer from this user on this item
    const existingOffer = await CustomOffer.findOne({
      where: {
        userId,
        vendorId,
        itemType,
        itemId,
        status: 'pending',
        initiatedBy: 'buyer',
      },
    });

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending offer on this item',
      });
    }

    // Buyer offers expire in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const offer = await CustomOffer.create({
      vendorId,
      userId,
      itemType,
      itemId,
      originalPrice,
      offerPrice,
      message: message || null,
      expiresAt,
      status: 'pending',
      initiatedBy: 'buyer',
    });

    // Notify the vendor
    if (Notification && item.vendor) {
      const buyer = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] });
      await Notification.create({
        userId: item.vendor.userId,
        type: 'buyer_offer',
        title: 'New Offer Received',
        message: `${buyer?.firstName || 'A buyer'} made an offer of $${offerPrice} on "${item.title}"`,
        data: {
          offerId: offer.id,
          itemType,
          itemId,
          originalPrice,
          offerPrice,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error creating buyer offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit offer',
      error: error.message,
    });
  }
};

/**
 * Vendor responds to a buyer-initiated offer
 * POST /api/vendor/offers/:id/respond
 */
export const vendorRespondToOffer = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "accept" or "decline"',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const offer = await CustomOffer.findOne({
      where: {
        id,
        vendorId: vendor.id,
        status: 'pending',
        initiatedBy: 'buyer',
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or already processed',
      });
    }

    // Check if expired
    if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
      await offer.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'This offer has expired',
      });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await offer.update({
      status: newStatus,
      respondedAt: new Date(),
    });

    // Notify the buyer
    if (Notification) {
      let item;
      if (offer.itemType === 'book') {
        item = await Book.findByPk(offer.itemId);
      } else {
        item = await Product.findByPk(offer.itemId);
      }

      await Notification.create({
        userId: offer.userId,
        type: 'offer_response',
        title: `Offer ${newStatus}`,
        message: `${vendor.shopName || 'The vendor'} has ${newStatus} your offer of $${offer.offerPrice} on "${item?.title || 'an item'}"`,
        data: {
          offerId: offer.id,
          status: newStatus,
          offerPrice: offer.offerPrice,
        },
      });
    }

    return res.json({
      success: true,
      message: `Offer ${newStatus} successfully`,
      data: offer,
    });
  } catch (error) {
    console.error('Error responding to buyer offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to offer',
      error: error.message,
    });
  }
};
