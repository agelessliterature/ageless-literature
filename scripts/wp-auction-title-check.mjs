// Check if PG books exist with titles similar to the 36 WP auction products
// that had no matching book (they were trashed in WP before book import)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Sequelize } = require('sequelize');

const s = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

// Keywords extracted from the 36 missing WP auction titles
const searches = [
  { wp_post_id: 123637, keywords: 'Landmark in American Art' },
  { wp_post_id: 5421,   keywords: 'Wind Water and Air' },
  { wp_post_id: 8349,   keywords: 'Jungle Tales of Tarzan' },
  { wp_post_id: 4933,   keywords: 'One Arm Tennessee Williams' },
  { wp_post_id: 6834,   keywords: 'Gone With The Wind 1964' },
  { wp_post_id: 123691, keywords: 'Poeticon Astronomicon' },
  { wp_post_id: 123706, keywords: 'Frankenstein Abridged Mary Shelley' },
  { wp_post_id: 117599, keywords: 'Aleister Crowley Jack Parsons' },
  { wp_post_id: 124168, keywords: 'Octopussy Living Daylights Fleming' },
  { wp_post_id: 124228, keywords: 'Dharma Bums Kerouac' },
  { wp_post_id: 124227, keywords: 'Sermon George Washington Hopkins' },
  { wp_post_id: 125261, keywords: 'Pynchon Gravity Rainbow Spanish' },
  { wp_post_id: 125265, keywords: 'Kabumpo in Oz' },
  { wp_post_id: 125266, keywords: 'Ulysses James Joyce 1937' },
  { wp_post_id: 125267, keywords: 'Lord of the Flies Golding' },
  { wp_post_id: 125269, keywords: 'Darwin Journal Second Edition 1845' },
  { wp_post_id: 125271, keywords: 'Mystery of Edwin Drood Dickens' },
  { wp_post_id: 125273, keywords: 'The Stranger Camus American Edition' },
  { wp_post_id: 125274, keywords: 'Book of Lost Tales Tolkien' },
  { wp_post_id: 125961, keywords: 'Gone With The Wind Olivia de Havilland' },
  { wp_post_id: 126176, keywords: 'Superman Andy Warhol' },
  { wp_post_id: 126177, keywords: 'Mickey Mouse Andy Warhol' },
  { wp_post_id: 126179, keywords: 'Expression of Emotions Darwin 1872' },
  { wp_post_id: 126184, keywords: 'Haunted House Virginia Woolf 1943' },
  { wp_post_id: 126186, keywords: 'Proud Highway Hunter Thompson' },
  { wp_post_id: 126187, keywords: 'Lathe of Heaven Ursula Le Guin' },
  { wp_post_id: 126189, keywords: 'Forrest Gump Winston Groom' },
  { wp_post_id: 126190, keywords: 'African Game Trails Roosevelt' },
  { wp_post_id: 127413, keywords: 'Koberger 1492 Preaching' },
  { wp_post_id: 127760, keywords: 'Kabumpo in Oz 1922' },
  { wp_post_id: 133085, keywords: 'George Harrison Cigar Photograph' },
  { wp_post_id: 134175, keywords: 'Fountainhead Ayn Rand First Edition' },
];

const found = [];
const notFound = [];

for (const item of searches) {
  // Use first 3 meaningful words as ILIKE pattern
  const words = item.keywords.split(' ').filter(w => w.length > 2).slice(0, 3);
  const pattern = '%' + words.join('%') + '%';
  const [rows] = await s.query(
    'SELECT id, wp_post_id, title FROM books WHERE title ILIKE $1 LIMIT 5',
    { bind: [pattern] }
  );
  if (rows.length > 0) {
    found.push({ wp_post_id: item.wp_post_id, keywords: item.keywords, matches: rows });
  } else {
    // Try just first 2 words
    const pattern2 = '%' + words.slice(0, 2).join('%') + '%';
    const [rows2] = await s.query(
      'SELECT id, wp_post_id, title FROM books WHERE title ILIKE $1 LIMIT 5',
      { bind: [pattern2] }
    );
    if (rows2.length > 0) {
      found.push({ wp_post_id: item.wp_post_id, keywords: item.keywords, matches: rows2 });
    } else {
      notFound.push(item);
    }
  }
}

await s.close();

console.log('\n=== BOOKS FOUND IN PG (matching by title) ===');
for (const f of found) {
  console.log('\nWP post ' + f.wp_post_id + ' "' + f.keywords + '":');
  for (const m of f.matches) {
    console.log('  PG book id=' + m.id + ' wp_post_id=' + m.wp_post_id + ' "' + m.title + '"');
  }
}

console.log('\n=== NO MATCH IN PG ===');
for (const n of notFound) {
  console.log('  wp_post_id=' + n.wp_post_id + ' "' + n.keywords + '"');
}

console.log('\nSummary: ' + found.length + ' have matching books, ' + notFound.length + ' have nothing');
