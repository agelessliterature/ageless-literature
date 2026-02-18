/**
 * Product Model (Collectibles)
 * Non-book collectibles: art, manuscripts, maps, vintage items, memorabilia
 */

export default (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      sid: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Short unique identifier for URLs',
        defaultValue: () =>
          Math.random().toString(36).substring(2, 8) +
          '-' +
          Math.random().toString(36).substring(2, 8),
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'vendors',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Vendor ID - owner of this product listing',
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Product title/name',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Product description',
      },
      shortDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Brief description for listings and previews',
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Product price',
      },
      salePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'sale_price',
        comment: 'Discounted/sale price if item is on sale',
      },
      compareAtPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Compare at price (original/MSRP price for showing discounts)',
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Cost basis for profit calculations',
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Product category: Art, Painting, Manuscript, Map, Vintage, Memorabilia, etc.',
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        defaultValue: [],
        comment: 'Array of tag strings for search/filtering',
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Stock keeping unit / product code',
      },
      trackQuantity: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to track inventory quantity',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Available quantity',
      },
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Alert threshold for low stock',
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Weight for shipping',
      },
      weightUnit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Weight unit (lb, kg, oz, g)',
      },
      requiresShipping: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether product requires shipping',
      },
      taxable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether product is taxable',
      },
      images: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of Cloudinary image URLs and metadata',
      },
      featuredImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Primary/featured product image URL',
      },
      slug: {
        type: DataTypes.STRING(600),
        allowNull: false,
        unique: true,
        comment: 'URL-friendly slug generated from title',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'published, draft, or archived',
      },
      seoTitle: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'SEO meta title',
      },
      seoDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'SEO meta description',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional metadata stored as JSON',
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of views',
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
      auctionLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'auction_locked_until',
        comment: 'If set, item cannot be sold as fixed price until this time',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: async (product) => {
          // Generate sid if not present
          if (!product.sid) {
            product.sid =
              Math.random().toString(36).substring(2, 8) +
              '-' +
              Math.random().toString(36).substring(2, 8);
          }
          // Append sid to slug for uniqueness
          if (product.slug && !product.slug.includes('/')) {
            product.slug = `${product.slug}/${product.sid}`;
          }
        },
      },
      indexes: [
        { fields: ['vendor_id'] },
        { fields: ['slug'], unique: true },
        { fields: ['sid'], unique: true },
        { fields: ['category'] },
        { fields: ['status'] },
        { fields: ['price'] },
        { fields: ['created_at'] },
        { fields: ['auction_locked_until'] },
      ],
    },
  );

  Product.associate = (models) => {
    // Vendor relationship
    Product.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });

    // Category many-to-many relationship
    if (models.Category && models.ProductCategory) {
      Product.belongsToMany(models.Category, {
        through: models.ProductCategory,
        foreignKey: 'productId',
        otherKey: 'categoryId',
        as: 'categories',
      });
    }

    // OrderItem relationship (products can be ordered)
    if (models.OrderItem) {
      Product.hasMany(models.OrderItem, {
        foreignKey: 'productId',
        as: 'orderItems',
      });
    }

    // Auction relationship
    if (models.Auction) {
      Product.hasMany(models.Auction, {
        foreignKey: 'auctionableId',
        constraints: false,
        scope: {
          auctionableType: 'product',
        },
        as: 'auctions',
      });
    }
  };

  // Helper method to get active auction
  Product.prototype.getActiveAuction = async function () {
    const models = sequelize.models;
    if (!models.Auction) return null;

    return await models.Auction.findOne({
      where: {
        auctionableType: 'product',
        auctionableId: this.id.toString(),
        status: ['upcoming', 'active'],
      },
    });
  };

  return Product;
};
