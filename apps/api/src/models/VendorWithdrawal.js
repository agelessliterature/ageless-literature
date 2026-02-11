/**
 * VendorWithdrawal Model
 * Tracks vendor-initiated withdrawal requests
 * Vendors request withdrawals, admins approve and process them
 *
 * Database columns: id, vendor_id, amount, method, status, rejection_reason,
 * payout_id, requested_at, processed_at, created_at, updated_at
 */

export default (sequelize, DataTypes) => {
  const VendorWithdrawal = sequelize.define(
    'VendorWithdrawal',
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
        comment: 'Vendor requesting withdrawal',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Requested withdrawal amount',
      },
      method: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Requested payout method: stripe or paypal',
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        allowNull: true,
        comment: 'Withdrawal request status: pending, approved, processing, completed, rejected',
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'rejection_reason',
        comment: 'Reason if rejected',
      },
      payoutId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'payout_id',
        references: {
          model: 'vendor_payouts',
          key: 'id',
        },
        comment: 'Link to created payout record',
      },
      requestedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'requested_at',
        comment: 'When withdrawal was requested',
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'processed_at',
        comment: 'When withdrawal was processed/completed',
      },
    },
    {
      tableName: 'vendor_withdrawals',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['status'] }],
    },
  );

  VendorWithdrawal.associate = (models) => {
    VendorWithdrawal.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });

    if (models.VendorPayout) {
      VendorWithdrawal.belongsTo(models.VendorPayout, {
        foreignKey: 'payoutId',
        as: 'payout',
      });
    }
  };

  return VendorWithdrawal;
};
