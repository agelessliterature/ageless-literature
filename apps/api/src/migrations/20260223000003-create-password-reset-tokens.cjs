/**
 * Migration: Create password_reset_tokens table
 * Minimal password reset flow for users who have no bcrypt hash.
 * Dev DB only — no WP interaction.
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('password_reset_tokens', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      // SHA-256 hex of the raw token (never store raw token)
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at:    { type: Sequelize.DATE, allowNull: true, defaultValue: null },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('password_reset_tokens', ['user_id'],    { name: 'prt_user_id_idx' });
    await queryInterface.addIndex('password_reset_tokens', ['token_hash'], { name: 'prt_token_hash_idx' });
    await queryInterface.addIndex('password_reset_tokens', ['expires_at'], { name: 'prt_expires_at_idx' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('password_reset_tokens');
  },
};
