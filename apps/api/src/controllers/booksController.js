/**
 * Books Controller
 * Handles CRUD operations for book catalog
 */

import db from '../models/index.js';
import { Op } from 'sequelize';
import { indexBook, removeBookFromIndex } from '../utils/meilisearch.js';

const { Book, Vendor, BookMedia, Category, Tag } = db;

/**
 * Get all books with filtering and pagination
 * Optimized for list view with minimal payload
 */
export const getAllBooks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
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
    const where = {
      status: 'published', // Only show published books
      // Ensure items are not sold and have inventory if tracked
      [Op.or]: [
        { trackQuantity: false }, // Items that don't track quantity are always available
        {
          [Op.and]: [
            { trackQuantity: true },
            { quantity: { [Op.gt]: 0 } }, // Items with tracked quantity must have stock
          ],
        },
      ],
    };

    // Apply filters (note: status is VIRTUAL field, defaults to 'active')
    if (vendorId) where.vendorId = vendorId;
    if (condition) where.condition = condition;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Minimal attributes for list view - exclude heavy fields
    const attributes = [
      'id',
      'sid',
      'title',
      'author',
      'price',
      'condition',
      'vendorId',
      'shortDescription',
      'createdAt',
      'status',
      'menuOrder',
    ];

    // Map sortBy values to Sequelize model attribute names
    const sortByMap = {
      createdAt: 'createdAt',
      created_at: 'createdAt',
      menu_order: 'menuOrder',
      menuOrder: 'menuOrder',
      price: 'price',
      title: 'title',
      author: 'author',
      id: 'id',
    };
    const resolvedSortBy = sortByMap[sortBy] || 'menuOrder';

    // Build include array for both count and find queries
    const includeConfig = [
      {
        model: Vendor,
        as: 'vendor',
        attributes: [],
        required: false,
      },
      {
        model: Category,
        as: 'categories',
        attributes: [],
        through: { attributes: [] },
        // Support filtering by ID (numeric) or slug (string)
        ...(category && {
          where: isNaN(parseInt(category))
            ? { slug: category } // Filter by slug if not numeric
            : { id: parseInt(category) }, // Filter by ID if numeric
        }),
        required: !!category,
      },
    ];

    // Get count (with category filter if applied) - simplified to avoid join complexity
    const count = await Book.count({
      where,
      include: includeConfig,
      distinct: true,
    });

    // Get books with proper sorting
    const books = await Book.findAll({
      where,
      attributes,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl'],
          required: false,
        },
        {
          model: Category,
          as: 'categories',
          attributes: ['id', 'name', 'slug'],
          through: { attributes: [] },
          // Support filtering by ID (numeric) or slug (string)
          ...(category && {
            where: isNaN(parseInt(category))
              ? { slug: category } // Filter by slug if not numeric
              : { id: parseInt(category) }, // Filter by ID if numeric
          }),
          required: !!category,
        },
        {
          model: BookMedia,
          as: 'media',
          attributes: ['imageUrl', 'thumbnailUrl', 'isPrimary', 'displayOrder'],
          required: false,
          separate: true,
          limit: 1,
          order: [
            ['isPrimary', 'DESC'],
            ['displayOrder', 'ASC'],
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[resolvedSortBy, sortOrder.toUpperCase()]],
    });

    // Transform to lightweight list format
    const booksData = books.map((book) => {
      const bookJson = book.toJSON();
      const primaryImage = bookJson.media?.[0];

      return {
        id: bookJson.id,
        sid: bookJson.sid,
        slug: bookJson.sid
          ? `${bookJson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${bookJson.sid}`
          : bookJson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: bookJson.title,
        author: bookJson.author,
        price: parseFloat(bookJson.price),
        condition: bookJson.condition,
        shortDescription: bookJson.shortDescription || '',
        primaryImage: primaryImage?.imageUrl || primaryImage?.thumbnailUrl || null,
        vendor: bookJson.vendor
          ? {
              id: bookJson.vendor.id,
              shopName: bookJson.vendor.shopName,
              shopUrl: bookJson.vendor.shopUrl,
            }
          : null,
        categories: bookJson.categories || [],
        status: bookJson.status || 'active',
        createdAt: bookJson.createdAt,
      };
    });

    res.json({
      success: true,
      data: booksData,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get single book by ID or sid
 */
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a numeric ID or sid
    let where = {
      status: 'published', // Only show published books
    };

    if (id.match(/^\d+$/)) {
      // Integer ID
      where.id = parseInt(id);
    } else {
      // Treat as sid
      where.sid = id;
    }

    const book = await Book.findOne({
      where,
      include: [
        { model: Vendor, as: 'vendor' },
        { model: BookMedia, as: 'media' },
        { model: Category, as: 'categories', through: { attributes: [] } },
        { model: Tag, as: 'tags', through: { attributes: [] } },
      ],
    });

    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create new book (vendor only)
 */
export const createBook = async (req, res) => {
  try {
    const { vendorId } = req.user; // Assuming auth middleware sets this
    const bookData = { ...req.body, vendorId };

    const book = await Book.create(bookData);

    // Index in Meilisearch (async, don't wait)
    indexBook(book.id).catch((err) => console.error('Failed to index book:', err));

    res.status(201).json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update book (vendor only)
 */
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.user;

    const book = await Book.findOne({ where: { id, vendorId } });
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found or unauthorized' });
    }

    await book.update(req.body);

    // Update in Meilisearch (async, don't wait)
    indexBook(book.id).catch((err) => console.error('Failed to update book in search:', err));

    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete book (vendor only)
 */
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.user;

    const book = await Book.findOne({ where: { id, vendorId } });
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found or unauthorized' });
    }

    await book.destroy();

    // Remove from Meilisearch (async, don't wait)
    removeBookFromIndex(id).catch((err) =>
      console.error('Failed to remove book from search:', err),
    );

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
