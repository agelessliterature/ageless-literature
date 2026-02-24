/**
 * Migration: Add WP Legacy Auth Fields
 * Adds columns needed for Phase C WP -> Dev authentication cutover.
 * All columns are nullable / have defaults so existing rows are untouched.
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = 'users';

    // Helper: skip if column already present (idempotent)
    const addIfMissing = async (col, def) => {
      const desc = await queryInterface.describeTable(t).catch(() => ({}));
      if (!desc[col]) await queryInterface.addColumn(t, col, def);
    };

    await addIfMissing('wp_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Original WordPress user ID',
    });

    // Stores $P$ phpass hash or 32-char md5 hex. Cleared after bcrypt upgrade.
    await addIfMissing('legacy_password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'WP password hash; cleared once bcrypt upgrade completes',
    });

    // Discriminator: phpass | md5 | null
    await addIfMissing('legacy_hash_type', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'phpass | md5 | null',
    });

    // Set when password is opportunistically upgraded to bcrypt on login
    await addIfMissing('password_migrated_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp of bcrypt upgrade from legacy hash',
    });

    // Raw serialized PHP capabilities string for debugging / auditing
    await addIfMissing('wp_roles_raw', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Raw WP capabilities PHP-serialized string',
    });

    // Set when legacy window is expired and user has no bcrypt hash
    await addIfMissing('password_reset_required', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True when user must reset password before logging in',
    });

    await queryInterface
      .addIndex(t, ['wp_user_id'], { name: 'users_wp_user_id_idx' })
      .catch(() => {}); // idempotent
  },

  down: async (queryInterface) => {
    const t = 'users';
    await queryInterface.removeIndex(t, 'users_wp_user_id_idx').catch(() => {});
    for (const col of [
      'wp_user_id',
      'legacy_password_hash',
      'legacy_hash_type',
      'password_migrated_at',
      'wp_roles_raw',
      'password_reset_required',
    ]) {
      await queryInterface.removeColumn(t, col).catch(() => {});
    }
  },
};
