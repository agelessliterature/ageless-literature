/**
 * Book Model
 * Core catalog entity for rare books
 *
 * SCHEMA: Uses existing books table schema
 * Database columns: id (integer), title, author, isbn, description (jsonb),
 * price (numeric), quantity (numeric), condition (enum), category, vendor_id (integer),
 * created_at, updated_at
 */

export default (sequelize, DataTypes) => {
  const Book = sequelize.define(
    'Book',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      sid: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Short unique identifier for URLs',
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      author: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isbn: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Rich text description in JSONB format',
      },
      shortDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'short_description',
        comment: 'Brief description for listings and previews',
      },
      price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      salePrice: {
        type: DataTypes.DECIMAL,
        allowNull: true,
        field: 'sale_price',
        comment: 'Discounted/sale price if item is on sale',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Available quantity in stock',
      },
      trackQuantity: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'track_quantity',
        comment: 'Whether to track inventory quantity for this book',
      },
      condition: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Book condition enum',
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'vendor_id',
        references: {
          model: 'vendors',
          key: 'id',
        },
        comment: 'Vendor ID - owner of this book listing',
      },
      status: {
        type: DataTypes.ENUM('draft', 'pending', 'published', 'sold', 'archived'),
        allowNull: false,
        defaultValue: 'published',
        comment:
          'Publication status: draft (not visible), pending (awaiting review), published (visible), sold (out of stock), archived (hidden)',
      },
      menuOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'menu_order',
        comment: 'Custom sort order (matches WordPress menu_order)',
      },
      wpPostId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'wp_post_id',
        comment: 'Original WordPress post ID for reference',
      },
      // VIRTUAL fields for backward compatibility
      slug: {
        type: DataTypes.VIRTUAL,
        get() {
          const title = this.getDataValue('title');
          const sid = this.getDataValue('sid');
          const titleSlug = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'book';
          return sid ? `${titleSlug}/${sid}` : titleSlug;
        },
        comment: 'Generated from title and sid',
      },
      fullDescription: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('description');
        },
        comment: 'Maps to description field',
      },
      currency: {
        type: DataTypes.VIRTUAL,
        defaultValue: 'USD',
        comment: 'Currency (not in schema)',
      },
      binding: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        comment: 'Binding type (not in schema)',
      },
      publicationYear: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        comment: 'Publication year (not in schema)',
      },
      edition: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        comment: 'Edition (not in schema)',
      },
      language: {
        type: DataTypes.VIRTUAL,
        defaultValue: 'English',
        comment: 'Language (not in schema)',
      },
      isSigned: {
        type: DataTypes.VIRTUAL,
        defaultValue: false,
        comment: 'Signed status (not in schema)',
      },
      stockQuantity: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('quantity') || 1;
        },
        comment: 'Maps to quantity field',
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'View count',
      },
      auctionLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'auction_locked_until',
        comment: 'If set, item cannot be sold as fixed price until this time',
      },
    },
    {
      tableName: 'books',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeValidate: async (book) => {
          if (!book.sid) {
            book.sid =
              Math.random().toString(36).substring(2, 8) +
              '-' +
              Math.random().toString(36).substring(2, 8);
          }
        },
      },
      indexes: [
        { fields: ['title'] },
        { fields: ['author'] },
        { fields: ['isbn'] },
        { fields: ['category'] },
        { fields: ['condition'] },
        { fields: ['vendor_id'] },
        { fields: ['created_at'] },
        { fields: ['sid'], unique: true },
        { fields: ['auction_locked_until'] },
      ],
    },
  );

  // Override toJSON to normalize JSONB description to string
  // This prevents React error #31 "Objects are not valid as a React child"
  const originalToJSON = Book.prototype.toJSON;
  Book.prototype.toJSON = function () {
    const values = originalToJSON ? originalToJSON.call(this) : { ...this.get() };
    // Flatten JSONB description to HTML string
    if (values.description && typeof values.description === 'object') {
      values.description = values.description.html || values.description.en || '';
    }
    // Also flatten fullDescription virtual field
    if (values.fullDescription && typeof values.fullDescription === 'object') {
      values.fullDescription = values.fullDescription.html || values.fullDescription.en || '';
    }
    return values;
  };

  Book.associate = (models) => {
    // Vendor relationship
    Book.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });

    // BookMedia relationship
    if (models.BookMedia) {
      Book.hasMany(models.BookMedia, {
        foreignKey: 'bookId',
        as: 'media',
      });
    }

    // Category relationship (many-to-many through BookCategory)
    if (models.Category && models.BookCategory) {
      Book.belongsToMany(models.Category, {
        through: models.BookCategory,
        foreignKey: 'bookId',
        otherKey: 'categoryId',
        as: 'categories',
      });
    }

    // Tag relationship (many-to-many through BookTag)
    if (models.Tag && models.BookTag) {
      Book.belongsToMany(models.Tag, {
        through: models.BookTag,
        foreignKey: 'bookId',
        otherKey: 'tagId',
        as: 'tags',
      });
    }

    // Auction relationship
    if (models.Auction) {
      Book.hasMany(models.Auction, {
        foreignKey: 'auctionableId',
        constraints: false,
        scope: {
          auctionableType: 'book',
        },
        as: 'auctions',
      });
    }

    // Note: Most associations won't work with Payload CMS schema
    // These are here for backward compatibility but may not function

    // Book images relationship (books_images table exists in Payload)
    // This would need custom handling
  };

  // Helper method to get active auction
  Book.prototype.getActiveAuction = async function () {
    const models = sequelize.models;
    if (!models.Auction) return null;

    return await models.Auction.findOne({
      where: {
        auctionableType: 'book',
        auctionableId: this.id.toString(),
        status: ['upcoming', 'active'],
      },
    });
  };

  return Book;
};
