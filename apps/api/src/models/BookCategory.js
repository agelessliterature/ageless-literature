export default (sequelize, DataTypes) => {
  const BookCategory = sequelize.define(
    'BookCategory',
    {
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'book_id',
        references: { model: 'books', key: 'id' },
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'category_id',
        references: { model: 'categories', key: 'id' },
      },
    },
    { tableName: 'book_categories', timestamps: false, underscored: true },
  );
  return BookCategory;
};
