/**
 * Cart Model
 * Shopping cart for users
 */
export default (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    'Cart',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      couponCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'coupon_code',
      },
    },
    {
      tableName: 'carts',
      timestamps: true,
      underscored: true,
    },
  );

  Cart.associate = (models) => {
    Cart.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Cart.hasMany(models.CartItem, { foreignKey: 'cartId', as: 'items' });
  };
  return Cart;
};
