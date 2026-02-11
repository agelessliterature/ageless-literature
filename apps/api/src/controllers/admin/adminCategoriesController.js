/**
 * Admin Categories Controller
 * Manages book categories (mock implementation until Categories collection is created)
 */

/**
 * List all categories
 * Query params: page, limit
 */
export const listAll = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    // TODO: Create Categories collection and implement actual database queries
    const categories = [
      {
        id: 1,
        name: 'Rare Books',
        slug: 'rare-books',
        description: 'Rare and collectible books',
        bookCount: 0,
      },
      {
        id: 2,
        name: 'First Editions',
        slug: 'first-editions',
        description: 'First edition books',
        bookCount: 0,
      },
      {
        id: 3,
        name: 'Signed Copies',
        slug: 'signed-copies',
        description: 'Books signed by the author',
        bookCount: 0,
      },
      {
        id: 4,
        name: 'Antique Books',
        slug: 'antique-books',
        description: 'Books from previous centuries',
        bookCount: 0,
      },
      {
        id: 5,
        name: 'Manuscripts',
        slug: 'manuscripts',
        description: 'Original manuscripts and documents',
        bookCount: 0,
      },
    ];

    const total = categories.length;

    return res.json({
      success: true,
      data: {
        categories,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      message: 'Categories retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error.message,
    });
  }
};

/**
 * Create category
 * Body: { name, slug?, description? }
 */
export const create = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: name',
      });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

    // TODO: Create Categories collection and implement actual database creation

    return res.status(201).json({
      success: true,
      data: {
        id: Date.now(),
        name,
        slug: generatedSlug,
        description,
        bookCount: 0,
      },
      message: 'Category created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message,
    });
  }
};

/**
 * Update category
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // TODO: Create Categories collection and implement actual database update

    return res.json({
      success: true,
      data: { id, ...updates },
      message: 'Category updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message,
    });
  }
};

/**
 * Delete category
 */
export const deleteCategory = async (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id } = req.params;

    // TODO: Create Categories collection and check if category has books associated

    return res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message,
    });
  }
};
