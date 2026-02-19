/**
 * Order Model
 * Customer orders and purchases
 */
export default (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' },
      },
      orderNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'order_number',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      tax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      shippingCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: 'shipping_cost',
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'total_amount',
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD',
      },
      shippingAddress: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'shipping_address',
      },
      billingAddress: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'billing_address',
      },
      paymentMethod: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'payment_method',
      },
      paymentStatus: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'pending',
        field: 'payment_status',
      },
      stripePaymentIntentId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'stripe_payment_intent_id',
      },
      trackingNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'tracking_number',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      couponId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'coupon_id',
        references: { model: 'coupons', key: 'id' },
      },
      couponCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'coupon_code',
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'discount_amount',
      },
    },
    {
      tableName: 'orders',
      timestamps: true,
      underscored: true,
    },
  );

  Order.associate = (models) => {
    Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
    Order.belongsTo(models.Coupon, { foreignKey: 'couponId', as: 'coupon' });
  };
  return Order;
};
