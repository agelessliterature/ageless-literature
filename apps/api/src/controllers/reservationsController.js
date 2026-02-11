import db from '../models/index.js';
import { addHours } from '../utils/helpers.js';

const { Reservation, Book } = db;

export const createReservation = async (req, res) => {
  try {
    const { userId } = req.user;
    const { bookId } = req.body;

    const book = await Book.findByPk(bookId);
    if (!book || book.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Book not available' });
    }

    const existingReservation = await Reservation.findOne({
      where: { bookId, status: 'active' },
    });

    if (existingReservation) {
      return res.status(400).json({ success: false, error: 'Book already reserved' });
    }

    const expiresAt = addHours(new Date(), 24); // 24-hour reservation
    const reservation = await Reservation.create({
      userId,
      bookId,
      status: 'active',
      expiresAt,
    });

    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserReservations = async (req, res) => {
  try {
    const { userId } = req.user;
    const reservations = await Reservation.findAll({
      where: { userId },
      include: [{ model: Book, as: 'book' }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const reservation = await Reservation.findOne({ where: { id, userId } });
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    await reservation.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
