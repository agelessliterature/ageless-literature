/**
 * Categories Controller
 * Handles CRUD operations for book categories
 */

import db from '../models/index.js';

const { Category, BookCategory } = db;

/**
 * Get all categories
 */
export const getAllCategories = async (req, res) => {
  try {
    const { parentId, includeBooks } = req.query;

    const where = {};
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const include = [];
    if (includeBooks === 'true') {
      include.push({
        model: db.Book,
        as: 'books',
        through: { attributes: [] },
      });
    }

    const categories = await Category.findAll({
      where,
      include,
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get single category by ID
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        { model: Category, as: 'subcategories' },
        { model: Category, as: 'parent' },
      ],
    });

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create new category
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, imageUrl, imagePublicId, parentId } = req.body;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const category = await Category.create({
      name,
      slug,
      description,
      imageUrl,
      imagePublicId,
      parentId: parentId || null,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update category
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, imagePublicId, parentId } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Update slug if name changed
    const slug = name
      ? name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      : category.slug;

    await category.update({
      name: name || category.name,
      slug,
      description: description !== undefined ? description : category.description,
      imageUrl: imageUrl !== undefined ? imageUrl : category.imageUrl,
      imagePublicId: imagePublicId !== undefined ? imagePublicId : category.imagePublicId,
      parentId: parentId !== undefined ? parentId : category.parentId,
    });

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete category
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Check for subcategories
    const subcategories = await Category.count({ where: { parentId: id } });
    if (subcategories > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories',
      });
    }

    await category.destroy();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Assign category to book
 */
export const assignCategoryToBook = async (req, res) => {
  try {
    const { bookId, categoryId } = req.body;

    await BookCategory.create({ bookId, categoryId });

    res.status(201).json({ success: true, message: 'Category assigned to book' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Remove category from book
 */
export const removeCategoryFromBook = async (req, res) => {
  try {
    const { bookId, categoryId } = req.params;

    await BookCategory.destroy({ where: { bookId, categoryId } });

    res.json({ success: true, message: 'Category removed from book' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
