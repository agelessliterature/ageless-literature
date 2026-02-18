/**
 * MembershipSubscription Model
 * User membership subscriptions
 *
 * SCHEMA: Matches database schema
 * userId is INTEGER (references users.id which is INTEGER)
 * id and planId are UUID
 */
export default (sequelize, DataTypes) => {
  const MembershipSubscription = sequelize.define(
    'MembershipSubscription',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      planId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'membership_plans', key: 'id' },
      },
      status: {
        type: DataTypes.ENUM('active', 'cancelled', 'expired', 'past_due', 'paused', 'trialing'),
        defaultValue: 'active',
      },
      stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
      stripePaymentMethodId: { type: DataTypes.STRING, allowNull: true },
      currentPeriodStart: { type: DataTypes.DATE, allowNull: true },
      currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
      cancelledAt: { type: DataTypes.DATE, allowNull: true },
      pausedAt: { type: DataTypes.DATE, allowNull: true },
      resumedAt: { type: DataTypes.DATE, allowNull: true },
      cancelAtPeriodEnd: { type: DataTypes.BOOLEAN, defaultValue: false },
      paymentMethodLast4: { type: DataTypes.STRING(4), allowNull: true },
      paymentMethodBrand: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'membership_subscriptions', timestamps: true },
  );

  MembershipSubscription.associate = (models) => {
    MembershipSubscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    MembershipSubscription.belongsTo(models.MembershipPlan, { foreignKey: 'planId', as: 'plan' });
  };
  return MembershipSubscription;
};
