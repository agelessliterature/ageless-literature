/**
 * Reservation Model
 * Book reservations
 */
export default (sequelize, DataTypes) => {
  const Reservation = sequelize.define(
    'Reservation',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('active', 'expired', 'converted', 'cancelled'),
        defaultValue: 'active',
      },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'reservations', timestamps: true },
  );

  Reservation.associate = (models) => {
    Reservation.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    Reservation.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return Reservation;
};
