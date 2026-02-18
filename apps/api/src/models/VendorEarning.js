/**
 * VendorEarning Model
 * Tracks commission and earnings for each vendor sale
 * Created for 8% platform commission system
 *
 * IMPORTANT: This model matches the actual database schema (underscored: true)
 * Database columns: id, vendor_id, order_id, amount, platform_fee, net_amount,
 * status, paid_at, payout_id, description, created_at, updated_at,
 * commission_rate_bps, transaction_type, completed_at
 */

export default (sequelize, DataTypes) => {
  const VendorEarning = sequelize.define(
    'VendorEarning',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'vendors', key: 'id' },
        comment: 'Vendor who earned this revenue',
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        comment: 'Order associated with this earning',
      },
      // Financial Breakdown
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total sale price before commission (gross amount)',
      },
      platformFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Platform commission amount',
      },
      netAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Vendor net earnings after commission',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'pending',
        comment: 'pending, available, or paid',
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the earning was paid out',
      },
      // Payout Tracking
      payoutId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'vendor_payouts', key: 'id' },
        comment: 'Payout batch this earning was included in',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional description of the earning',
      },
      commissionRateBps: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'commission_rate_bps',
        comment: 'Commission rate in basis points (e.g., 800 = 8%)',
      },
      transactionType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'transaction_type',
        comment: 'Type of transaction (e.g., sale, auction)',
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
        comment: 'When the transaction was completed',
      },
    },
    {
      tableName: 'vendor_earnings',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['order_id'] }, { fields: ['status'] }],
    },
  );

  VendorEarning.associate = (models) => {
    VendorEarning.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });

    VendorEarning.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });

    VendorEarning.belongsTo(models.VendorPayout, {
      foreignKey: 'payoutId',
      as: 'payout',
    });
  };

  return VendorEarning;
};
