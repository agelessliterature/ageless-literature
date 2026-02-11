'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('book_media', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      bookId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'bookId',
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      thumbnailUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      displayOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('book_media', ['bookId']);
    await queryInterface.addIndex('book_media', ['isPrimary']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('book_media');
  },
};
