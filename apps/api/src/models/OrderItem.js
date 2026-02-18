export default (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'books', key: 'id' },
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'products', key: 'id' },
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    },
    {
      tableName: 'order_items',
      timestamps: true,
      underscored: true,
    },
  );

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    OrderItem.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    OrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };
  return OrderItem;
};
