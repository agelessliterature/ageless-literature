/**
 * Auction Bid Model
 */

export default (sequelize, DataTypes) => {
  const AuctionBid = sequelize.define(
    'AuctionBid',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      auctionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'auctions', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      bidTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the bid was placed',
      },
      maxBidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Maximum auto-bid amount',
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        comment: 'active, outbid, winning, won, lost',
      },
      isAutoBid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this was an automatic bid',
      },
    },
    {
      tableName: 'auction_bids',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['auction_id'] },
        { fields: ['user_id'] },
        { fields: ['auction_id', 'user_id'] },
        { fields: ['created_at'] },
      ],
    },
  );

  AuctionBid.associate = (models) => {
    AuctionBid.belongsTo(models.Auction, {
      foreignKey: 'auctionId',
      as: 'auction',
    });
    AuctionBid.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return AuctionBid;
};
