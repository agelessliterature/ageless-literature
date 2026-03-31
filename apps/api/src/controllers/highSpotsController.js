import db from '../models/index.js';

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

const getHighSpotConfig = async () => {
  const config = await HighSpot.findOne({ order: [['id', 'ASC']] });
  return config || null;
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
      const image = media?.imageUrl || media?.thumbnailUrl || null;

      return [
        raw.id,
        {
          id: raw.id,
          title: raw.title,
          sid: raw.sid,
          status: raw.status,
          image,
          shopLink: buildShopLink(raw),
        },
      ];
    }),
  );
};

export const getHighSpots = async (_req, res) => {
  try {
    const config = await getHighSpotConfig();
    const items = Array.isArray(config?.items) ? config.items : [];

    const bookIds = [...new Set(items.map((item) => Number(item.bookId)).filter(Boolean))];
    const booksById = await fetchBooksByIds(bookIds);

    const resolvedItems = items
      .map((item, index) => {
        const book = booksById.get(Number(item.bookId));
        if (!book || book.status !== 'published') {
          return null;
        }

        return {
          id: index + 1,
          bookId: book.id,
          title: book.title,
          description: item.description || '',
          image: item.imageUrl || book.image,
          productLink: book.shopLink,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        title: config?.title || 'High Spots',
        items: resolvedItems,
        updatedAt: config?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Error loading high spots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load high spots',
    });
  }
};
