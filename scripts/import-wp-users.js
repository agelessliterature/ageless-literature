import fs from 'fs';
import db from './apps/api/src/models/index.js';
import bcrypt from 'bcrypt';
import phpSerialize from 'php-serialize';

// Parse WordPress SQL dump more robustly
function parseWordPressUsers(sql) {
  const users = [];

  // Extract just the VALUES portion
  const valuesMatch = sql.match(/VALUES\s+([\s\S]+);$/m);
  if (!valuesMatch) {
    console.error('Could not find VALUES in SQL');
    return users;
  }

  let content = valuesMatch[1];

  // Split by pattern that starts each row: "), ("
  const rows = content.split(/\),[\s\n]+\(/);

  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];

    // Clean up leading/trailing parens
    row = row.replace(/^\(/, '').replace(/\)$/, '');

    try {
      // Extract ID first (before first comma)
      const idMatch = row.match(/^(\d+),/);
      if (!idMatch) continue;
      const user_id = idMatch[1];

      // Remove the ID from the string
      const afterId = row.substring(idMatch[0].length);

      // Now parse fields carefully, accounting for NULL values
      // Fields: 'user_login', 'user_email', 'user_registered', 'first_name', 'last_name', 'phone'|NULL, 'store_name', 'dokan_settings', 'enable_selling'|NULL

      const parts = [];
      let current = '';
      let inString = false;
      let i = 0;

      while (i < afterId.length) {
        const char = afterId[i];
        const nextChars = afterId.substring(i, i + 4);

        // Check for NULL
        if (nextChars === 'NULL' && !inString) {
          parts.push(null);
          i += 4;
          // Skip comma and whitespace after NULL
          while (i < afterId.length && (afterId[i] === ',' || afterId[i] === ' ')) i++;
          continue;
        }

        // Handle string start
        if (char === "'" && !inString) {
          inString = true;
          current = '';
          i++;
          continue;
        }

        // Handle string end
        if (char === "'" && inString) {
          // Check if it's escaped
          if (i > 0 && afterId[i - 1] === '\\') {
            current += char;
            i++;
            continue;
          }
          // End of string
          parts.push(current);
          inString = false;
          current = '';
          i++;
          // Skip comma and whitespace after string
          while (i < afterId.length && (afterId[i] === ',' || afterId[i] === ' ')) i++;
          continue;
        }

        // Add character to current string
        if (inString) {
          if (char === '\\' && i + 1 < afterId.length) {
            const nextChar = afterId[i + 1];
            if (nextChar === "'" || nextChar === '\\') {
              current += nextChar;
              i += 2;
              continue;
            }
          }
          current += char;
        }

        i++;
      }

      // Map parts to fields
      if (parts.length >= 7) {
        users.push({
          user_id,
          user_login: parts[0] || null,
          user_email: parts[1] || null,
          user_registered: parts[2] || null,
          first_name: parts[3] || null,
          last_name: parts[4] || null,
          phone: parts[5] || null,
          store_name: parts[6] || null,
          dokan_settings: parts[7] || null,
          enable_selling: parts[8] || null,
        });
      } else {
        console.log(`Skipping row ${user_id}: only ${parts.length} fields found`);
      }
    } catch (err) {
      console.error(`Error parsing row ${i}:`, err.message);
    }
  }

  return users;
}

async function importUsers(sqlFilePath) {
  try {
    console.log('Reading SQL file...');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Parsing WordPress users...');
    const wpUsers = parseWordPressUsers(sql);
    console.log(`Found ${wpUsers.length} WordPress users\n`);

    // Generate default password for all imported users
    const defaultPassword = 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    console.log('Importing users...');
    let imported = 0;
    let skipped = 0;

    for (const wpUser of wpUsers) {
      try {
        if (!wpUser.user_email || !wpUser.user_email.includes('@')) {
          console.log(`- Skipping ID ${wpUser.user_id}: invalid email`);
          skipped++;
          continue;
        }

        // Check if user already exists
        const existing = await db.User.findOne({ where: { email: wpUser.user_email } });
        if (existing) {
          console.log(`- Skipping ${wpUser.user_email} (already exists)`);
          skipped++;
          continue;
        }

        // Parse Dokan settings if available
        let dokanSettings = null;
        if (wpUser.dokan_settings) {
          try {
            dokanSettings = phpSerialize.unserialize(wpUser.dokan_settings);
          } catch (e) {
            console.log(`  Warning: Could not parse dokan settings for ${wpUser.user_email}`);
          }
        }

        const isVendor = wpUser.enable_selling === 'yes';
        const phone = wpUser.phone || (dokanSettings && dokanSettings.phone) || null;
        const cleanPhone = phone ? phone.substring(0, 20) : null; // Truncate to 20 chars

        // Create user
        const user = await db.User.create({
          email: wpUser.user_email,
          hash: hashedPassword,
          firstName: wpUser.first_name || 'Imported',
          lastName: wpUser.last_name || 'User',
          phoneNumber: cleanPhone,
          role: isVendor ? 'vendor' : 'customer',
          provider: 'credentials',
          emailVerified: true,
          status: 'active',
          createdAt: new Date(wpUser.user_registered),
          updatedAt: new Date(),
        });

        // If vendor, create vendor profile
        if (isVendor && wpUser.store_name) {
          // Generate URL-friendly shop name
          let shopUrl = wpUser.store_name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100); // Truncate to 100 chars

          if (!shopUrl || shopUrl.length < 3) {
            shopUrl = `vendor-${user.id}`;
          }

          // Make sure shopUrl is unique
          const existingVendor = await db.Vendor.findOne({ where: { shopUrl } });
          if (existingVendor) {
            shopUrl = `${shopUrl}-${user.id}`;
          }

          await db.Vendor.create({
            userId: user.id,
            shopName: wpUser.store_name.substring(0, 255), // Truncate store name too
            shopUrl: shopUrl,
            phoneNumber: cleanPhone,
            status: 'active',
            createdAt: new Date(wpUser.user_registered),
            updatedAt: new Date(),
          });
          console.log(
            `✓ Imported vendor: ${wpUser.user_email} (${wpUser.store_name.substring(0, 50)})`,
          );
        } else {
          console.log(`✓ Imported customer: ${wpUser.user_email}`);
        }

        imported++;
      } catch (error) {
        console.error(`✗ Failed to import ${wpUser.user_email}:`, error.message);
      }
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`\nDefault password for all imported users: ${defaultPassword}`);
    console.log('Users should change their password on first login.');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run import
const sqlFile = process.argv[2] || '/Users/jermainewilliams/Downloads/wp_users.sql';
console.log(`Importing from: ${sqlFile}\n`);

importUsers(sqlFile)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
