/**
 * CustomOffer Model
 * Allows vendors to send custom price offers to specific users for books or products
 */

export default (sequelize, DataTypes) => {
  const CustomOffer = sequelize.define(
    'CustomOffer',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'vendors',
          key: 'id',
        },
        comment: 'The vendor making the offer',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'The user receiving the offer',
      },
      itemType: {
        type: DataTypes.ENUM('book', 'product'),
        allowNull: false,
        comment: 'Type of item: book or product (collectible)',
      },
      itemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID of the book or product',
      },
      originalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Original price of the item',
      },
      offerPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Offered price for the user',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional message from vendor to user',
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Status of the offer',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the offer expires',
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the user responded to the offer',
      },
      initiatedBy: {
        type: DataTypes.ENUM('vendor', 'buyer'),
        allowNull: false,
        defaultValue: 'vendor',
        comment: 'Who initiated the offer: vendor or buyer',
      },
    },
    {
      tableName: 'custom_offers',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['vendor_id'] },
        { fields: ['user_id'] },
        { fields: ['item_type', 'item_id'] },
        { fields: ['status'] },
        { fields: ['expires_at'] },
      ],
    },
  );

  CustomOffer.associate = (models) => {
    CustomOffer.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });
    CustomOffer.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return CustomOffer;
};
