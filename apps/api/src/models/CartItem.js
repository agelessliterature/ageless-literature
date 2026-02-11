export default (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    'CartItem',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cartId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cart_id',
        references: { model: 'carts', key: 'id' },
        onDelete: 'CASCADE',
      },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'book_id',
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'product_id',
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
      },
      quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    { tableName: 'cart_items', timestamps: true, underscored: true },
  );

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
    CartItem.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    CartItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };
  return CartItem;
};
