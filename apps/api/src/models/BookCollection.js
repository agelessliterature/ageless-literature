export default (sequelize, DataTypes) => {
  const BookCollection = sequelize.define(
    'BookCollection',
    {
      bookId: { type: DataTypes.UUID, allowNull: false, references: { model: 'books', key: 'id' } },
      collectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'collections', key: 'id' },
      },
      displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: 'book_collections', timestamps: false },
  );
  return BookCollection;
};
