/**
 * Meilisearch Indexing Script
 * Initializes indexes and indexes all existing books and products
 */

import { initializeIndexes, indexAllBooks, indexAllProducts } from '../utils/meilisearch.js';

const indexData = async () => {
  try {
    console.log('Starting Meilisearch indexing...\n');

    // Initialize indexes with settings
    console.log('Initializing indexes...');
    await initializeIndexes();

    // Index all books
    console.log('Indexing books...');
    const booksCount = await indexAllBooks();

    // Index all products
    console.log('Indexing products...');
    const productsCount = await indexAllProducts();

    console.log('Indexing completed successfully!');
    console.log(`   - Books indexed: ${booksCount}`);
    console.log(`   - Products indexed: ${productsCount}`);
    console.log(`   - Total documents: ${booksCount + productsCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Indexing failed:', error);
    process.exit(1);
  }
};

indexData();
