export default (sequelize, DataTypes) => {
  const Collection = sequelize.define(
    'Collection',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'collections', timestamps: true },
  );

  Collection.associate = (models) => {
    Collection.belongsToMany(models.Book, {
      through: models.BookCollection,
      foreignKey: 'collectionId',
      as: 'books',
    });
  };
  return Collection;
};
