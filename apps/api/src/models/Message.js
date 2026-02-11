export default (sequelize, DataTypes) => {
  const Message = sequelize.define(
    'Message',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
      readAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'messages', timestamps: true },
  );

  Message.associate = (models) => {
    Message.belongsTo(models.Conversation, { foreignKey: 'conversationId', as: 'conversation' });
    if (models.User) {
      Message.belongsTo(models.User, { foreignKey: 'senderId', as: 'sender' });
    }
  };
  return Message;
};
