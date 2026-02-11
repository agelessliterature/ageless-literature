/**
 * CollectorProfile Model
 * Extended profile for book collectors
 */

export default (sequelize, DataTypes) => {
  const CollectorProfile = sequelize.define(
    'CollectorProfile',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      avatarImageId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      defaultCurrency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD',
      },
      defaultShippingCountry: {
        type: DataTypes.STRING(2),
        defaultValue: 'US',
      },
    },
    {
      tableName: 'collector_profiles',
      timestamps: true,
      indexes: [{ fields: ['userId'], unique: true }],
    },
  );

  CollectorProfile.associate = (models) => {
    if (models.User) {
      CollectorProfile.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  };

  return CollectorProfile;
};
