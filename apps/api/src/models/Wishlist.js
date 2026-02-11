/**
 * Wishlist Model
 * User wishlists for books
 */
export default (sequelize, DataTypes) => {
  const Wishlist = sequelize.define(
    'Wishlist',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: DataTypes.STRING, defaultValue: 'My Wishlist' },
    },
    { tableName: 'wishlists', timestamps: true, underscored: true },
  );

  Wishlist.associate = (models) => {
    Wishlist.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Wishlist.hasMany(models.WishlistItem, { foreignKey: 'wishlistId', as: 'items' });
  };
  return Wishlist;
};
