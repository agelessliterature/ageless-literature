import db from '../models/index.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const { Category } = db;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const categories = [
  {
    name: 'African American',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/African-American.png',
    description:
      'Literature and works celebrating African American culture, history, and contributions',
  },
  {
    name: 'Ageless Auctions',
    imageUrl:
      'https://www.agelessliterature.com/wp-content/uploads/2025/10/Ageless-literature-5.png',
    description: 'Exclusive rare books and collectibles available through our auction platform',
  },
  {
    name: 'Americana',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2024/06/Americana.jpeg',
    description: 'Books documenting American history, culture, and heritage',
  },
  {
    name: 'Antiquarian',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Antiquarian.png',
    description: 'Ancient and historically significant books from centuries past',
  },
  {
    name: 'Arts & Photography',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Arts-Photography.png',
    description: 'Visual arts, photography collections, and artistic movements',
  },
  {
    name: 'Association Copies',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Association-Copies.png',
    description:
      'Books with provenance connections to notable individuals or historical significance',
  },
  {
    name: 'Biographies',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Biographies.png',
    description: 'Life stories of remarkable individuals throughout history',
  },
  {
    name: 'Books on Books',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Books-on-Books.png',
    description: 'Bibliography, book collecting guides, and literary criticism',
  },
  {
    name: 'Cartography & Maps',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Cartography-Maps.png',
    description: 'Historical maps, atlases, and cartographic works',
  },
  {
    name: 'Childrens Books',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Childrens-Books.png',
    description: "Classic and vintage children's literature and illustrated tales",
  },
  {
    name: 'Classic Literature',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2024/06/classiclit.jpg',
    description: 'Timeless literary masterpieces from renowned authors',
  },
  {
    name: 'Collectibles & Memorabilia',
    imageUrl:
      'https://www.agelessliterature.com/wp-content/uploads/2025/06/Collectibles-Memorabilia.webp',
    description: 'Literary collectibles, memorabilia, and unique artifacts',
  },
  {
    name: 'Counter Culture',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Counter-Culture.png',
    description: 'Alternative movements, underground literature, and counterculture works',
  },
  {
    name: 'Economics & Business',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Economics-Business.png',
    description: 'Economic theory, business history, and financial literature',
  },
  {
    name: 'Ephemera',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Ephemera.png',
    description: 'Historical documents, pamphlets, and transient printed matter',
  },
  {
    name: 'Fiction',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Fiction.png',
    description: 'Novels, short stories, and imaginative narrative works',
  },
  {
    name: 'First Editions',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2024/06/first-editions.jpg',
    description: 'Original first printings of significant literary works',
  },
  {
    name: 'French Literature',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/French-Literature.webp',
    description: 'French authors, translations, and Francophone literary traditions',
  },
  {
    name: 'Government, Law, & Politics',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Government-Law.png',
    description: 'Political theory, legal texts, and governmental documents',
  },
  {
    name: 'Hardcover',
    imageUrl: null,
    description: 'Books bound in rigid protective covers',
  },
  {
    name: 'History',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/History.webp',
    description: 'Historical accounts, analysis, and documentation of past events',
  },
  {
    name: 'Human Sciences',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Human-Sciences.webp',
    description: 'Anthropology, sociology, psychology, and human behavior studies',
  },
  {
    name: 'Illustrated Books',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Illustrated-Books.png',
    description: 'Books featuring significant artistic illustrations and engravings',
  },
  {
    name: 'Indigenous Cultures',
    imageUrl:
      'https://www.agelessliterature.com/wp-content/uploads/2025/06/Indigenous-Cultures.png',
    description: 'Works documenting indigenous peoples, traditions, and knowledge',
  },
  {
    name: 'Literature',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Literature.png',
    description: 'General literary works spanning various genres and periods',
  },
  {
    name: 'Manuscripts',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2024/06/Manuscripts.jpeg',
    description: 'Handwritten documents, original manuscripts, and scribal works',
  },
  {
    name: 'Military, Naval, & Aviation',
    imageUrl:
      'https://www.agelessliterature.com/wp-content/uploads/2025/06/Military-Naval-Aviation.png',
    description: 'Military history, naval records, and aviation documentation',
  },
  {
    name: 'Modern Firsts',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2024/06/lessthan1k.jpg',
    description: 'First editions of modern literature and contemporary classics',
  },
  {
    name: 'Music',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Music.webp',
    description: 'Musical scores, music history, and musicological studies',
  },
  {
    name: 'Nature',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Nature.webp',
    description: 'Natural history, flora and fauna, and environmental studies',
  },
  {
    name: 'Occult',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Occult.png',
    description: 'Esoteric knowledge, mysticism, and occult traditions',
  },
  {
    name: 'One of a kind',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/One-of-A-Kind.png',
    description: 'Unique, singular items with no comparable copies',
  },
  {
    name: 'Periodicals',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Periodicals.webp',
    description: 'Magazines, journals, and serialized publications',
  },
  {
    name: 'Poetry',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Poetry.png',
    description: 'Verse, poetic collections, and lyrical works',
  },
  {
    name: 'Reference',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Reference.webp',
    description: 'Dictionaries, encyclopedias, and reference materials',
  },
  {
    name: 'Religion & Philosophy',
    imageUrl:
      'https://www.agelessliterature.com/wp-content/uploads/2025/06/Religion-Philosophy.png',
    description: 'Theological texts, philosophical treatises, and spiritual works',
  },
  {
    name: 'Science & Technology',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Science-Technology.png',
    description: 'Scientific discoveries, technological advances, and research',
  },
  {
    name: 'Science Fiction',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Science-Fiction.png',
    description: 'Speculative fiction exploring future worlds and technology',
  },
  {
    name: 'Signed',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Signed.webp',
    description: 'Author-signed books and inscribed copies',
  },
  {
    name: 'Sports & Recreation',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Sports-Recreation.webp',
    description: 'Athletic history, sporting events, and recreational activities',
  },
  {
    name: 'Travel & Exploration',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/Travel-Exploration.png',
    description: 'Voyage accounts, exploration narratives, and travel guides',
  },
  {
    name: 'War',
    imageUrl: 'https://www.agelessliterature.com/wp-content/uploads/2025/06/War.webp',
    description: 'War histories, battle accounts, and military conflicts',
  },
];

async function uploadImageToCloudinary(imageUrl, categoryName) {
  try {
    console.log(`  -> Uploading image for ${categoryName}...`);

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'categories',
      public_id: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      overwrite: true,
    });

    return {
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
    };
  } catch (error) {
    console.error(`  ✗ Failed to upload image for ${categoryName}:`, error.message);
    return { imageUrl: null, imagePublicId: null };
  }
}

async function seedCategories() {
  try {
    console.log('Starting category seeding...\n');

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const categoryData of categories) {
      try {
        // Check if category already exists
        const existing = await Category.findOne({
          where: { name: categoryData.name },
        });

        if (existing) {
          console.log(`⊘ Skipping "${categoryData.name}" - already exists`);
          skipped++;
          continue;
        }

        // Upload image to Cloudinary if URL provided
        let imageUrl = null;
        let imagePublicId = null;

        if (categoryData.imageUrl) {
          const uploadResult = await uploadImageToCloudinary(
            categoryData.imageUrl,
            categoryData.name,
          );
          imageUrl = uploadResult.imageUrl;
          imagePublicId = uploadResult.imagePublicId;
        }

        // Generate slug
        const slug = categoryData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        // Create category
        await Category.create({
          name: categoryData.name,
          slug,
          description: categoryData.description,
          imageUrl,
          imagePublicId,
          parentId: null,
        });

        console.log(`Created "${categoryData.name}"`);
        created++;
      } catch (error) {
        console.error(`✗ Failed to create "${categoryData.name}":`, error.message);
        failed++;
      }
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Created: ${created} categories`);
    console.log(`Skipped: ${skipped} categories`);
    console.log(`Failed: ${failed} categories`);
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

// Run seeder
seedCategories()
  .then(() => {
    console.log('\nCategory seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Category seeding failed:', error);
    process.exit(1);
  });
