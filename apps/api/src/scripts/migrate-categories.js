import db from '../models/index.js';

const { Book, Category, BookCategory } = db;

/**
 * Migration script to convert Book.category string field to BookCategory relationships
 * Run this after populating categories via admin UI
 */
async function migrateCategoryData() {
  try {
    console.log('Starting category migration...');

    // Get all books with string category values
    const books = await Book.findAll({
      where: {
        category: {
          [db.Sequelize.Op.ne]: null,
        },
      },
    });

    console.log(`Found ${books.length} books with string categories`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const book of books) {
      if (!book.category) continue;

      // Try to find matching category by name
      const category = await Category.findOne({
        where: {
          name: {
            [db.Sequelize.Op.iLike]: book.category.trim(),
          },
        },
      });

      if (category) {
        // Check if relationship already exists
        const existing = await BookCategory.findOne({
          where: {
            bookId: book.id,
            categoryId: category.id,
          },
        });

        if (!existing) {
          await BookCategory.create({
            bookId: book.id,
            categoryId: category.id,
          });
          migratedCount++;
          console.log(`Migrated: "${book.title}" -> ${category.name}`);
        } else {
          skippedCount++;
        }
      } else {
        console.log(`⚠ No matching category found for: "${book.category}" (Book: ${book.title})`);
        skippedCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Successfully migrated: ${migratedCount} books`);
    console.log(`Skipped: ${skippedCount} books`);
    console.log('\nNote: Books with unmapped categories will need manual assignment via admin UI');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateCategoryData()
  .then(() => {
    console.log('\nMigration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });
