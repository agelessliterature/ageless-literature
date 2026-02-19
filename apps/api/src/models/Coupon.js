/**
 * Coupon Model
 * Discount coupons for orders - supports percentage, fixed amount, and free shipping
 */
export default (sequelize, DataTypes) => {
  const Coupon = sequelize.define(
    'Coupon',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discountType: {
        type: DataTypes.ENUM('percentage', 'fixed_amount', 'free_shipping'),
        allowNull: false,
        field: 'discount_type',
      },
      discountValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_value',
      },
      minimumOrderAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'minimum_order_amount',
      },
      maximumDiscountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'maximum_discount_amount',
      },
      usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'usage_limit',
      },
      usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'usage_count',
      },
      perUserLimit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'per_user_limit',
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'starts_at',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'vendor_id',
        references: { model: 'vendors', key: 'id' },
      },
      scope: {
        type: DataTypes.ENUM('global', 'vendor', 'products', 'categories'),
        allowNull: false,
        defaultValue: 'global',
      },
      appliesTo: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'applies_to',
      },
      stackable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdByType: {
        type: DataTypes.ENUM('admin', 'vendor'),
        allowNull: false,
        defaultValue: 'admin',
        field: 'created_by_type',
      },
      createdById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by_id',
      },
    },
    {
      tableName: 'coupons',
      timestamps: true,
      underscored: true,
    },
  );

  Coupon.associate = (models) => {
    Coupon.belongsTo(models.Vendor, { foreignKey: 'vendorId', as: 'vendor' });
    Coupon.hasMany(models.CouponRedemption, { foreignKey: 'couponId', as: 'redemptions' });
  };

  return Coupon;
};
