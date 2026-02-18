/**
 * Conversation Model
 * Messaging conversations between two users
 *
 * DB columns: id, userId1, userId2, lastMessageAt, createdAt, updatedAt
 */
export default (sequelize, DataTypes) => {
  const Conversation = sequelize.define(
    'Conversation',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId1: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      userId2: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'conversations', timestamps: true },
  );

  Conversation.associate = (models) => {
    if (models.User) {
      Conversation.belongsTo(models.User, { foreignKey: 'userId1', as: 'user1' });
      Conversation.belongsTo(models.User, { foreignKey: 'userId2', as: 'user2' });
    }
    Conversation.hasMany(models.Message, { foreignKey: 'conversationId', as: 'messages' });
  };
  return Conversation;
};
