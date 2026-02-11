/**
 * MembershipInvoice Model
 * Billing history for membership subscriptions
 */
export default (sequelize, DataTypes) => {
  const MembershipInvoice = sequelize.define(
    'MembershipInvoice',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      subscriptionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'membership_subscriptions', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      stripeInvoiceId: { type: DataTypes.STRING, allowNull: true },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
      status: {
        type: DataTypes.ENUM('draft', 'open', 'paid', 'void', 'uncollectible'),
        defaultValue: 'open',
      },
      invoiceNumber: { type: DataTypes.STRING, allowNull: true },
      invoicePdfUrl: { type: DataTypes.TEXT, allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      periodStart: { type: DataTypes.DATE, allowNull: true },
      periodEnd: { type: DataTypes.DATE, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      metadata: { type: DataTypes.JSONB, defaultValue: {} },
    },
    {
      tableName: 'membership_invoices',
      timestamps: true,
    },
  );

  MembershipInvoice.associate = (models) => {
    MembershipInvoice.belongsTo(models.MembershipSubscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription',
    });
    if (models.User) {
      MembershipInvoice.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  };

  return MembershipInvoice;
};
