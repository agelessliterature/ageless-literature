const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function executeDevQuery(sql) {
  try {
    const escaped = sql.replace(/"/g, '\\"').replace(/'/g, "'\\''");
    const cmd = `ssh -i ~/.ssh/dev-VM-key.pem AgelessLiteratureDev@20.118.237.147 'docker exec ageless-dev-postgres psql -U postgres -d ageless_literature_dev -t -A -c "${escaped}"'`;
    const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result;
  } catch (error) {
    console.error('Error executing dev query:', error.message);
    throw error;
  }
}

function executeDevQueryFromFile(sqlFilePath) {
  try {
    // Read the SQL file and pipe it through SSH to psql
    const cmd = `cat "${sqlFilePath}" | ssh -i ~/.ssh/dev-VM-key.pem AgelessLiteratureDev@20.118.237.147 'docker exec -i ageless-dev-postgres psql -U postgres -d ageless_literature_dev'`;
    const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    return result;
  } catch (error) {
    console.error('Error executing dev query from file:', error.stderr || error.message);
    throw error;
  }
}

function executeWPQuery(sql) {
  try {
    // Remove line breaks and extra spaces, escape double quotes
    const cleanSql = sql.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
    const cmd = `ssh -i ~/.ssh/Ageless-Literature-VM_key.pem agelessliterature@4.150.186.139 "mysql -h ageless-literature-wp-db.mysql.database.azure.com -u AgelessLiterature -p'sixqYm-cybpo5-hochuj' ageless_literature_prod_db -s -N -e \\"${cleanSql}\\""`;
    const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 });
    return result;
  } catch (error) {
    console.error('Error executing WP query:', error.message.substring(0, 500));
    throw error;
  }
}

async function syncDescriptions() {
  try {
    // Get books missing descriptions
    console.log('📚 Fetching books without descriptions from dev DB...');
    const result = executeDevQuery(`
      SELECT id || '|' || wp_post_id 
      FROM books 
      WHERE (description IS NULL OR description::text = '{}' OR description::text = 'null')
        AND wp_post_id IS NOT NULL
    `);
    
    const books = result.trim().split('\n').filter(line => line && line !== '(0 rows)').map(line => {
      const [id, wp_post_id] = line.split('|');
      return { id: parseInt(id), wp_post_id: parseInt(wp_post_id) };
    });
    
    console.log(`Found ${books.length} books missing descriptions\n`);
    
    if (books.length === 0) {
      console.log('✅ No books need updating!');
      return;
    }
    
    // Get all descriptions from WordPress in one query
    console.log('🔍 Fetching descriptions from WordPress...');
    const wpPostIds = books.map(b => b.wp_post_id).join(',');
    const wpResult = executeWPQuery(`SELECT ID, post_content FROM wp_posts WHERE ID IN (${wpPostIds}) AND post_type = 'product'`);
    
    // Parse WordPress results
    const wpDescriptions = {};
    const lines = wpResult.trim().split('\n').filter(line => line);
    for (const line of lines) {
      const tabIndex = line.indexOf('\t');
      if (tabIndex > 0) {
        const id = parseInt(line.substring(0, tabIndex));
        const content = line.substring(tabIndex + 1).trim();
        if (content) {
          wpDescriptions[id] = content;
        }
      }
    }
    
    console.log(`Found ${Object.keys(wpDescriptions).length} descriptions in WordPress\n`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
   
    // Create SQL file with all updates
    console.log('📝 Generating SQL update statements...');
    const tempSqlFile = path.join(process.cwd(), 'temp-sync-descriptions.sql');
    let sqlStatements = [];
    
    for (const book of books) {
      try {
        const description = wpDescriptions[book.wp_post_id];
        
        if (description) {
          // Create JSONB object - JSON.stringify handles all escaping
          const jsonObj = { en: description };
          const jsonStr = JSON.stringify(jsonObj);
          
          // Escape single quotes for SQL (double them)
          const escapedForSql = jsonStr.replace(/'/g, "''");
          
          // Create update statement
          sqlStatements.push(`UPDATE books SET description = '${escapedForSql}'::jsonb WHERE id = ${book.id};`);
          updatedCount++;
        } else {
          notFoundCount++;
        }
      } catch (error) {
        console.error(`Error preparing update for book ${book.id}:`, error.message.substring(0, 150));
        errorCount++;
      }
    }
    
    if (sqlStatements.length === 0) {
      console.log('❌ No updates to perform!');
      return;
    }
    
    // Write SQL to file
    fs.writeFileSync(tempSqlFile, sqlStatements.join('\n'));
    console.log(`📄 Created SQL file with ${sqlStatements.length} updates\n`);
    
    // Execute all updates from file
    console.log('⚡ Executing bulk update...');
    executeDevQueryFromFile(tempSqlFile);
    
    // Clean up temp file
    fs.unlinkSync(tempSqlFile);
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Updated: ${updatedCount} books`);
    console.log(`   Not found in WP: ${notFoundCount} books`);
    console.log(`   Errors: ${errorCount} books`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncDescriptions();
