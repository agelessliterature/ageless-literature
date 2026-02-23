'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('books', 'author', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Set any NULL authors to empty string before re-adding NOT NULL
    await queryInterface.sequelize.query(
      "UPDATE books SET author = '' WHERE author IS NULL"
    );
    await queryInterface.changeColumn('books', 'author', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
