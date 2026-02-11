/**
 * Test Product/Book Fixtures
 */

export const testBooks = [
  {
    title: 'First Edition Moby Dick',
    author: 'Herman Melville',
    isbn: '9780143105954',
    description: 'A rare first edition of the classic novel',
    price: 499.99,
    stock: 1,
    condition: 'good',
    publicationYear: 1851,
    categoryId: 1,
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '9780141439518',
    description: 'Classic romance novel',
    price: 29.99,
    stock: 5,
    condition: 'excellent',
    publicationYear: 1813,
    categoryId: 2,
  },
];

export const testProducts = [
  {
    title: 'Vintage Bookmark Set',
    description: 'Collection of vintage bookmarks',
    price: 15.99,
    stock: 10,
    categoryId: 3,
  },
];

export const testCategories = [
  { id: 1, name: 'Fiction', slug: 'fiction' },
  { id: 2, name: 'Romance', slug: 'romance' },
  { id: 3, name: 'Accessories', slug: 'accessories' },
];
