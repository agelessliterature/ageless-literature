/**
 * MembershipSubscription Model
 * User membership subscriptions
 *
 * SCHEMA: Matches database schema
 * id, userId, planId are INTEGER
 */
export default (sequelize, DataTypes) => {
  const MembershipSubscription = sequelize.define(
    'MembershipSubscription',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      planId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'membership_plans', key: 'id' },
      },
      status: {
        type: DataTypes.ENUM('active', 'cancelled', 'expired'),
        defaultValue: 'active',
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date',
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_date',
      },
      stripeSubscriptionId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'stripe_subscription_id',
      },
    },
    {
      tableName: 'membership_subscriptions',
      timestamps: true,
      underscored: true,
    },
  );

  MembershipSubscription.associate = (models) => {
    MembershipSubscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    MembershipSubscription.belongsTo(models.MembershipPlan, { foreignKey: 'planId', as: 'plan' });
  };
  return MembershipSubscription;
};
