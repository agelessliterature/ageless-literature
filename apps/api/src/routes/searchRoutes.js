/**
 * Search Routes
 * Handles search queries using Meilisearch
 */

import express from 'express';
import { search } from '../utils/meilisearch.js';

const router = express.Router();

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
      minPrice,
      maxPrice,
      condition,
      status = 'published',
      sort,
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
    }

    let results;
    try {
      results = await search(q, {
        type,
        limit: parseInt(limit),
        offset: parseInt(offset),
        filters: filters.join(' AND '),
        sort: sortArray,
      });
    } catch (searchError) {
      // If filters fail (e.g. attributes not configured as filterable), retry without filters
      if (searchError.message && searchError.message.includes('not filterable')) {
        console.warn('Search filter failed, retrying without filters:', searchError.message);
        results = await search(q, {
          type,
          limit: parseInt(limit),
          offset: parseInt(offset),
          filters: '',
          sort: sortArray,
        });
      } else {
        throw searchError;
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
