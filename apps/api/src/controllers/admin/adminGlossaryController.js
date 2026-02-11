/**
 * Admin Glossary Controller
 * Manages book collecting terminology (mock implementation)
 */

/**
 * List all glossary terms
 * Query params: page, limit, letter
 */
export const listAll = async (req, res) => {
  try {
    const { page = 1, limit = 100, letter } = req.query;

    // TODO: Create Glossary collection
    const terms = [
      {
        id: 1,
        term: 'First Edition',
        slug: 'first-edition',
        definition:
          'The first published version of a book, often highly sought after by collectors.',
        relatedTerms: ['Edition', 'Printing'],
      },
      {
        id: 2,
        term: 'Provenance',
        slug: 'provenance',
        definition:
          'The documented history of ownership of a book, which can significantly impact its value.',
        relatedTerms: ['Ownership', 'History'],
      },
      {
        id: 3,
        term: 'Dust Jacket',
        slug: 'dust-jacket',
        definition:
          'The removable paper cover of a book, often featuring artwork and promotional text.',
        relatedTerms: ['Cover', 'Wrapper'],
      },
      {
        id: 4,
        term: 'Ex-Libris',
        slug: 'ex-libris',
        definition:
          'A bookplate or label indicating previous ownership, typically pasted inside the front cover.',
        relatedTerms: ['Bookplate', 'Ownership'],
      },
      {
        id: 5,
        term: 'Colophon',
        slug: 'colophon',
        definition: 'A statement at the end of a book giving information about its production.',
        relatedTerms: ['Imprint', 'Publishing'],
      },
    ];

    let filtered = terms;
    if (letter) {
      filtered = terms.filter((t) => t.term.toLowerCase().startsWith(letter.toLowerCase()));
    }

    const total = filtered.length;

    return res.json({
      success: true,
      data: {
        terms: filtered,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      message: 'Glossary terms retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve glossary terms',
      error: error.message,
    });
  }
};

/**
 * Create glossary term
 * Body: { term, slug?, definition, relatedTerms? }
 */
export const create = async (req, res) => {
  try {
    const { term, slug, definition, relatedTerms } = req.body;

    if (!term || !definition) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: term, definition',
      });
    }

    const generatedSlug = slug || term.toLowerCase().replace(/\s+/g, '-');

    // TODO: Create Glossary collection and implement actual database creation

    return res.status(201).json({
      success: true,
      data: {
        id: Date.now(),
        term,
        slug: generatedSlug,
        definition,
        relatedTerms: relatedTerms || [],
      },
      message: 'Glossary term created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create glossary term',
      error: error.message,
    });
  }
};

/**
 * Update glossary term
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // TODO: Create Glossary collection and implement actual database update

    return res.json({
      success: true,
      data: { id, ...updates },
      message: 'Glossary term updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update glossary term',
      error: error.message,
    });
  }
};

/**
 * Delete glossary term
 */
export const deleteTerm = async (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id } = req.params;

    // TODO: Create Glossary collection and implement actual database deletion

    return res.json({
      success: true,
      message: 'Glossary term deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete glossary term',
      error: error.message,
    });
  }
};

/**
 * Get single glossary term by slug
 */
export const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // TODO: Create Glossary collection and implement actual database query

    return res.json({
      success: true,
      data: {
        id: 1,
        term: 'Example Term',
        slug,
        definition: 'Example definition',
        relatedTerms: [],
      },
      message: 'Glossary term retrieved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve glossary term',
      error: error.message,
    });
  }
};
