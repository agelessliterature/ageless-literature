import db from '../models/index.js';

const { Wishlist, WishlistItem, Book, BookMedia, Vendor } = db;

export const getWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    let wishlist = await Wishlist.findOne({
      where: { userId },
      include: [
        {
          model: WishlistItem,
          as: 'items',
          include: [
            {
              model: Book,
              as: 'book',
              include: [
                { model: BookMedia, as: 'media' },
                { model: Vendor, as: 'vendor' },
              ],
            },
          ],
        },
      ],
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId });
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: wishlist.items || [] });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ success: false, error: 'bookId is required' });
    }

    let wishlist = await Wishlist.findOne({ where: { userId } });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId });
    }

    const existingItem = await WishlistItem.findOne({ where: { wishlistId: wishlist.id, bookId } });
    if (existingItem) {
      return res.status(400).json({ success: false, error: 'Book already in wishlist' });
    }

    await WishlistItem.create({ wishlistId: wishlist.id, bookId });
    res.json({ success: true, message: 'Item added to wishlist' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemId } = req.params;

    // Support removing by either WishlistItem ID or bookId
    // First try to find by WishlistItem ID
    let item = await WishlistItem.findByPk(itemId);

    // If not found by itemId, try to find by bookId for the user's wishlist
    if (!item) {
      const wishlist = await Wishlist.findOne({ where: { userId } });
      if (wishlist) {
        item = await WishlistItem.findOne({
          where: { wishlistId: wishlist.id, bookId: itemId },
        });
      }
    }

    if (!item) {
      return res.status(404).json({ success: false, error: 'Wishlist item not found' });
    }

    await item.destroy();
    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
