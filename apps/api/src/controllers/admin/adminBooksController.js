/**
 * Admin Books Controller
 * Handles admin CRUD + menu_order sorting for books
 */

import db from '../../models/index.js';
import { Op } from 'sequelize';

const { Book, Vendor, BookMedia, Category } = db;

/**
 * List all books with filtering, pagination, and sorting
 * GET /api/admin/books
 * Query params: page, limit, search, category, status, sortBy, sortOrder, vendorId
 */
export const listAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      status,
      sortBy = 'menu_order',
      sortOrder = 'ASC',
      vendorId,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (vendorId) where.vendorId = parseInt(vendorId);
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (category) {
      // Filter by category slug or id
      const categoryWhere = isNaN(category) ? { slug: category } : { id: parseInt(category) };
      const cat = await Category.findOne({ where: categoryWhere });
      if (cat) {
        // Use a subquery approach
        const bookIds = await db.sequelize.query(
          `SELECT bc.book_id FROM book_categories bc WHERE bc.category_id = :catId`,
          { replacements: { catId: cat.id }, type: db.sequelize.QueryTypes.SELECT },
        );
        where.id = { [Op.in]: bookIds.map((b) => b.book_id) };
      }
    }

    // Map sortBy values to Sequelize model attribute names
    const sortByMap = {
      menu_order: 'menuOrder',
      menuOrder: 'menuOrder',
      title: 'title',
      price: 'price',
      created_at: 'createdAt',
      createdAt: 'createdAt',
      updated_at: 'updatedAt',
      updatedAt: 'updatedAt',
      author: 'author',
      id: 'id',
    };
    const safeSortBy = sortByMap[sortBy] || 'menuOrder';
    const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const count = await Book.count({ where, distinct: true });
    const books = await Book.findAll({
      where,
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'shopName', 'shopUrl'] },
        {
          model: BookMedia,
          as: 'media',
          attributes: ['id', 'imageUrl', 'thumbnailUrl', 'isPrimary', 'displayOrder'],
          separate: true,
          limit: 1,
          order: [
            ['isPrimary', 'DESC'],
            ['displayOrder', 'ASC'],
          ],
        },
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
      ],
      order: [[safeSortBy, safeSortOrder]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: books,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Admin listAll books error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: BookMedia, as: 'media' },
        { model: Category, as: 'categories', through: { attributes: [] } },
      ],
    });
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

export const update = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    await book.update(req.body);
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateBook = async (req, res) => {
  return update(req, res);
};

export const deleteBook = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

/**
 * Batch update menu_order for multiple books
 * PUT /api/admin/books/menu-order
 * Body: { items: [{ id: number, menuOrder: number }] }
 */
export const updateMenuOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    // Validate all items have id and menuOrder
    for (const item of items) {
      if (!item.id || typeof item.menuOrder !== 'number') {
        return res.status(400).json({
          success: false,
          error: `Invalid item: each must have 'id' (number) and 'menuOrder' (number)`,
        });
      }
    }

    // Build a single CASE WHEN query for efficiency
    const cases = items
      .map((i) => `WHEN ${parseInt(i.id)} THEN ${parseInt(i.menuOrder)}`)
      .join(' ');
    const ids = items.map((i) => parseInt(i.id)).join(',');

    await db.sequelize.query(
      `UPDATE books SET menu_order = CASE id ${cases} END WHERE id IN (${ids})`,
    );

    res.json({
      success: true,
      message: `Updated menu_order for ${items.length} books`,
      count: items.length,
    });
  } catch (error) {
    console.error('Admin updateMenuOrder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Trigger sync from PROD (read-only fetch + write to DEV)
 * POST /api/admin/books/sync-menu-order
 * This runs the sync-menu-order script in the background
 */
export const syncMenuOrderFromProd = async (req, res) => {
  try {
    const { execSync } = await import('child_process');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    // Run the sync script with --from-file if a recent export exists,
    // otherwise do a fresh pull from PROD
    const scriptDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      '..',
      '..',
      'scripts',
    );
    const scriptPath = path.join(scriptDir, 'sync-menu-order.cjs');

    // Check for recent report file to use as cache (currently unused)
    // const reportsDir = path.join(scriptDir, '..', 'reports', 'menu-order-sync');
    let args = '';

    try {
      const output = execSync(`node "${scriptPath}" ${args}`, {
        encoding: 'utf-8',
        timeout: 300000, // 5 min timeout
        cwd: path.join(scriptDir, '..'),
      });

      // Parse the report from the output

      res.json({
        success: true,
        message: 'Menu order sync completed',
        output: output.substring(0, 5000), // Limit output size
      });
    } catch (execError) {
      res.status(500).json({
        success: false,
        error: 'Sync script failed',
        details: execError.stdout?.substring(0, 2000) || execError.message,
      });
    }
  } catch (error) {
    console.error('Admin syncMenuOrder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
