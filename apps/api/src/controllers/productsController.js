/**
 * Products Controller (Public)
 * Handles public-facing product viewing and search
 * For vendor product management, see vendorProductsController.js
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Product, Vendor } = db;

/**
 * Get all published products with filtering and pagination
 * GET /api/products
 */
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      condition,
      search,
      vendorId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { status: 'published' };

    // Apply filters
    if (vendorId) where.vendorId = vendorId;
    if (condition) where.condition = condition;
    if (category) where.category = category;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { artist: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { materials: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl', 'logoUrl'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get single product by ID or sid
 * GET /api/products/:identifier
 */
export const getProductBySlug = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is UUID or sid
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );
    const where = isUUID ? { id: identifier } : { sid: identifier };
    where.status = 'published';

    const product = await Product.findOne({
      where,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: [
            'id',
            'shopName',
            'shopUrl',
            'logoUrl',
            'businessDescription',
            'socialFacebook',
            'socialTwitter',
            'socialInstagram',
          ],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Increment views
    await product.increment('views');

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get related products (same category, different product)
 * GET /api/products/:id/related
 */
export const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const relatedProducts = await Product.findAll({
      where: {
        category: product.category,
        id: { [Op.ne]: id },
        status: 'published',
      },
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl', 'logoUrl'],
        },
      ],
      limit: parseInt(limit),
      order: [['views', 'DESC']],
    });

    res.json({ success: true, data: relatedProducts });
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get product categories with counts
 * GET /api/products/categories
 */
export const getProductCategories = async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: ['category', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      where: { status: 'published' },
      group: ['category'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
