/**
 * Notification Model
 * User notifications
 */
export default (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: DataTypes.STRING(50), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      data: {
        type: DataTypes.JSONB,
        defaultValue: {},
        get() {
          // Also make it available as 'metadata' for backward compatibility
          return this.getDataValue('data');
        },
      },
      metadata: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('data');
        },
        set(value) {
          this.setDataValue('data', value);
        },
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
    },
    {
      tableName: 'notifications',
      timestamps: true,
      updatedAt: false,
      createdAt: 'created_at',
      underscored: true,
    },
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return Notification;
};
