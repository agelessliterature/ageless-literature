/**
 * VendorPayout Model
 * Manual payout records for vendor earnings
 * Admin initiates payouts manually (no Stripe Connect)
 *
 * Database columns: id, vendor_id, amount, method, status,
 * stripe_transfer_id, paypal_batch_id, failure_reason, processed_at,
 * created_at, updated_at
 */

export default (sequelize, DataTypes) => {
  const VendorPayout = sequelize.define(
    'VendorPayout',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'vendor_id',
        references: {
          model: 'vendors',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payout amount sent to vendor',
      },
      method: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Payment method: stripe or paypal',
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        allowNull: true,
        comment: 'Payout status: pending, processing, completed, failed, cancelled',
      },
      stripeTransferId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'stripe_transfer_id',
        comment: 'Stripe transfer ID if using Stripe',
      },
      transactionId: {
        type: DataTypes.VIRTUAL,
        get() {
          return (
            this.getDataValue('stripeTransferId') || this.getDataValue('paypalBatchId') || null
          );
        },
        comment: 'Virtual field: returns stripe transfer ID or paypal batch ID',
      },
      paypalBatchId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'paypal_batch_id',
        comment: 'PayPal batch ID if using PayPal',
      },
      processedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'processed_by',
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Admin user who processed this payout',
      },
      payoutNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'payout_notes',
        comment: 'Admin notes about the payout',
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'failure_reason',
        comment: 'Reason if payout failed',
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'processed_at',
        comment: 'When payout was processed',
      },
    },
    {
      tableName: 'vendor_payouts',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['status'] }],
    },
  );

  VendorPayout.associate = (models) => {
    VendorPayout.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });

    VendorPayout.hasMany(models.VendorEarning, {
      foreignKey: 'payoutId',
      as: 'earnings',
    });

    if (models.VendorWithdrawal) {
      VendorPayout.hasOne(models.VendorWithdrawal, {
        foreignKey: 'payoutId',
        as: 'withdrawal',
      });
    }
  };

  return VendorPayout;
};
