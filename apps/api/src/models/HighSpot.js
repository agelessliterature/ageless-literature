export default (sequelize, DataTypes) => {
  const HighSpot = sequelize.define(
    'HighSpot',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      items: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of featured high-spot book entries',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'High Spots',
      },
    },
    {
      tableName: 'high_spots',
      timestamps: true,
      underscored: true,
    },
  );

  return HighSpot;
};
