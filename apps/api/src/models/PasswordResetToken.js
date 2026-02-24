/**
 * PasswordResetToken Model
 * Stores short-lived tokens that allow users without a bcrypt password
 * to set a new one. Only the SHA-256 hash of the raw token is persisted.
 */
export default (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define(
    'PasswordResetToken',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      tokenHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'token_hash',
      },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
      usedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null, field: 'used_at' },
    },
    { tableName: 'password_reset_tokens', timestamps: true, underscored: true },
  );

  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return PasswordResetToken;
};
