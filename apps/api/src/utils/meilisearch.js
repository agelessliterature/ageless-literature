/**
 * Meilisearch Utility
 * Handles search indexing and queries for books and products
 */

import { MeiliSearch } from 'meilisearch';
import db from '../models/index.js';

const { Book, Product, Vendor, BookMedia } = db;

// Initialize Meilisearch client
const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

// Index names
const BOOKS_INDEX = 'books';
const PRODUCTS_INDEX = 'products';

/**
 * Initialize indexes with settings
 */
export const initializeIndexes = async () => {
  try {
    // Books index
    const booksIndex = client.index(BOOKS_INDEX);
    await booksIndex.updateSettings({
      searchableAttributes: ['title', 'author', 'isbn', 'description', 'category', 'tags'],
      filterableAttributes: [
        'id',
        'vendorId',
        'category',
        'condition',
        'price',
        'status',
        'quantity',
        'trackQuantity',
        'isFeatured',
      ],
      sortableAttributes: ['price', 'createdAt', 'title'],
      displayedAttributes: [
        'id',
        'title',
        'author',
        'isbn',
        'price',
        'salePrice',
        'condition',
        'category',
        'description',
        'shortDescription',
        'quantity',
        'trackQuantity',
        'status',
        'primaryImage',
        'vendor',
        'createdAt',
      ],
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'price:asc'],
    });

    // Products index
    const productsIndex = client.index(PRODUCTS_INDEX);
    await productsIndex.updateSettings({
      searchableAttributes: [
        'title',
        'artist',
        'sku',
        'description',
        'category',
        'tags',
        'materials',
        'origin',
      ],
      filterableAttributes: [
        'id',
        'vendorId',
        'category',
        'condition',
        'price',
        'status',
        'quantity',
        'trackQuantity',
        'isSigned',
        'isAuthenticated',
        'isFeatured',
      ],
      sortableAttributes: ['price', 'createdAt', 'title'],
      displayedAttributes: [
        'id',
        'title',
        'artist',
        'sku',
        'price',
        'salePrice',
        'condition',
        'category',
        'description',
        'shortDescription',
        'quantity',
        'trackQuantity',
        'status',
        'yearMade',
        'materials',
        'dimensions',
        'origin',
        'isSigned',
        'isAuthenticated',
        'primaryImage',
        'vendor',
        'createdAt',
      ],
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'price:asc'],
    });

    console.log('SUCCESS: Meilisearch indexes initialized successfully');
  } catch (error) {
    console.error('ERROR: Failed to initialize Meilisearch indexes:', error);
    throw error;
  }
};

/**
 * Transform book data for indexing
 */
const transformBookForIndex = async (book) => {
  const bookData = book.toJSON ? book.toJSON() : book;

  // Get primary image from media
  const primaryImage = bookData.media?.find((img) => img.isPrimary) || bookData.media?.[0];

  return {
    id: bookData.id.toString(),
    title: bookData.title || '',
    author: bookData.author || '',
    isbn: bookData.isbn || '',
    price: parseFloat(bookData.price || 0),
    salePrice: bookData.salePrice ? parseFloat(bookData.salePrice) : null,
    condition: bookData.condition || '',
    category: bookData.category || '',
    description: bookData.description || '',
    shortDescription: bookData.shortDescription || '',
    quantity: bookData.quantity || 0,
    trackQuantity: bookData.trackQuantity !== false, // Default to true
    status: bookData.status || 'draft',
    vendorId: bookData.vendorId || null,
    isFeatured: bookData.isFeatured || false,
    primaryImage: primaryImage?.url || primaryImage?.imageUrl || null,
    vendor: bookData.vendor
      ? {
          id: bookData.vendor.id,
          shopName: bookData.vendor.shopName,
          shopUrl: bookData.vendor.shopUrl,
        }
      : null,
    tags: Array.isArray(bookData.tags) ? bookData.tags : [],
    createdAt: new Date(bookData.createdAt).getTime(),
  };
};

/**
 * Transform product data for indexing
 */
const transformProductForIndex = (product) => {
  const productData = product.toJSON ? product.toJSON() : product;

  // Get primary image
  const primaryImage = productData.images?.find((img) => img.isPrimary) || productData.images?.[0];

  return {
    id: productData.id.toString(),
    title: productData.title || '',
    artist: productData.artist || '',
    sku: productData.sku || '',
    price: parseFloat(productData.price || 0),
    salePrice: productData.salePrice ? parseFloat(productData.salePrice) : null,
    condition: productData.condition || '',
    category: productData.category || '',
    description: productData.description || '',
    shortDescription: productData.shortDescription || '',
    quantity: productData.quantity || 0,
    trackQuantity: productData.trackQuantity !== false, // Default to true
    status: productData.status || 'draft',
    vendorId: productData.vendorId || null,
    yearMade: productData.yearMade || null,
    materials: productData.materials || '',
    dimensions: productData.dimensions || '',
    origin: productData.origin || '',
    isSigned: productData.isSigned || false,
    isAuthenticated: productData.isAuthenticated || false,
    isFeatured: productData.isFeatured || false,
    primaryImage: primaryImage?.url || primaryImage?.imageUrl || null,
    vendor: productData.vendor
      ? {
          id: productData.vendor.id,
          shopName: productData.vendor.shopName,
          shopUrl: productData.vendor.shopUrl,
        }
      : null,
    tags: Array.isArray(productData.tags) ? productData.tags : [],
    createdAt: new Date(productData.createdAt).getTime(),
  };
};

/**
 * Index a single book
 */
export const indexBook = async (bookId) => {
  try {
    const book = await Book.findByPk(bookId, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl'],
        },
        {
          model: BookMedia,
          as: 'media',
          attributes: ['imageUrl', 'isPrimary'],
        },
      ],
    });

    if (!book) {
      console.warn(`Book ${bookId} not found for indexing`);
      return;
    }

    const bookData = await transformBookForIndex(book);
    const index = client.index(BOOKS_INDEX);
    await index.addDocuments([bookData]);

    console.log(`SUCCESS: Indexed book: ${bookData.title} (${bookId})`);
  } catch (error) {
    console.error(`ERROR: Failed to index book ${bookId}:`, error);
    throw error;
  }
};

/**
 * Index a single product
 */
export const indexProduct = async (productId) => {
  try {
    const product = await Product.findByPk(productId, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl'],
        },
      ],
    });

    if (!product) {
      console.warn(`Product ${productId} not found for indexing`);
      return;
    }

    const productData = transformProductForIndex(product);
    const index = client.index(PRODUCTS_INDEX);
    await index.addDocuments([productData]);

    console.log(`SUCCESS: Indexed product: ${productData.title} (${productId})`);
  } catch (error) {
    console.error(`ERROR: Failed to index product ${productId}:`, error);
    throw error;
  }
};

/**
 * Index all books
 */
export const indexAllBooks = async () => {
  try {
    const books = await Book.findAll({
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl'],
        },
        {
          model: BookMedia,
          as: 'media',
          attributes: ['imageUrl', 'isPrimary'],
        },
      ],
    });

    const booksData = await Promise.all(books.map(transformBookForIndex));
    const index = client.index(BOOKS_INDEX);
    await index.addDocuments(booksData, { primaryKey: 'id' });

    console.log(`SUCCESS: Indexed ${booksData.length} books`);
    return booksData.length;
  } catch (error) {
    console.error('ERROR: Failed to index all books:', error);
    throw error;
  }
};

/**
 * Index all products
 */
export const indexAllProducts = async () => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'shopName', 'shopUrl'],
        },
      ],
    });

    const productsData = products.map(transformProductForIndex);
    const index = client.index(PRODUCTS_INDEX);
    await index.addDocuments(productsData, { primaryKey: 'id' });

    console.log(`SUCCESS: Indexed ${productsData.length} products`);
    return productsData.length;
  } catch (error) {
    console.error('ERROR: Failed to index all products:', error);
    throw error;
  }
};

/**
 * Remove a book from index
 */
export const removeBookFromIndex = async (bookId) => {
  try {
    const index = client.index(BOOKS_INDEX);
    await index.deleteDocument(bookId.toString());
    console.log(`SUCCESS: Removed book ${bookId} from index`);
  } catch (error) {
    console.error(`ERROR: Failed to remove book ${bookId} from index:`, error);
  }
};

/**
 * Remove a product from index
 */
export const removeProductFromIndex = async (productId) => {
  try {
    const index = client.index(PRODUCTS_INDEX);
    await index.deleteDocument(productId.toString());
    console.log(`SUCCESS: Removed product ${productId} from index`);
  } catch (error) {
    console.error(`ERROR: Failed to remove product ${productId} from index:`, error);
  }
};

/**
 * Search books and products
 */
export const search = async (query, options = {}) => {
  try {
    const {
      type = 'all', // 'all', 'books', 'products'
      limit = 20,
      offset = 0,
      filters = '',
      sort = [],
    } = options;

    // Build filter to exclude sold items and items with no inventory
    const inventoryFilters = ['status = "published"', '(quantity > 0 OR trackQuantity = false)'];

    // Combine with user-provided filters
    const combinedFilters = filters
      ? `(${inventoryFilters.join(' AND ')}) AND (${filters})`
      : inventoryFilters.join(' AND ');

    const searchOptions = {
      limit,
      offset,
      filter: combinedFilters,
      sort,
    };

    let results = { books: [], products: [], total: 0 };

    if (type === 'all' || type === 'books') {
      const booksIndex = client.index(BOOKS_INDEX);
      const booksResults = await booksIndex.search(query, searchOptions);
      results.books = booksResults.hits;
      results.total += booksResults.estimatedTotalHits;
    }

    if (type === 'all' || type === 'products') {
      const productsIndex = client.index(PRODUCTS_INDEX);
      const productsResults = await productsIndex.search(query, searchOptions);
      results.products = productsResults.hits;
      results.total += productsResults.estimatedTotalHits;
    }

    return results;
  } catch (error) {
    console.error('ERROR: Search failed:', error);
    throw error;
  }
};

/**
 * Get Meilisearch client
 */
export const getMeiliClient = () => client;

export default {
  initializeIndexes,
  indexBook,
  indexProduct,
  indexAllBooks,
  indexAllProducts,
  removeBookFromIndex,
  removeProductFromIndex,
  search,
  getMeiliClient,
};
