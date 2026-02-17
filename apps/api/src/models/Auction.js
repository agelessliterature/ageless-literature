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
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'ended_at',
        comment: 'Timestamp when auction ended',
      },
      winnerBidId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'winner_bid_id',
        references: { model: 'auction_bids', key: 'id' },
        comment: 'ID of the winning bid',
      },
      endOutcomeReason: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'end_outcome_reason',
        comment: 'Reason for auction end state (e.g., reserve_not_met, no_bids)',
      },
      relistCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'relist_count',
        comment: 'Number of times this auction has been relisted',
      },
      parentAuctionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'parent_auction_id',
        references: { model: 'auctions', key: 'id' },
        comment: 'If relisted, points to original auction',
      },
      paymentWindowHours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 48,
        field: 'payment_window_hours',
        comment: 'Hours allowed for winner to complete payment',
      },
      paymentDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'payment_deadline',
        comment: 'Deadline for payment (ended_at + payment_window_hours)',
      },
      endPolicyOnNoSale: {
        type: DataTypes.ENUM('NONE', 'RELIST_AUCTION', 'CONVERT_FIXED', 'UNLIST'),
        defaultValue: 'NONE',
        field: 'end_policy_on_no_sale',
        comment: 'Action to take when auction ends without sale',
      },
      endPolicyRelistDelayHours: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'end_policy_relist_delay_hours',
        comment: 'Hours to wait before auto-relisting',
      },
      endPolicyRelistMaxCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'end_policy_relist_max_count',
        comment: 'Maximum number of auto-relists (0 = no limit)',
      },
      endPolicyConvertPriceSource: {
        type: DataTypes.ENUM('MANUAL', 'RESERVE', 'HIGHEST_BID', 'STARTING_BID'),
        defaultValue: 'MANUAL',
        field: 'end_policy_convert_price_source',
        comment: 'Price source when converting to fixed price',
      },
      endPolicyConvertPriceMarkupBps: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'end_policy_convert_price_markup_bps',
        comment: 'Markup in basis points (100 = 1%) for converted price',
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
        { fields: ['winner_bid_id'] },
        { fields: ['parent_auction_id'] },
        { fields: ['payment_deadline'] },
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
      Auction.belongsTo(models.AuctionBid, {
        foreignKey: 'winnerBidId',
        as: 'winningBid',
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
