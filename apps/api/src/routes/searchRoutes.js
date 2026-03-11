/**
 * Search Routes
 * Handles search queries using Meilisearch with database fallback
 */

import express from 'express';
import { Op } from 'sequelize';
import { search } from '../utils/meilisearch.js';
import db from '../models/index.js';

const { Book, Product, Vendor, BookMedia } = db;
const router = express.Router();

/**
 * Database fallback search when Meilisearch is unavailable
 */
const dbSearch = async (
  q,
  {
    type = 'all',
    limit = 20,
    offset = 0,
    category,
    author,
    minPrice,
    maxPrice,
    condition,
    status = 'published',
  } = {},
) => {
  const searchTerms = q.trim().split(/\s+/).filter(Boolean);
  const results = { books: [], products: [], total: 0 };

  const baseInventoryWhere = {
    [Op.or]: [{ trackQuantity: false }, { trackQuantity: true, quantity: { [Op.gt]: 0 } }],
  };

  if (type === 'all' || type === 'books') {
    try {
      const where = { ...baseInventoryWhere, status };
      if (condition) where.condition = condition;
      if (category) where.category = category;
      if (author) {
        where[Op.or] = [
          { author: { [Op.iLike]: `%${author}%` } },
          { title: { [Op.iLike]: `%${author}%` } },
        ];
      }
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
        if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
      }
      if (searchTerms.length > 0) {
        where[Op.and] = searchTerms.map((term) => ({
          [Op.or]: [
            { title: { [Op.iLike]: `%${term}%` } },
            { author: { [Op.iLike]: `%${term}%` } },
            { isbn: { [Op.iLike]: `%${term}%` } },
          ],
        }));
      }

      const books = await Book.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: [
          'id',
          'sid',
          'title',
          'author',
          'price',
          'salePrice',
          'condition',
          'category',
          'shortDescription',
          'status',
        ],
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'shopName', 'shopUrl'],
            required: false,
          },
          { model: BookMedia, as: 'media', attributes: ['imageUrl', 'isPrimary'], required: false },
        ],
        order: [['createdAt', 'DESC']],
      });

      results.books = books.map((book) => {
        const b = book.toJSON();
        const primaryMedia = b.media?.find((m) => m.isPrimary) || b.media?.[0];
        return {
          id: b.id.toString(),
          title: b.title,
          author: b.author,
          price: parseFloat(b.price || 0),
          salePrice: b.salePrice ? parseFloat(b.salePrice) : null,
          condition: b.condition,
          category: b.category,
          shortDescription: b.shortDescription,
          status: b.status,
          primaryImage: primaryMedia?.imageUrl || null,
          vendor: b.vendor,
          sid: b.sid,
        };
      });
      results.total += results.books.length;
    } catch (bookSearchError) {
      console.warn('Database fallback book search failed:', bookSearchError.message);
    }
  }

  if (type === 'all' || type === 'products') {
    const where = { ...baseInventoryWhere, status };
    if (condition) where.condition = condition;
    if (category) where.category = category;
    if (author) {
      where[Op.or] = [
        { artist: { [Op.iLike]: `%${author}%` } },
        { title: { [Op.iLike]: `%${author}%` } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    if (searchTerms.length > 0) {
      where[Op.and] = searchTerms.map((term) => ({
        [Op.or]: [{ title: { [Op.iLike]: `%${term}%` } }, { artist: { [Op.iLike]: `%${term}%` } }],
      }));
    }

    const products = await Product.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id',
        'sid',
        'title',
        'artist',
        'price',
        'condition',
        'category',
        'shortDescription',
        'images',
        'status',
        'slug',
      ],
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'shopName', 'shopUrl'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    results.products = products.map((product) => {
      const p = product.toJSON();
      const images = Array.isArray(p.images) ? p.images : [];
      const primaryImage = images.find((img) => img.isPrimary) || images[0];
      return {
        id: p.id.toString(),
        title: p.title,
        artist: p.artist,
        price: parseFloat(p.price || 0),
        salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
        condition: p.condition,
        category: p.category,
        shortDescription: p.shortDescription,
        status: p.status,
        primaryImage: primaryImage?.url || primaryImage?.imageUrl || null,
        vendor: p.vendor,
        sid: p.sid,
        slug: p.slug,
      };
    });
    results.total += results.products.length;
  }

  return results;
};

/**
 * GET /api/search
 * Search books and products
 */
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      type = 'all',
      limit = 20,
      offset = 0,
      category,
      author,
      minPrice,
      maxPrice,
      condition,
      status = 'published',
      sort,
      sortBy,
      sortOrder,
    } = req.query;

    // Build filter string
    const filters = [];

    if (status) {
      filters.push(`status = "${status}"`);
    }

    if (category) {
      filters.push(`category = "${category}"`);
    }

    if (condition) {
      filters.push(`condition = "${condition}"`);
    }

    if (minPrice || maxPrice) {
      if (minPrice && maxPrice) {
        filters.push(`price ${minPrice} TO ${maxPrice}`);
      } else if (minPrice) {
        filters.push(`price >= ${minPrice}`);
      } else if (maxPrice) {
        filters.push(`price <= ${maxPrice}`);
      }
    }

    // Parse sort
    let sortArray = [];
    if (sort) {
      // Format: "price:asc" or "createdAt:desc"
      sortArray = [sort];
    } else if (sortBy && sortBy !== 'relevance') {
      const normalizedOrder = String(sortOrder || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';
      sortArray = [`${sortBy}:${normalizedOrder}`];
    }

    let results;
    let usedFallback = false;
    try {
      results = await search(q, {
        type,
        limit: parseInt(limit),
        offset: parseInt(offset),
        filters: filters.join(' AND '),
        sort: sortArray,
      });

      if (q.trim() && (!results || !results.total)) {
        results = await dbSearch(q, {
          type,
          limit,
          offset,
          category,
          author,
          minPrice,
          maxPrice,
          condition,
          status,
        });
        usedFallback = true;
      }
    } catch (searchError) {
      // If filters fail (e.g. attributes not configured as filterable), retry without filters
      if (searchError.message && searchError.message.includes('not filterable')) {
        console.warn('Search filter failed, retrying without filters:', searchError.message);
        try {
          results = await search(q, {
            type,
            limit: parseInt(limit),
            offset: parseInt(offset),
            filters: '',
            sort: sortArray,
          });
        } catch (retryError) {
          // Meilisearch still unavailable — fall back to database
          console.warn(
            'Meilisearch unavailable, falling back to database search:',
            retryError.message,
          );
          results = await dbSearch(q, {
            type,
            limit,
            offset,
            category,
            author,
            minPrice,
            maxPrice,
            condition,
            status,
          });
          usedFallback = true;
        }
      } else {
        // Meilisearch unavailable — fall back to database search
        console.warn(
          'Meilisearch unavailable, falling back to database search:',
          searchError.message,
        );
        results = await dbSearch(q, {
          type,
          limit,
          offset,
          category,
          author,
          minPrice,
          maxPrice,
          condition,
          status,
        });
        usedFallback = true;
      }
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: results.total,
      },
      source: usedFallback ? 'database' : 'meilisearch',
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions (autocomplete)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q = '', limit = 5 } = req.query;

    const results = await search(q, {
      type: 'all',
      limit: parseInt(limit),
      filters: 'status = "published"',
    });

    // Extract just titles for suggestions
    const suggestions = [
      ...results.books.map((book) => ({
        id: book.id,
        title: book.title,
        type: 'book',
        author: book.author,
      })),
      ...results.products.map((product) => ({
        id: product.id,
        title: product.title,
        type: 'product',
        artist: product.artist,
      })),
    ];

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message,
    });
  }
});

export default router;
