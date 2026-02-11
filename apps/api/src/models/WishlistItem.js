export default (sequelize, DataTypes) => {
  const WishlistItem = sequelize.define(
    'WishlistItem',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      wishlistId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'wishlists', key: 'id' },
        onDelete: 'CASCADE',
      },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
    },
    { tableName: 'wishlist_items', timestamps: true, underscored: true },
  );

  WishlistItem.associate = (models) => {
    WishlistItem.belongsTo(models.Wishlist, { foreignKey: 'wishlistId', as: 'wishlist' });
    WishlistItem.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
  };
  return WishlistItem;
};
