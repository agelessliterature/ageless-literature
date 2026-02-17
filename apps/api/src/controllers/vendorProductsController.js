/**
 * Vendor Products Controller
 * Handles vendor-specific product/book management
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import { indexBook, removeBookFromIndex } from '../utils/meilisearch.js';

const { Book, Vendor, BookMedia, Category, BookCategory } = db;

/**
 * Get all products for the authenticated vendor
 * GET /api/vendor/products
 */
export const getVendorProducts = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const {
      page = 1,
      limit = 20,
      search,
      category,
      condition,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    // Get vendor profile
    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Build where clause
    const where = { vendorId: vendor.id };

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
        { isbn: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) where.category = category;
    if (condition) where.condition = condition;
    if (status) where.status = status;

    console.log('[DEBUG] Fetching products for vendor:', vendor.id);

    // Fetch products
    const { count, rows: products } = await Book.findAndCountAll({
      where,
      include: [
        {
          model: BookMedia,
          as: 'media',
          attributes: ['id', 'imageUrl', 'thumbnailUrl', 'isPrimary', 'displayOrder'],
          required: false,
          separate: true, // Important: Load media separately to avoid left join issues
          limit: 3, // Get up to 3 images
          order: [
            ['isPrimary', 'DESC'],
            ['displayOrder', 'ASC'],
          ],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    console.log('[DEBUG] Found', count, 'products');
    if (products.length > 0) {
      console.log('[DEBUG] First product:', products[0].title);
      console.log('[DEBUG] First product media:', products[0].media);
    }

    // Transform products to match frontend expectations
    const transformedProducts = products.map((product) => {
      const productData = product.toJSON();

      // Get primary image or first image from media array
      const primaryImage = productData.media?.find((m) => m.isPrimary);
      const firstImage = productData.media?.[0];
      const imageSource = primaryImage || firstImage;

      // Debug logging
      if (productData.id === 394 || productData.id === 550) {
        console.log(`[DEBUG] Product ${productData.id} - ${productData.title}`);
        console.log(`[DEBUG] Media array length: ${productData.media?.length || 0}`);
        console.log(`[DEBUG] First media:`, firstImage);
        console.log(`[DEBUG] Primary image:`, primaryImage);
        console.log(`[DEBUG] Image source:`, imageSource);
        console.log(
          `[DEBUG] Final imageUrl:`,
          imageSource?.imageUrl || imageSource?.thumbnailUrl || null,
        );
      }

      return {
        ...productData,
        inventory: productData.quantity || 0, // Map quantity to inventory for frontend
        imageUrl: imageSource?.imageUrl || imageSource?.thumbnailUrl || null, // Get image from media
        status: productData.status || 'draft', // Ensure status is present
      };
    });

    return res.json({
      success: true,
      data: transformedProducts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
};

/**
 * Get single product detail
 * GET /api/vendor/products/:id
 */
export const getVendorProduct = async (req, res) => {
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

    const product = await Book.findOne({
      where: { id, vendorId: vendor.id },
      include: [
        {
          model: BookMedia,
          as: 'media',
        },
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
        message: 'Product not found',
      });
    }

    // Transform product to match frontend expectations
    const productData = product.toJSON();

    // Get primary image or first image from media array
    const primaryImage = productData.media?.find((m) => m.isPrimary);
    const firstImage = productData.media?.[0];
    const imageSource = primaryImage || firstImage;

    const transformedProduct = {
      ...productData,
      inventory: productData.quantity || 0, // Map quantity to inventory for frontend
      imageUrl: imageSource?.imageUrl || imageSource?.thumbnailUrl || null, // Get image from media
      status: productData.status || 'draft', // Ensure status is present
    };

    return res.json({
      success: true,
      data: transformedProduct,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
};

/**
 * Create new product
 * POST /api/vendor/products
 */
export const createProduct = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const {
      title,
      author,
      isbn,
      description,
      price,
      salePrice,
      quantity,
      condition,
      conditionNotes,
      category,
      categoryIds,
      publisher,
      publicationYear,
      edition,
      language = 'English',
      binding,
      isSigned = false,
      status = 'draft',
      images = [],
      shippingWeight,
      shippingDimensions,
      sellerNotes,
      metaTitle,
      metaDescription,
    } = req.body;

    // Validation
    if (!title || !author || !price || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, price, and condition are required',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Create product
    const product = await Book.create({
      vendorId: vendor.id,
      title,
      author,
      isbn,
      description,
      price,
      salePrice,
      quantity: quantity || 1,
      condition,
      conditionNotes,
      category,
      publisher,
      publicationYear,
      edition,
      language,
      binding,
      isSigned,
      status,
      shippingWeight,
      shippingDimensions,
      sellerNotes,
      metaTitle,
      metaDescription,
    });

    // Handle category associations
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      const categoryRecords = categoryIds.map((categoryId) => ({
        bookId: product.id,
        categoryId: parseInt(categoryId),
      }));
      await BookCategory.bulkCreate(categoryRecords, {
        ignoreDuplicates: true,
      });
    }

    // Handle image uploads if provided
    if (images && images.length > 0) {
      const mediaRecords = images.map((img, index) => ({
        bookId: product.id,
        imageUrl: img.url,
        thumbnailUrl: img.thumbnail || img.url,
        displayOrder: index,
      }));
      await BookMedia.bulkCreate(mediaRecords);
    }

    // Fetch complete product with media and categories
    const completeProduct = await Book.findByPk(product.id, {
      include: [
        { model: BookMedia, as: 'media' },
        { model: Category, as: 'categories', through: { attributes: [] } },
      ],
    });

    // Index in Meilisearch (async, don't wait)
    indexBook(product.id).catch((err) => console.error('Failed to index book:', err));

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: completeProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message,
    });
  }
};

/**
 * Update product
 * PUT /api/vendor/products/:id
 */
export const updateProduct = async (req, res) => {
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

    const product = await Book.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title',
      'author',
      'isbn',
      'description',
      'shortDescription',
      'price',
      'salePrice',
      'quantity',
      'condition',
      'conditionNotes',
      'category',
      'publisher',
      'publicationYear',
      'edition',
      'language',
      'binding',
      'isSigned',
      'status',
      'shippingWeight',
      'shippingDimensions',
      'sellerNotes',
      'metaTitle',
      'metaDescription',
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await product.update(updates);

    // Handle image updates if provided
    if (req.body.images) {
      // Remove old images
      await BookMedia.destroy({ where: { bookId: id } });

      // Add new images
      if (req.body.images.length > 0) {
        const mediaRecords = req.body.images.map((img, index) => ({
          bookId: id,
          imageUrl: img.url,
          thumbnailUrl: img.thumbnail || img.url,
          displayOrder: index,
        }));
        await BookMedia.bulkCreate(mediaRecords);
      }
    }

    // Handle category updates if provided
    if (req.body.categoryIds !== undefined) {
      // Remove old category associations
      await BookCategory.destroy({ where: { bookId: id } });

      // Add new category associations
      if (req.body.categoryIds && req.body.categoryIds.length > 0) {
        const categoryRecords = req.body.categoryIds.map((categoryId) => ({
          bookId: parseInt(id),
          categoryId: parseInt(categoryId),
        }));
        await BookCategory.bulkCreate(categoryRecords, {
          ignoreDuplicates: true,
        });
      }
    }

    // Fetch updated product with categories
    const updatedProduct = await Book.findByPk(id, {
      include: [
        { model: BookMedia, as: 'media' },
        { model: Category, as: 'categories', through: { attributes: [] } },
      ],
    });

    // Update in Meilisearch (async, don't wait)
    indexBook(id).catch((err) => console.error('Failed to update book in search:', err));

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};

/**
 * Delete/Archive product
 * DELETE /api/vendor/products/:id
 */
export const deleteProduct = async (req, res) => {
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

    const product = await Book.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Archive instead of hard delete
    await product.update({ status: 'archived' });

    // Remove from Meilisearch (async, don't wait) since archived products shouldn't appear in search
    removeBookFromIndex(id).catch((err) =>
      console.error('Failed to remove book from search:', err),
    );

    return res.json({
      success: true,
      message: 'Product archived successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};

/**
 * Update product status (publish/draft)
 * PATCH /api/vendor/products/:id/status
 */
export const updateProductStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'archived'].includes(status)) {
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

    const product = await Book.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await product.update({ status });

    // Update search index based on status
    if (status === 'archived') {
      // Remove from search if archived
      removeBookFromIndex(id).catch((err) =>
        console.error('Failed to remove book from search:', err),
      );
    } else {
      // Index/update if active or draft
      indexBook(id).catch((err) => console.error('Failed to update book in search:', err));
    }

    return res.json({
      success: true,
      message: 'Product status updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error updating product status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product status',
      error: error.message,
    });
  }
};

/**
 * Update product quantity
 * PATCH /api/vendor/products/:id/quantity
 */
export const updateProductQuantity = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity value',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const product = await Book.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const updates = { quantity };
    if (quantity === 0 && product.status === 'active') {
      updates.status = 'sold';
    } else if (quantity > 0 && product.status === 'sold') {
      updates.status = 'active';
    }

    await product.update(updates);

    return res.json({
      success: true,
      message: 'Product quantity updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error updating product quantity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product quantity',
      error: error.message,
    });
  }
};

/**
 * Relist a sold/archived product
 * POST /api/vendor/products/:id/relist
 */
export const relistProduct = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { quantity } = req.body;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const product = await Book.findOne({
      where: { id, vendorId: vendor.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await product.update({
      status: 'active',
      quantity: quantity || 1,
    });

    indexBook(id).catch((err) => console.error('Failed to index book:', err));

    return res.json({
      success: true,
      message: 'Product relisted successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error relisting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to relist product',
      error: error.message,
    });
  }
};
