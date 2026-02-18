/**
 * Unit tests for CSV Import Service
 * Tests pure functions: autoDetectMappings, parseCSV, applyMappings, validateRows
 *
 * Note: Uses --experimental-vm-modules for ESM support
 */

let autoDetectMappings, parseCSV, applyMappings, validateRows, TARGET_FIELDS;

beforeAll(async () => {
  const mod = await import('../../apps/api/src/services/import/importService.js');
  autoDetectMappings = mod.autoDetectMappings;
  parseCSV = mod.parseCSV;
  applyMappings = mod.applyMappings;
  validateRows = mod.validateRows;
  TARGET_FIELDS = mod.TARGET_FIELDS;
});

// ─── autoDetectMappings ───
describe('autoDetectMappings', () => {
  it('maps exact CSV column names to target fields', () => {
    const headers = ['title', 'author', 'price', 'isbn', 'description'];
    const result = autoDetectMappings(headers);
    expect(result.title).toBe('title');
    expect(result.author).toBe('author');
    expect(result.price).toBe('price');
    expect(result.isbn).toBe('isbn');
    expect(result.description).toBe('description');
  });

  it('maps aliased headers like book_id → sku, date_pub → publicationYear', () => {
    const headers = ['book_id', 'date_pub', 'signed', 'binding_type'];
    const result = autoDetectMappings(headers);
    expect(result.book_id).toBe('sku');
    expect(result.date_pub).toBe('publicationYear');
    expect(result.signed).toBe('isSigned');
    expect(result.binding_type).toBe('binding');
  });

  it('maps headers case-insensitively', () => {
    const headers = ['Title', 'AUTHOR', 'Price'];
    const result = autoDetectMappings(headers);
    expect(result.Title).toBe('title');
    expect(result.AUTHOR).toBe('author');
    expect(result.Price).toBe('price');
  });

  it('sets unrecognized columns to null', () => {
    const headers = ['title', 'xyz_random_col', 'foo_bar'];
    const result = autoDetectMappings(headers);
    expect(result.title).toBe('title');
    expect(result.xyz_random_col).toBeNull();
    expect(result.foo_bar).toBeNull();
  });

  it('does not double-assign the same target field', () => {
    const headers = ['isbn', 'isbn13'];
    const result = autoDetectMappings(headers);
    // First one should get isbn, second should be null or different
    expect(result.isbn).toBe('isbn');
    // isbn13 might map to isbn but it's already taken, so null
    expect(result.isbn13).toBeNull();
  });

  it('handles empty header list', () => {
    const result = autoDetectMappings([]);
    expect(result).toEqual({});
  });
});

// ─── parseCSV ───
describe('parseCSV', () => {
  it('parses a simple CSV string into rows', async () => {
    const csv = 'title,author,price\nMoby Dick,Melville,19.99\n1984,Orwell,14.99';
    const result = await parseCSV(csv);
    expect(result.headers).toEqual(['title', 'author', 'price']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].title).toBe('Moby Dick');
    expect(result.rows[1].author).toBe('Orwell');
    expect(result.totalParsed).toBe(2);
  });

  it('handles CSV with BOM', async () => {
    const csv = '\uFEFFtitle,author,price\nTest Book,Test Author,9.99';
    const result = await parseCSV(csv);
    expect(result.headers).toEqual(['title', 'author', 'price']);
    expect(result.rows[0].title).toBe('Test Book');
  });

  it('trims whitespace from values', async () => {
    const csv = 'title, author , price\n  Moby Dick  , Melville ,  19.99  ';
    const result = await parseCSV(csv);
    expect(result.rows[0].title).toBe('Moby Dick');
    // csv-parse trims column names too, so ' author ' becomes 'author'
    expect(result.rows[0].author).toBe('Melville');
  });

  it('skips empty lines', async () => {
    const csv = 'title,author\nBook1,Author1\n\n\nBook2,Author2';
    const result = await parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });

  it('handles Buffer input', async () => {
    const csv = Buffer.from('title,author\nTest,Auth');
    const result = await parseCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Test');
  });

  it('enforces maxRows limit', async () => {
    const lines = ['title,author'];
    for (let i = 0; i < 100; i++) lines.push(`Book${i},Author${i}`);
    const csv = lines.join('\n');
    const result = await parseCSV(csv, { maxRows: 10 });
    expect(result.rows).toHaveLength(10);
    expect(result.totalParsed).toBe(100);
  });
});

// ─── applyMappings ───
describe('applyMappings', () => {
  it('maps raw CSV fields to target fields with normalization', () => {
    const rows = [
      { book_title: 'Moby Dick', writer: 'Melville', retail_price: '24.99', date_pub: 'C 1851' },
    ];
    const mappings = {
      book_title: 'title',
      writer: 'author',
      retail_price: 'price',
      date_pub: 'publicationYear',
    };
    const result = applyMappings(rows, mappings);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Moby Dick');
    expect(result[0].author).toBe('Melville');
    expect(result[0].price).toBe(24.99);
    expect(result[0].publicationYear).toBe(1851);
    expect(result[0]._rowIndex).toBe(1);
  });

  it('normalizes boolean fields (y/n/yes/true)', () => {
    const rows = [
      { title: 'A', author: 'B', price: '10', signed: 'y' },
      { title: 'C', author: 'D', price: '20', signed: 'N' },
      { title: 'E', author: 'F', price: '30', signed: 'Yes' },
    ];
    const mappings = { title: 'title', author: 'author', price: 'price', signed: 'isSigned' };
    const result = applyMappings(rows, mappings);
    expect(result[0].isSigned).toBe(true);
    expect(result[1].isSigned).toBe(false);
    expect(result[2].isSigned).toBe(true);
  });

  it('normalizes status field ("For Sale" → "published")', () => {
    const rows = [{ title: 'A', author: 'B', price: '10', status: 'For Sale' }];
    const mappings = { title: 'title', author: 'author', price: 'price', status: 'status' };
    const result = applyMappings(rows, mappings);
    expect(result[0].status).toBe('published');
  });

  it('parses pipe-delimited image URLs', () => {
    const rows = [
      {
        title: 'A',
        author: 'B',
        price: '10',
        images: 'https://img.com/a.jpg|https://img.com/b.jpg',
      },
    ];
    const mappings = { title: 'title', author: 'author', price: 'price', images: 'images' };
    const result = applyMappings(rows, mappings);
    expect(result[0].images).toEqual(['https://img.com/a.jpg', 'https://img.com/b.jpg']);
  });

  it('applies default values for missing fields', () => {
    const rows = [{ title: 'A', author: 'B', price: '10' }];
    const mappings = { title: 'title', author: 'author', price: 'price' };
    const result = applyMappings(rows, mappings);
    // quantity defaults to 1, language to English, status to draft
    expect(result[0].quantity).toBe(1);
    expect(result[0].language).toBe('English');
    expect(result[0].status).toBe('draft');
  });

  it('ignores columns mapped to null or __ignore__', () => {
    const rows = [{ title: 'A', author: 'B', price: '10', garbage: 'stuff' }];
    const mappings = { title: 'title', author: 'author', price: 'price', garbage: null };
    const result = applyMappings(rows, mappings);
    expect(result[0]).not.toHaveProperty('garbage');
  });

  it('strips $ and commas from price', () => {
    const rows = [{ title: 'A', author: 'B', price: '$1,250.00' }];
    const mappings = { title: 'title', author: 'author', price: 'price' };
    const result = applyMappings(rows, mappings);
    expect(result[0].price).toBe(1250.0);
  });

  it('extracts year from date strings like "C 1913"', () => {
    const rows = [{ title: 'A', author: 'B', price: '10', year: 'C 1913' }];
    const mappings = { title: 'title', author: 'author', price: 'price', year: 'publicationYear' };
    const result = applyMappings(rows, mappings);
    expect(result[0].publicationYear).toBe(1913);
  });
});

// ─── validateRows ───
describe('validateRows', () => {
  it('passes valid rows through', () => {
    const rows = [
      { _rowIndex: 1, title: 'Moby Dick', author: 'Melville', price: 19.99 },
      { _rowIndex: 2, title: '1984', author: 'Orwell', price: 14.99 },
    ];
    const result = validateRows(rows);
    expect(result.validRows).toHaveLength(2);
    expect(result.invalidRows).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects rows missing title', () => {
    const rows = [{ _rowIndex: 1, title: '', author: 'Author', price: 10 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors[0].field).toBe('title');
  });

  it('rejects rows missing author', () => {
    const rows = [{ _rowIndex: 1, title: 'Book', author: null, price: 10 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors[0].field).toBe('author');
  });

  it('rejects rows with negative price', () => {
    const rows = [{ _rowIndex: 1, title: 'Book', author: 'Auth', price: -5 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors[0].field).toBe('price');
  });

  it('rejects rows with null price', () => {
    const rows = [{ _rowIndex: 1, title: 'Book', author: 'Auth', price: null }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'price' })]),
    );
  });

  it('rejects rows with invalid publication year', () => {
    const rows = [{ _rowIndex: 1, title: 'Book', author: 'Auth', price: 10, publicationYear: 500 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors[0].field).toBe('publicationYear');
  });

  it('allows publication year = null (optional field)', () => {
    const rows = [
      { _rowIndex: 1, title: 'Book', author: 'Auth', price: 10, publicationYear: null },
    ];
    const result = validateRows(rows);
    expect(result.validRows).toHaveLength(1);
  });

  it('rejects price above max (999999.99)', () => {
    const rows = [{ _rowIndex: 1, title: 'Book', author: 'Auth', price: 1000000 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'price' })]),
    );
  });

  it('rejects title longer than 500 chars', () => {
    const rows = [{ _rowIndex: 1, title: 'A'.repeat(501), author: 'Auth', price: 10 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors[0].errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
    );
  });

  it('accumulates multiple errors for one row', () => {
    const rows = [{ _rowIndex: 1, title: '', author: '', price: -1, publicationYear: 50 }];
    const result = validateRows(rows);
    expect(result.invalidRows).toHaveLength(1);
    // Should have errors for title, author, price, publicationYear
    expect(result.errors[0].errors.length).toBeGreaterThanOrEqual(3);
  });

  it('handles mixed valid and invalid rows', () => {
    const rows = [
      { _rowIndex: 1, title: 'Good Book', author: 'Good Author', price: 29.99 },
      { _rowIndex: 2, title: '', author: 'Author', price: 10 },
      { _rowIndex: 3, title: 'Another Good', author: 'Auth2', price: 15.0 },
    ];
    const result = validateRows(rows);
    expect(result.validRows).toHaveLength(2);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rowIndex).toBe(2);
  });
});

// ─── TARGET_FIELDS ───
describe('TARGET_FIELDS', () => {
  it('has required fields: title, author, price', () => {
    const required = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);
    expect(required).toContain('title');
    expect(required).toContain('author');
    expect(required).toContain('price');
  });

  it('has at least 15 target fields defined', () => {
    expect(TARGET_FIELDS.length).toBeGreaterThanOrEqual(15);
  });
});
