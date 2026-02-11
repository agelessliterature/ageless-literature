export default (sequelize, DataTypes) => {
  const Tag = sequelize.define(
    'Tag',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    { tableName: 'tags', timestamps: false, underscored: true },
  );

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Book, { through: models.BookTag, foreignKey: 'tagId', as: 'books' });
  };
  return Tag;
};
