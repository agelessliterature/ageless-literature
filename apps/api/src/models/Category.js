export default (sequelize, DataTypes) => {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      imageUrl: { type: DataTypes.STRING, allowNull: true, field: 'image_url' },
      imagePublicId: { type: DataTypes.STRING, allowNull: true, field: 'image_public_id' },
      parentId: { type: DataTypes.INTEGER, allowNull: true, field: 'parent_id' },
    },
    { tableName: 'categories', timestamps: false, underscored: true },
  );

  Category.associate = (models) => {
    Category.belongsToMany(models.Book, {
      through: models.BookCategory,
      foreignKey: 'categoryId',
      as: 'books',
    });
    if (models.Product && models.ProductCategory) {
      Category.belongsToMany(models.Product, {
        through: models.ProductCategory,
        foreignKey: 'categoryId',
        otherKey: 'productId',
        as: 'products',
      });
    }
    Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
    Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
  };
  return Category;
};
