/**
 * Auction Win Model
 */

export default (sequelize, DataTypes) => {
  const AuctionWin = sequelize.define(
    'AuctionWin',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      auctionId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'auctions', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        comment: 'Order created for this auction win',
      },
      winningAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending_payment', 'paid', 'shipped', 'completed', 'cancelled'),
        defaultValue: 'pending_payment',
      },
    },
    {
      tableName: 'auction_wins',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['auctionId'], unique: true },
        { fields: ['userId'] },
        { fields: ['orderId'] },
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
