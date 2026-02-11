/**
 * VendorPayoutSettings Model
 * Stores payout configuration for vendors (Stripe Connect, PayPal)
 */

export default (sequelize, DataTypes) => {
  const VendorPayoutSettings = sequelize.define(
    'VendorPayoutSettings',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'vendor_id',
        references: {
          model: 'vendors',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      // Stripe Connect
      stripeAccountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'stripe_account_id',
      },
      stripeAccountStatus: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'stripe_account_status',
      },
      stripeConnectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'stripe_connected_at',
      },
      // PayPal
      paypalEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'paypal_email',
      },
      paypalVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'paypal_verified',
      },
      paypalConnectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'paypal_connected_at',
      },
      // Preferred method
      preferredMethod: {
        type: DataTypes.ENUM('stripe', 'paypal'),
        allowNull: true,
        field: 'preferred_method',
      },
      // Metadata
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'vendor_payout_settings',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['vendor_id'], unique: true }],
    },
  );

  VendorPayoutSettings.associate = (models) => {
    VendorPayoutSettings.belongsTo(models.Vendor, {
      foreignKey: 'vendorId',
      as: 'vendor',
    });
  };

  return VendorPayoutSettings;
};
