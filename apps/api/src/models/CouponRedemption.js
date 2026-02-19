/**
 * CouponRedemption Model
 * Tracks when and by whom coupons are redeemed
 */
export default (sequelize, DataTypes) => {
  const CouponRedemption = sequelize.define(
    'CouponRedemption',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      couponId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'coupon_id',
        references: { model: 'coupons', key: 'id' },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' },
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'order_id',
        references: { model: 'orders', key: 'id' },
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'discount_amount',
      },
    },
    {
      tableName: 'coupon_redemptions',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  );

  CouponRedemption.associate = (models) => {
    CouponRedemption.belongsTo(models.Coupon, { foreignKey: 'couponId', as: 'coupon' });
    CouponRedemption.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    CouponRedemption.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
  };

  return CouponRedemption;
};
