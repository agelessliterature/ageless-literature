/**
 * RareBookRequest Model
 * Represents customer requests for rare or hard-to-find books
 */

module.exports = (sequelize, DataTypes) => {
  const RareBookRequest = sequelize.define(
    'RareBookRequest',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      author: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isbn: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      condition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      maxPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('open', 'fulfilled', 'closed'),
        defaultValue: 'open',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'rare_book_requests',
      timestamps: true,
    }
  );

  RareBookRequest.associate = (models) => {
    RareBookRequest.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return RareBookRequest;
};
