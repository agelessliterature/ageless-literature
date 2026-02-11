/**
 * Auction Model
 * Polymorphic auctions for Books and Products
 */

export default (sequelize, DataTypes) => {
  const Auction = sequelize.define(
    'Auction',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      auctionableType: {
        type: DataTypes.ENUM('book', 'product'),
        allowNull: false,
        field: 'auctionable_type',
        comment: 'Type of item being auctioned: book or product',
      },
      auctionableId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'auctionable_id',
        comment: 'ID of the book or product being auctioned',
      },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'book_id',
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
        comment: 'Legacy book reference - use auctionable fields instead',
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'vendor_id',
        references: { model: 'vendors', key: 'id' },
        onDelete: 'CASCADE',
      },
      startingBid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'starting_bid',
      },
      startingPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'starting_price',
      },
      currentBid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'current_bid',
      },
      reservePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'reserve_price',
        comment: 'Minimum price required to win auction',
      },
      bidCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'bid_count',
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'starts_at',
      },
      endsAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'ends_at',
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date',
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'upcoming',
        field: 'status',
        comment: 'upcoming, active, ended, or cancelled',
      },
      winnerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'winner_id',
        references: { model: 'users', key: 'id' },
      },
    },
    {
      tableName: 'auctions',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['book_id'] },
        { fields: ['vendor_id'] },
        { fields: ['status'] },
        { fields: ['end_date'] },
        { fields: ['ends_at'] },
      ],
    },
  );

  Auction.associate = (models) => {
    // Legacy book association (for backward compatibility)
    Auction.belongsTo(models.Book, {
      foreignKey: 'bookId',
      as: 'book',
    });

    // Polymorphic association - doesn't use Sequelize's built-in polymorphic
    // We handle this manually in controllers by loading based on auctionableType

    Auction.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });
    if (models.User) {
      Auction.belongsTo(models.User, {
        foreignKey: 'winnerId',
        as: 'winner',
      });
    }
    if (models.AuctionBid) {
      Auction.hasMany(models.AuctionBid, {
        foreignKey: 'auctionId',
        as: 'bids',
      });
    }
    if (models.AuctionWin) {
      Auction.hasOne(models.AuctionWin, {
        foreignKey: 'auctionId',
        as: 'winRecord',
      });
    }
  };

  // Helper method to get the auctionable item (Book or Product)
  Auction.prototype.getAuctionableItem = async function () {
    const models = sequelize.models;
    if (this.auctionableType === 'book') {
      return await models.Book.findByPk(this.auctionableId);
    } else if (this.auctionableType === 'product') {
      return await models.Product.findByPk(this.auctionableId);
    }
    return null;
  };

  return Auction;
};
