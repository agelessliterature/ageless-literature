/**
 * Vendor Settings Controller
 * Handles vendor profile settings and configuration
 */

import db from '../models/index.js';

const { Vendor, User } = db;

/**
 * Get vendor settings
 * GET /api/vendor/settings
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const vendor = await Vendor.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          shopName: vendor.shopName,
          shopUrl: vendor.shopUrl,
          businessDescription: vendor.businessDescription,
          logoUrl: vendor.logoUrl,
          bannerUrl: vendor.bannerUrl,
          websiteUrl: vendor.websiteUrl,
          phoneNumber: vendor.phoneNumber,
          businessEmail: vendor.businessEmail,
          facebookUrl: vendor.facebookUrl,
          instagramUrl: vendor.instagramUrl,
          twitterUrl: vendor.twitterUrl,
          shippingPolicy: vendor.shippingPolicy,
          returnPolicy: vendor.returnPolicy,
          payoutMethod: vendor.payoutMethod,
          paypalEmail: vendor.paypalEmail,
          stripeAccountId: vendor.stripeAccountId,
        },
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message,
    });
  }
};

/**
 * Update vendor settings
 * PUT /api/vendor/settings
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const {
      shopName,
      businessDescription,
      websiteUrl,
      phoneNumber,
      businessEmail,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      shippingPolicy,
      returnPolicy,
      logoUrl,
      bannerUrl,
    } = req.body;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Update vendor fields
    const updateData = {};
    if (shopName !== undefined) updateData.shopName = shopName;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (businessEmail !== undefined) updateData.businessEmail = businessEmail;
    if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl;
    if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl;
    if (shippingPolicy !== undefined) updateData.shippingPolicy = shippingPolicy;
    if (returnPolicy !== undefined) updateData.returnPolicy = returnPolicy;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;

    await vendor.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        vendor: await vendor.reload(),
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
};

/**
 * Update payout settings
 * PUT /api/vendor/settings/payout
 */
export const updatePayoutSettings = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { payoutMethod, paypalEmail } = req.body;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const updateData = {};
    if (payoutMethod) updateData.payoutMethod = payoutMethod;
    if (paypalEmail) updateData.paypalEmail = paypalEmail;

    await vendor.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Payout settings updated successfully',
    });
  } catch (error) {
    console.error('Update payout settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payout settings',
      error: error.message,
    });
  }
};
