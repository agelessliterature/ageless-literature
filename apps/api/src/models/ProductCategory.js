export default (sequelize, DataTypes) => {
  const ProductCategory = sequelize.define(
    'ProductCategory',
    {
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
        references: { model: 'products', key: 'id' },
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'category_id',
        references: { model: 'categories', key: 'id' },
      },
    },
    { tableName: 'product_categories', timestamps: true, underscored: true },
  );
  return ProductCategory;
};
