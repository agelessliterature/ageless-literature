export default (sequelize, DataTypes) => {
  const BookTag = sequelize.define(
    'BookTag',
    {
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'book_id',
        references: { model: 'books', key: 'id' },
      },
      tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'tag_id',
        references: { model: 'tags', key: 'id' },
      },
    },
    { tableName: 'book_tags', timestamps: false, underscored: true },
  );
  return BookTag;
};
