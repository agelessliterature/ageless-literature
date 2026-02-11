module.exports = (sequelize, DataTypes) => {
  const BookMedia = sequelize.define(
    'BookMedia',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'bookId', // Explicitly set field name since table uses camelCase
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      imageUrl: { 
        type: DataTypes.STRING, 
        allowNull: false,
        field: 'imageUrl' // Explicitly set field name
      },
      thumbnailUrl: { 
        type: DataTypes.STRING, 
        allowNull: true,
        field: 'thumbnailUrl' // Explicitly set field name
      },
      displayOrder: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        field: 'displayOrder' // Explicitly set field name
      },
      isPrimary: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false,
        field: 'isPrimary' // Explicitly set field name
      },
    },
    { 
      tableName: 'book_media', 
      timestamps: true,
      underscored: false // Keep camelCase for this table
    },
  );

  BookMedia.associate = (models) => {
    BookMedia.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
  };
  return BookMedia;
};
