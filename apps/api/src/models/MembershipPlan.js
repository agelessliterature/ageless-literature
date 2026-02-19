export default (sequelize, DataTypes) => {
  const MembershipPlan = sequelize.define(
    'MembershipPlan',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
      interval: { type: DataTypes.ENUM('monthly', 'yearly'), allowNull: false },
      stripePriceId: { type: DataTypes.STRING, allowNull: true },
      features: { type: DataTypes.JSONB, defaultValue: [] },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: 'membership_plans', timestamps: true, underscored: true },
  );

  MembershipPlan.associate = (models) => {
    MembershipPlan.hasMany(models.MembershipSubscription, {
      foreignKey: 'planId',
      as: 'subscriptions',
    });
  };
  return MembershipPlan;
};
