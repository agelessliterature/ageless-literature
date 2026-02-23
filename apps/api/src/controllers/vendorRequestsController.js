/**
 * Vendor Requests Controller
 * Handles rare book requests visible to vendors
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { RareBookRequest, User, Vendor } = db;

/**
 * Get rare book requests
 * GET /api/vendor/requests
 */
export const getRequests = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { category, condition, minPrice, maxPrice } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Build where clause
    const where = {
      status: 'open', // Only show open requests
    };

    if (category && category !== 'all') where.category = category;
    if (condition) where.condition = condition;
    if (minPrice) where.maxPrice = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) where.maxPrice = { [Op.lte]: parseFloat(maxPrice) };

    const requests = await RareBookRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: {
        requests: requests.map((req) => ({
          id: req.id,
          title: req.title,
          author: req.author,
          category: req.category,
          condition: req.condition,
          maxPrice: req.maxPrice,
          description: req.description,
          userId: req.userId,
          createdAt: req.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message,
    });
  }
};

/**
 * Get single request detail
 * GET /api/vendor/requests/:id
 */
export const getRequestDetail = async (req, res) => {
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

    const request = await RareBookRequest.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        request,
      },
    });
  } catch (error) {
    console.error('Get request detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch request detail',
      error: error.message,
    });
  }
};

/**
 * Respond to a rare book request
 * POST /api/vendor/requests/:id/respond
 */
export const respondToRequest = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const requestBody = req.body;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const request = await RareBookRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    // - Link to existing book
    // - Create notification for customer
    // - Start conversation
    return res.status(200).json({
      success: true,
      message: 'Response sent successfully',
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to request',
      error: error.message,
    });
  }
};
