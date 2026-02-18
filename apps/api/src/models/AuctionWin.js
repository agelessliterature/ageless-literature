/**
 * Auction Win Model
 */

export default (sequelize, DataTypes) => {
  const AuctionWin = sequelize.define(
    'AuctionWin',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      auctionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'auctions', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      winningBidId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'auction_bids', key: 'id' },
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        comment: 'Order created for this auction win',
      },
      winningAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      wonAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isPaid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending_payment',
      },
    },
    {
      tableName: 'auction_wins',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['auction_id'], unique: true },
        { fields: ['user_id'] },
        { fields: ['order_id'] },
        { fields: ['status'] },
      ],
    },
  );

  AuctionWin.associate = (models) => {
    AuctionWin.belongsTo(models.Auction, {
      foreignKey: 'auctionId',
      as: 'auction',
    });
    AuctionWin.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    AuctionWin.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });
  };

  return AuctionWin;
};
