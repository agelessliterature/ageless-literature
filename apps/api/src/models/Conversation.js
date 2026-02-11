/**
 * Conversation Model
 * Messaging conversations between buyers and vendors
 *
 * MIGRATION NOTE (Phase 2 - Nov 11, 2025):
 */
export default (sequelize, DataTypes) => {
  const Conversation = sequelize.define(
    'Conversation',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      buyerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'vendors', key: 'id' },
      },
      bookId: { type: DataTypes.UUID, allowNull: true, references: { model: 'books', key: 'id' } },
      status: { type: DataTypes.ENUM('active', 'archived'), defaultValue: 'active' },
      lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'conversations', timestamps: true },
  );

  Conversation.associate = (models) => {
    if (models.User) {
      Conversation.belongsTo(models.User, { foreignKey: 'buyerId', as: 'buyer' });
    }
    Conversation.belongsTo(models.Vendor, { foreignKey: 'vendorId', as: 'vendor' });
    Conversation.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    Conversation.hasMany(models.Message, { foreignKey: 'conversationId', as: 'messages' });
  };
  return Conversation;
};
