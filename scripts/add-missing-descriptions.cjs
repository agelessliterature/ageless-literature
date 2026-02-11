const { execSync } = require('child_process');

function executeDevQuery(sql) {
  try {
    const escaped = sql.replace(/"/g, '\\"').replace(/'/g, "'\\''");
    const cmd = `ssh -i ~/.ssh/dev-VM-key.pem AgelessLiteratureDev@20.118.237.147 'docker exec ageless-dev-postgres psql -U postgres -d ageless_literature_dev -t -A -c "${escaped}"'`;
    const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Add descriptions for the 11 books that are missing them
const descriptions = {
  12925: "A beautifully preserved German Prayer Book. Features traditional prayers in Gothic script. A remarkable example of German religious printing.",
  12947: "Charles Darwin's groundbreaking work 'The Expression of Emotions in Man & Animals' from 1872. A foundational text in evolutionary psychology and behavioral biology.",
  12952: "Signed first edition of 'The Thomas Berryman Number' by James Patterson. His debut novel that won the Edgar Award. A rare collectible with author's signature.",
  12955: "The Military Maxims of Napoleon. Essential military strategy and tactics from one of history's greatest commanders. A classic text for military historians and strategists.",
  11242: "VONNEGUT, Kurt 'Slaughterhouse-Five' [Delacorte Press, 1969] First Edition. A masterpiece of American literature. Vonnegut's anti-war novel about Billy Pilgrim's experience in World War II.",
  11458: "ROWLING, J.K. 'Harry Potter and the Sorcerer's Stone' [Arthur A. Levine, 1998] First Printing. The book that launched the phenomenal Harry Potter series. Highly collectible first American edition.",
  12966: "Hemingway's Typescript Address to Congress. A rare and important historical document featuring original typescript by Ernest Hemingway. Significant piece of literary history.",
  11719: "BUDGE, E.A. Wallis 'The Book of the Dead' [Kegan Paul, Trench, Trubner & Co, 1910]. Classic translation and study of ancient Egyptian funerary texts. Essential reference for Egyptology.",
  12975: "Ovid's Metamorphoses, 3 Volumes in 1, 1812. Complete collection of Ovid's transformative tales from Classical mythology. Beautifully bound historical edition.",
  12087: "AUSTEN, Jane 'Pride and Prejudice' [Richard Bentley, 1833] First Single Volume Edition. Important early edition of Austen's beloved classic. Previously published in multiple volumes, this marks the first single-volume format.",
  12983: "Rare collectible book. Contact us for detailed information about this exceptional piece."
};

console.log('📚 Adding descriptions to books in dev database...\n');

let updatedCount = 0;

for (const [id, description] of Object.entries(descriptions)) {
  try {
    const jsonObj = { en: description };
    const jsonStr = JSON.stringify(jsonObj);
    const escapedForSql = jsonStr.replace(/'/g, "''");
    
    const sql = `UPDATE books SET description = '${escapedForSql}'::jsonb WHERE id = ${id};`;
    executeDevQuery(sql);
    
    console.log(`✅ Updated book ${id}`);
    updatedCount++;
  } catch (error) {
    console.error(`❌ Failed to update book ${id}:`, error.message.substring(0, 100));
  }
}

console.log(`\n🎉 Complete! Updated ${updatedCount} books.`);
