import db from '../../models/index.js';

const { HighSpot, Book, BookMedia } = db;

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildShopLink = (book) => {
  if (!book?.sid) {
    return `/products/${book.id}`;
  }

  const titleSlug = slugify(book.title || 'book');
  return `/products/${titleSlug}/${book.sid}`;
};

const normalizeItems = (rawItems) => {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => ({
      bookId: Number(item?.bookId),
      description: typeof item?.description === 'string' ? item.description.trim() : '',
      imageUrl:
        typeof item?.imageUrl === 'string' && item.imageUrl.trim() ? item.imageUrl.trim() : null,
    }))
    .filter((item) => Number.isInteger(item.bookId) && item.bookId > 0)
    .slice(0, 20);
};

const getConfig = async () => {
  return await HighSpot.findOne({ order: [['id', 'ASC']] });
};

const ensureConfig = async () => {
  let config = await getConfig();

  if (!config) {
    config = await HighSpot.create({ items: [], title: 'High Spots' });
  }

  return config;
};

const normalizeTitle = (rawTitle) => {
  if (typeof rawTitle !== 'string') {
    return 'High Spots';
  }

  const trimmed = rawTitle.trim();
  return trimmed || 'High Spots';
};

const fetchBooksByIds = async (bookIds) => {
  if (!bookIds.length) {
    return new Map();
  }

  const books = await Book.findAll({
    where: { id: bookIds },
    attributes: ['id', 'title', 'sid', 'status'],
    include: [
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
  });

  return new Map(
    books.map((book) => {
      const raw = book.toJSON();
      const media = Array.isArray(raw.media) ? raw.media[0] : null;

      return [
        raw.id,
        {
          id: raw.id,
          title: raw.title,
          sid: raw.sid,
          status: raw.status,
          image: media?.imageUrl || media?.thumbnailUrl || null,
          productLink: buildShopLink(raw),
        },
      ];
    }),
  );
};

const buildResponseItems = async (items) => {
  const bookIds = [...new Set(items.map((item) => Number(item.bookId)).filter(Boolean))];
  const booksById = await fetchBooksByIds(bookIds);

  return items.map((item, index) => {
    const book = booksById.get(Number(item.bookId));

    return {
      id: index + 1,
      bookId: item.bookId,
      description: item.description || '',
      title: book?.title || 'Unavailable book',
      image: item.imageUrl || book?.image || null,
      status: book?.status || 'missing',
      productLink: book?.productLink || null,
    };
  });
};

export const getHighSpots = async (_req, res) => {
  try {
    const config = await ensureConfig();
    const items = Array.isArray(config.items) ? config.items : [];
    const responseItems = await buildResponseItems(items);

    res.json({
      success: true,
      data: {
        title: config.title || 'High Spots',
        items: responseItems,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Admin HighSpots] Get error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load high spots',
    });
  }
};

export const updateHighSpots = async (req, res) => {
  try {
    const normalizedItems = normalizeItems(req.body?.items);
    const normalizedTitle = normalizeTitle(req.body?.title);

    if (!normalizedItems.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one showcased book is required.',
      });
    }

    const config = await ensureConfig();
    await config.update({ items: normalizedItems, title: normalizedTitle });

    const responseItems = await buildResponseItems(normalizedItems);

    res.json({
      success: true,
      message: 'High spots updated successfully',
      data: {
        title: config.title || 'High Spots',
        items: responseItems,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Admin HighSpots] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update high spots',
    });
  }
};
