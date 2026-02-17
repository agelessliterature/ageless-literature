import db from '../models/index.js';

const { Book, Product } = db;

const reserveBookInventory = async (bookId, quantity, transaction) => {
  try {
    const book = await Book.findByPk(bookId, { transaction });
    if (!book) {
      return { success: false, error: 'Book not found' };
    }
    if (!book.trackQuantity) {
      if (book.status === 'sold' || book.status === 'archived') {
        return { success: false, error: 'This item is no longer available' };
      }
      return { success: true, book };
    }
    const availableQty = book.quantity || 0;
    if (availableQty < quantity) {
      if (availableQty === 0) {
        return { success: false, error: 'Out of stock' };
      }
      return { success: false, error: 'Only ' + availableQty + ' available' };
    }
    const newQty = availableQty - quantity;
    await book.update(
      { quantity: newQty, ...(newQty === 0 ? { status: 'sold' } : {}) },
      { transaction },
    );
    return { success: true, book };
  } catch (error) {
    console.error('Error reserving book inventory:', error);
    return { success: false, error: 'Failed to reserve inventory' };
  }
};

const reserveProductInventory = async (productId, quantity, transaction) => {
  try {
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    if (!product.trackQuantity) {
      if (
        product.status === 'sold' ||
        product.status === 'archived' ||
        product.status === 'inactive'
      ) {
        return { success: false, error: 'This item is no longer available' };
      }
      return { success: true, product };
    }
    const availableQty = product.quantity || 0;
    if (availableQty < quantity) {
      if (availableQty === 0) {
        return { success: false, error: 'Out of stock' };
      }
      return { success: false, error: 'Only ' + availableQty + ' available' };
    }
    const newQty = availableQty - quantity;
    await product.update(
      { quantity: newQty, ...(newQty === 0 ? { status: 'sold' } : {}) },
      { transaction },
    );
    return { success: true, product };
  } catch (error) {
    console.error('Error reserving product inventory:', error);
    return { success: false, error: 'Failed to reserve inventory' };
  }
};

const releaseBookInventory = async (bookId, quantity, transaction) => {
  try {
    const book = await Book.findByPk(bookId, { transaction });
    if (!book) return;
    if (book.trackQuantity) {
      const newQty = (book.quantity || 0) + quantity;
      await book.update(
        { quantity: newQty, ...(book.status === 'sold' ? { status: 'published' } : {}) },
        { transaction },
      );
    }
  } catch (error) {
    console.error('Error releasing book inventory:', error);
  }
};

const releaseProductInventory = async (productId, quantity, transaction) => {
  try {
    const product = await Product.findByPk(productId, { transaction });
    if (!product) return;
    if (product.trackQuantity) {
      const newQty = (product.quantity || 0) + quantity;
      await product.update(
        { quantity: newQty, ...(product.status === 'sold' ? { status: 'active' } : {}) },
        { transaction },
      );
    }
  } catch (error) {
    console.error('Error releasing product inventory:', error);
  }
};

export default {
  reserveBookInventory,
  reserveProductInventory,
  releaseBookInventory,
  releaseProductInventory,
};
