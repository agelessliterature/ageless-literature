/**
 * Vendor Collectibles/Products Controller
 * Handles vendor-specific collectible/product management
 * (Non-book items: art, manuscripts, maps, vintage items, etc.)
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Product, Vendor, Category } = db;

/**
 * Generate URL-friendly slug from title
 */
const generateSlug = (title, vendorId) => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${baseSlug}-${vendorId}-${Date.now()}`;
};

/**
 * Get all collectibles for the authenticated vendor
 * GET /api/vendor/collectibles
 */
export const getVendorCollectibles = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const where = { vendorId: vendor.id };

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) where.category = category;
    if (status) where.status = status;

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor collectibles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch collectibles',
      error: error.message,
    });
  }
};

/**
 * Get single collectible detail
 * GET /api/vendor/collectibles/:id
 */
export const getVendorCollectible = async (req, res) => {
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

    const product = await Product.findOne({
      where: { id, vendorId: vendor.id },
      include: [
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Collectible not found',
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching collectible:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch collectible',
      error: error.message,
    });
  }
};

/**
 * Create new collectible
 * POST /api/vendor/collectibles
 */
export const createCollectible = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const {
      title,
      description,
      price,
      salePrice,
      quantity,
      condition,
      conditionNotes,
      category,
      categoryIds = [],
      tags = [],
      sku,
      images = [],
      status = 'draft',
      yearMade,
      origin,
      artist,
      dimensions,
      weight,
      materials,
      isSigned = false,
      isAuthenticated = false,
      metaTitle,
      metaDescription,
    } = req.body;

    // Validation
    if (!title || !price) {
      return res.status(400).json({
        success: false,
        message: 'Title and price are required',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Generate slug
    const slug = generateSlug(title, vendor.id);

    // Create collectible
    const product = await Product.create({
      vendorId: vendor.id,
      title,
      description,
      price,
      salePrice: salePrice || null,
      quantity: quantity || 1,
      condition: condition || null,
      conditionNotes: conditionNotes || null,
      category,
      tags: Array.isArray(tags) ? tags : [],
      sku,
      images: Array.isArray(images) ? images : [],
      slug,
      status,
      yearMade: yearMade || null,
      origin: origin || null,
      artist: artist || null,
      dimensions: dimensions || null,
      weight,
      materials: materials || null,
      isSigned,
      isAuthenticated,
      seoTitle: metaTitle || title,
      seoDescription: metaDescription || '',
    });

    // Handle category associations
    const categoryIdArray = Array.isArray(categoryIds) ? categoryIds : [];
    if (categoryIdArray.length > 0) {
      await product.setCategories(categoryIdArray);
    }

    // Fetch complete product with categories
    const completeProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Collectible created successfully',
      data: completeProduct,
    });
  } catch (error) {
    console.error('Error creating collectible:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create collectible',
      error: error.message,
    });
  }
};

/**
 * Update collectible
 * PUT /api/vendor/collectibles/:id
 */
export const updateCollectible = async (req, res) => {
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

    const product = await Product.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Collectible not found',
      });
    }

    // Update allowed fields (matching Product model columns)
    const allowedUpdates = [
      'title',
      'description',
      'shortDescription',
      'price',
      'compareAtPrice',
      'cost',
      'quantity',
      'category',
      'tags',
      'sku',
      'images',
      'featuredImage',
      'status',
      'weight',
      'weightUnit',
      'requiresShipping',
      'taxable',
      'trackQuantity',
      'lowStockThreshold',
      'seoTitle',
      'seoDescription',
      'metadata',
    ];

    // Fields that must be numeric (not empty strings)
    const numericFields = [
      'price',
      'compareAtPrice',
      'cost',
      'quantity',
      'weight',
      'lowStockThreshold',
    ];
    const sanitizeNumeric = (val) => {
      if (val === '' || val === undefined || val === null) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    // Fields that must be arrays (not non-array values)
    const arrayFields = ['tags', 'images'];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (numericFields.includes(field)) {
          updates[field] = sanitizeNumeric(req.body[field]);
        } else if (arrayFields.includes(field)) {
          // Ensure ARRAY/JSONB array fields always receive proper arrays
          updates[field] = Array.isArray(req.body[field]) ? req.body[field] : [];
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Also support legacy field names from frontend
    if (req.body.metaTitle !== undefined) updates.seoTitle = req.body.metaTitle;
    if (req.body.metaDescription !== undefined) updates.seoDescription = req.body.metaDescription;

    // Update slug if title changed
    if (updates.title && updates.title !== product.title) {
      updates.slug = generateSlug(updates.title, vendor.id);
    }

    await product.update(updates);

    // Handle category associations
    if (req.body.categoryIds !== undefined) {
      const categoryIdArray = Array.isArray(req.body.categoryIds) ? req.body.categoryIds : [];
      await product.setCategories(categoryIdArray);
    }

    // Fetch complete product with categories
    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
        },
      ],
    });

    return res.json({
      success: true,
      message: 'Collectible updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating collectible:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update collectible',
      error: error.message,
    });
  }
};

/**
 * Delete/Archive collectible
 * DELETE /api/vendor/collectibles/:id
 */
export const deleteCollectible = async (req, res) => {
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

    const product = await Product.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Collectible not found',
      });
    }

    // Archive instead of hard delete
    await product.update({ status: 'archived' });

    return res.json({
      success: true,
      message: 'Collectible archived successfully',
    });
  } catch (error) {
    console.error('Error deleting collectible:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete collectible',
      error: error.message,
    });
  }
};

/**
 * Update collectible status (publish/draft)
 * PATCH /api/vendor/collectibles/:id/status
 */
export const updateCollectibleStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const product = await Product.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Collectible not found',
      });
    }

    const updates = { status };
    if (status === 'published' && product.status !== 'published') {
      updates.publishedAt = new Date();
    }

    await product.update(updates);

    return res.json({
      success: true,
      message: 'Collectible status updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error updating collectible status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update collectible status',
      error: error.message,
    });
  }
};

/**
 * Get collectible stats for vendor
 * GET /api/vendor/collectibles/stats
 */
export const getCollectibleStats = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const stats = await Product.findAll({
      attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      where: { vendorId: vendor.id },
      group: ['status'],
      raw: true,
    });

    const totalViews = await Product.sum('views', {
      where: { vendorId: vendor.id },
    });

    // favoriteCount column may not exist; gracefully handle
    let totalFavorites = 0;
    try {
      totalFavorites =
        (await Product.sum('favoriteCount', {
          where: { vendorId: vendor.id },
        })) || 0;
    } catch (_e) {
      totalFavorites = 0;
    }

    return res.json({
      success: true,
      data: {
        byStatus: stats,
        totalViews: totalViews || 0,
        totalFavorites: totalFavorites || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching collectible stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
};
