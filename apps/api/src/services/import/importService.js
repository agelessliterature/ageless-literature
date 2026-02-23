/**
 * Import Service
 * Core logic for CSV bulk import: parse, auto-map, validate, stage, commit
 */

import { parse } from 'csv-parse';
import { Readable } from 'stream';
import {
  generateImportId,
  stageImport,
  getStagedImport,
  storeImportResult,
} from './stagingStore.js';

// ─── TARGET FIELD DEFINITIONS ───
export const TARGET_FIELDS = [
  { key: 'title', label: 'Title', required: true, type: 'string' },
  { key: 'author', label: 'Author', required: false, type: 'string' },
  { key: 'isbn', label: 'ISBN', required: false, type: 'string' },
  { key: 'description', label: 'Description', required: false, type: 'text' },
  { key: 'shortDescription', label: 'Short Description', required: false, type: 'text' },
  { key: 'price', label: 'Price', required: true, type: 'number' },
  {
    key: 'quantity',
    label: 'Quantity',
    required: false,
    type: 'number',
    default: 1,
  },
  {
    key: 'condition',
    label: 'Condition',
    required: false,
    type: 'enum',
    options: ['new', 'like-new', 'very-good', 'good', 'acceptable', 'fair', 'poor'],
  },
  { key: 'category', label: 'Category', required: false, type: 'string' },
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'enum',
    options: ['draft', 'pending', 'published', 'sold', 'archived'],
    default: 'draft',
  },
  { key: 'sku', label: 'SKU', required: false, type: 'string' },
  { key: 'images', label: 'Images (URLs)', required: false, type: 'images' },
  { key: 'publisher', label: 'Publisher', required: false, type: 'string' },
  { key: 'publicationYear', label: 'Publication Year', required: false, type: 'number' },
  { key: 'edition', label: 'Edition', required: false, type: 'string' },
  { key: 'language', label: 'Language', required: false, type: 'string', default: 'English' },
  { key: 'binding', label: 'Binding', required: false, type: 'string' },
  { key: 'isSigned', label: 'Signed', required: false, type: 'boolean' },
  { key: 'weight', label: 'Weight', required: false, type: 'number' },
  { key: 'wpPostId', label: 'WP Post ID', required: false, type: 'number' },
  { key: 'sid', label: 'SID (Internal ID)', required: false, type: 'string' },
  { key: 'keywords', label: 'Keywords/Tags', required: false, type: 'string' },
];

// ─── COLUMN AUTO-MAPPING ───
const COLUMN_ALIAS_MAP = {
  title: ['title', 'name', 'product_name', 'book_title', 'item_name', 'product_title'],
  author: ['author', 'authors', 'writer', 'by', 'creator'],
  isbn: ['isbn', 'isbn10', 'isbn_10', 'isbn13', 'isbn_13'],
  description: [
    'description',
    'desc',
    'details',
    'full_description',
    'long_description',
    'product_description',
    'annotation',
  ],
  shortDescription: ['short_description', 'short_desc', 'summary', 'brief', 'subtitle', 'excerpt'],
  price: ['price', 'retail_price', 'list_price', 'sale_price', 'amount', 'unit_price'],
  quantity: ['quantity', 'qty', 'stock', 'inventory', 'stock_quantity', 'in_stock', 'volumes'],
  condition: ['condition', 'item_condition', 'book_condition', 'state', 'cond', 'jacket_cond'],
  category: ['category', 'categories', 'genre', 'keywords', 'tags', 'lists', 'subject'],
  status: ['status', 'availability', 'listing_status'],
  sku: ['sku', 'product_code', 'item_number', 'code', 'barcode', 'book_id'],
  images: [
    'images',
    'image',
    'image_url',
    'image_urls',
    'photo',
    'photos',
    'picture',
    'pictures',
    'thumbnail',
  ],
  publisher: ['publisher', 'pub', 'publishing_house', 'imprint', 'place_pub'],
  publicationYear: [
    'publication_year',
    'year',
    'pub_year',
    'date_pub',
    'year_published',
    'date_published',
    'pub_date',
  ],
  edition: ['edition', 'ed', 'printing'],
  language: ['language', 'lang', 'languages'],
  binding: ['binding', 'binding_type', 'format', 'cover_type', 'book_format'],
  isSigned: ['signed', 'is_signed', 'autographed', 'signed_text'],
  weight: ['weight', 'shipping_weight', 'item_weight'],
  wpPostId: ['wp_post_id', 'wordpress_id', 'post_id'],
  sid: ['sid', 'internal_id', 'external_id', 'ref'],
  keywords: ['keywords', 'tags', 'keyword', 'search_terms'],
};

/**
 * Auto-detect column mappings from CSV headers
 * Returns { csvColumn: targetField } map
 */
export function autoDetectMappings(csvColumns) {
  const mappings = {};
  const usedTargets = new Set();

  for (const col of csvColumns) {
    const normalizedCol = col
      .toLowerCase()
      .replace(/[\s\-.]+/g, '_')
      .trim();

    let bestMatch = null;
    let bestScore = 0;

    for (const [targetKey, aliases] of Object.entries(COLUMN_ALIAS_MAP)) {
      if (usedTargets.has(targetKey)) continue;

      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/[\s\-.]+/g, '_');

        // Exact match
        if (normalizedCol === normalizedAlias) {
          bestMatch = targetKey;
          bestScore = 100;
          break;
        }

        // Contains match
        if (normalizedCol.includes(normalizedAlias) || normalizedAlias.includes(normalizedCol)) {
          const score = 50 + (normalizedAlias.length / normalizedCol.length) * 30;
          if (score > bestScore) {
            bestMatch = targetKey;
            bestScore = score;
          }
        }
      }
      if (bestScore === 100) break;
    }

    if (bestMatch && bestScore >= 40) {
      mappings[col] = bestMatch;
      usedTargets.add(bestMatch);
    } else {
      mappings[col] = null; // unmapped (ignore)
    }
  }

  return mappings;
}

/**
 * Parse CSV buffer/string into rows using streaming
 */
export function parseCSV(csvContent, options = {}) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;
    const maxRows = options.maxRows || 5000;
    let rowCount = 0;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
      bom: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        if (rowCount === 0) {
          headers = Object.keys(record);
        }
        if (rowCount < maxRows) {
          rows.push(record);
        }
        rowCount++;
      }
    });

    parser.on('error', (err) => reject(err));
    parser.on('end', () => resolve({ headers, rows, totalParsed: rowCount }));

    const stream =
      typeof csvContent === 'string'
        ? Readable.from([csvContent])
        : Readable.from([csvContent.toString('utf-8')]);

    stream.pipe(parser);
  });
}

/**
 * Normalize a single row value based on target field type
 */
function normalizeValue(value, fieldDef) {
  if (value === undefined || value === null || value === '') {
    return fieldDef.default !== undefined ? fieldDef.default : null;
  }

  const str = String(value).trim();
  if (!str) return fieldDef.default !== undefined ? fieldDef.default : null;

  switch (fieldDef.type) {
    case 'number': {
      // Extract year from date strings like "C 1913" or "1840"
      if (fieldDef.key === 'publicationYear') {
        const yearMatch = str.match(/\b(\d{4})\b/);
        if (yearMatch) return parseInt(yearMatch[1]);
        return null;
      }
      const num = parseFloat(str.replace(/[,$]/g, ''));
      return isNaN(num) ? null : num;
    }
    case 'boolean': {
      const lower = str.toLowerCase();
      return ['y', 'yes', 'true', '1', 'signed'].includes(lower);
    }
    case 'enum': {
      const statusMap = {
        'for sale': 'published',
        active: 'published',
        published: 'published',
        draft: 'draft',
        sold: 'sold',
        archived: 'archived',
        pending: 'pending',
      };
      if (fieldDef.key === 'status') {
        return statusMap[str.toLowerCase()] || fieldDef.default || null;
      }
      const lower = str.toLowerCase().replace(/[\s_]+/g, '-');
      if (fieldDef.options && fieldDef.options.includes(lower)) return lower;
      return fieldDef.default || null;
    }
    case 'images': {
      return str
        .split(/\s*\|\s*|\s*,\s*/)
        .map((u) => u.trim())
        .filter((u) => u && (u.startsWith('http') || u.startsWith('/')));
    }
    case 'text':
    case 'string':
    default:
      return str;
  }
}

/**
 * Apply mappings to raw CSV rows, normalizing values
 */
export function applyMappings(rows, mappings) {
  const fieldMap = {};
  for (const tf of TARGET_FIELDS) {
    fieldMap[tf.key] = tf;
  }

  return rows.map((row, index) => {
    const normalized = { _rowIndex: index + 1 };

    for (const [csvCol, targetKey] of Object.entries(mappings)) {
      if (!targetKey || targetKey === '__ignore__') continue;
      const fieldDef = fieldMap[targetKey];
      if (!fieldDef) continue;
      normalized[targetKey] = normalizeValue(row[csvCol], fieldDef);
    }

    // Apply defaults for missing fields
    for (const tf of TARGET_FIELDS) {
      if (normalized[tf.key] === undefined && tf.default !== undefined) {
        normalized[tf.key] = tf.default;
      }
    }

    return normalized;
  });
}

/**
 * Validate normalized rows
 * Returns { validRows, invalidRows, errors }
 */
export function validateRows(normalizedRows) {
  const validRows = [];
  const invalidRows = [];
  const errors = [];

  for (const row of normalizedRows) {
    const rowErrors = [];

    if (!row.title || !String(row.title).trim()) {
      rowErrors.push({ field: 'title', message: 'Title is required' });
    }
    if (row.price === null || row.price === undefined || row.price < 0) {
      rowErrors.push({ field: 'price', message: 'Price must be a valid positive number' });
    }
    if (
      row.quantity !== null &&
      row.quantity !== undefined &&
      (isNaN(row.quantity) || row.quantity < 0)
    ) {
      rowErrors.push({ field: 'quantity', message: 'Quantity must be a non-negative number' });
    }
    if (
      row.publicationYear &&
      (row.publicationYear < 1000 || row.publicationYear > new Date().getFullYear() + 1)
    ) {
      rowErrors.push({
        field: 'publicationYear',
        message: `Publication year must be between 1000 and ${new Date().getFullYear() + 1}`,
      });
    }
    if (row.price !== null && row.price > 999999.99) {
      rowErrors.push({ field: 'price', message: 'Price exceeds maximum allowed value' });
    }
    if (row.title && String(row.title).length > 500) {
      rowErrors.push({ field: 'title', message: 'Title exceeds 500 characters' });
    }

    if (rowErrors.length > 0) {
      invalidRows.push({ ...row, _errors: rowErrors });
      errors.push({ rowIndex: row._rowIndex, errors: rowErrors });
    } else {
      validRows.push(row);
    }
  }

  return { validRows, invalidRows, errors };
}

/**
 * Stage a CSV import: Parse -> auto-map -> validate -> store in staging
 */
export async function stageCSVImport(csvContent, meta = {}) {
  const importId = generateImportId();

  const { headers, rows, totalParsed } = await parseCSV(csvContent);

  if (!headers || headers.length === 0) {
    throw new Error('CSV file has no headers or is empty');
  }
  if (rows.length === 0) {
    throw new Error('CSV file has no data rows');
  }

  const suggestedMappings = autoDetectMappings(headers);
  const normalizedRows = applyMappings(rows, suggestedMappings);
  const { validRows, invalidRows, errors } = validateRows(normalizedRows);

  const stats = {
    totalRows: rows.length,
    totalParsed,
    validRows: validRows.length,
    invalidRows: invalidRows.length,
    truncated: totalParsed > 5000,
  };

  const stagingData = {
    importId,
    csvHeaders: headers,
    suggestedMappings,
    currentMappings: suggestedMappings,
    rawRows: rows,
    normalizedRows: [...validRows, ...invalidRows],
    validationErrors: errors,
    stats,
    meta: {
      ...meta,
      fileName: meta.fileName || 'import.csv',
      uploadedAt: new Date().toISOString(),
    },
    status: 'staged',
  };

  await stageImport(importId, stagingData);

  return {
    importId,
    csvHeaders: headers,
    suggestedMappings,
    stats,
    validationErrors: errors,
    previewRows: [...validRows, ...invalidRows].slice(0, 100),
    targetFields: TARGET_FIELDS,
  };
}

/**
 * Re-map staged import with user-adjusted mappings
 */
export async function remapStagedImport(importId, newMappings) {
  const staging = await getStagedImport(importId);
  if (!staging) throw new Error('Import session not found or expired');

  const normalizedRows = applyMappings(staging.rawRows, newMappings);
  const { validRows, invalidRows, errors } = validateRows(normalizedRows);

  const stats = {
    totalRows: staging.rawRows.length,
    totalParsed: staging.stats.totalParsed,
    validRows: validRows.length,
    invalidRows: invalidRows.length,
    truncated: staging.stats.truncated,
  };

  staging.currentMappings = newMappings;
  staging.normalizedRows = [...validRows, ...invalidRows];
  staging.validationErrors = errors;
  staging.stats = stats;

  await stageImport(importId, staging);

  return {
    importId,
    stats,
    validationErrors: errors,
    previewRows: [...validRows, ...invalidRows].slice(0, 100),
  };
}

/**
 * Get paginated rows from a staged import
 */
export async function getStagedRows(importId, page = 1, limit = 50, filter = 'all') {
  const staging = await getStagedImport(importId);
  if (!staging) throw new Error('Import session not found or expired');

  let rows = staging.normalizedRows;

  if (filter === 'valid') {
    rows = rows.filter((r) => !r._errors || r._errors.length === 0);
  } else if (filter === 'invalid') {
    rows = rows.filter((r) => r._errors && r._errors.length > 0);
  }

  const total = rows.length;
  const offset = (page - 1) * limit;
  const paginatedRows = rows.slice(offset, offset + limit);

  return {
    rows: paginatedRows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Commit staged import to database
 */
export async function commitImport(importId, options, db) {
  const staging = await getStagedImport(importId);
  if (!staging) throw new Error('Import session not found or expired');
  if (staging.status === 'committed') throw new Error('Import has already been committed');

  const {
    mode = 'upsert',
    matchStrategy = 'sku',
    defaultStatus = 'draft',
    vendorId,
    userId,
  } = options;
  const { Book, BookMedia, sequelize } = db;
  const { Op } = await import('sequelize');

  const rows = staging.normalizedRows.filter((r) => !r._errors || r._errors.length === 0);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failures = [];
  const createdIds = [];

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const transaction = await sequelize.transaction();
    try {
      for (const row of batch) {
        try {
          let existing = null;
          if (mode !== 'create' && matchStrategy !== 'none') {
            const where = { vendorId };

            if (matchStrategy === 'isbn' && row.isbn) {
              where.isbn = row.isbn;
            } else if (matchStrategy === 'sku' && row.sku) {
              where.sid = row.sku;
            } else if (matchStrategy === 'title_author') {
              where.title = { [Op.iLike]: row.title };
              where.author = { [Op.iLike]: row.author };
            } else if (matchStrategy === 'wp_post_id' && row.wpPostId) {
              where.wpPostId = row.wpPostId;
            }

            const hasIdentifier =
              where.isbn || where.sid || where.wpPostId || (where.title && where.author);
            if (hasIdentifier) {
              existing = await Book.findOne({ where, transaction });
            }
          }

          const bookData = {
            vendorId,
            title: row.title,
            author: row.author,
            isbn: row.isbn || null,
            description: row.description ? { html: row.description } : null,
            shortDescription: row.shortDescription || null,
            price: row.price,
            quantity: row.quantity || 1,
            condition: row.condition || 'good',
            category: row.category || null,
            status: row.status || defaultStatus,
            language: row.language || 'English',
            views: 0,
          };

          if (row.sku) bookData.sid = row.sku; // book_id from CSV → sid field
          if (row.publisher) bookData.publisher = row.publisher;
          if (row.publicationYear) bookData.publicationYear = row.publicationYear;
          if (row.edition) bookData.edition = row.edition;
          if (row.binding) bookData.binding = row.binding;
          if (row.isSigned !== undefined) bookData.isSigned = row.isSigned;
          if (row.weight) bookData.weight = row.weight;
          if (row.wpPostId) bookData.wpPostId = row.wpPostId;

          if (existing) {
            if (mode === 'create') {
              skippedCount++;
              continue;
            }
            await existing.update(bookData, { transaction });
            updatedCount++;

            if (row.images && row.images.length > 0) {
              await BookMedia.destroy({ where: { bookId: existing.id }, transaction });
              const mediaRecords = row.images.map((url, idx) => ({
                bookId: existing.id,
                imageUrl: url.trim(),
                thumbnailUrl: url.trim(),
                displayOrder: idx,
                isPrimary: idx === 0,
              }));
              await BookMedia.bulkCreate(mediaRecords, { transaction });
            }
          } else {
            if (mode === 'update') {
              skippedCount++;
              continue;
            }
            const newBook = await Book.create(bookData, { transaction });
            createdCount++;
            createdIds.push(newBook.id);

            if (row.images && row.images.length > 0) {
              const mediaRecords = row.images.map((url, idx) => ({
                bookId: newBook.id,
                imageUrl: url.trim(),
                thumbnailUrl: url.trim(),
                displayOrder: idx,
                isPrimary: idx === 0,
              }));
              await BookMedia.bulkCreate(mediaRecords, { transaction });
            }
          }
        } catch (rowError) {
          failedCount++;
          failures.push({
            rowIndex: row._rowIndex,
            title: row.title,
            error: rowError.message,
          });
        }
      }
      await transaction.commit();
    } catch (batchError) {
      await transaction.rollback();
      for (const row of batch) {
        failedCount++;
        failures.push({
          rowIndex: row._rowIndex,
          title: row.title,
          error: `Batch error: ${batchError.message}`,
        });
      }
    }
  }

  const result = {
    importId,
    status: 'completed',
    createdCount,
    updatedCount,
    skippedCount,
    failedCount,
    totalProcessed: createdCount + updatedCount + skippedCount + failedCount,
    failures,
    createdIds,
    completedAt: new Date().toISOString(),
    meta: {
      ...staging.meta,
      userId,
      vendorId,
      mode,
      matchStrategy,
      defaultStatus,
    },
  };

  await storeImportResult(importId, result);

  staging.status = 'committed';
  await stageImport(importId, staging);

  return result;
}

/**
 * Generate error CSV content from validation errors
 */
export function generateErrorCSV(normalizedRows) {
  const invalidRows = normalizedRows.filter((r) => r._errors && r._errors.length > 0);
  if (invalidRows.length === 0) return '';

  const fields = Object.keys(invalidRows[0]).filter((k) => !k.startsWith('_'));
  const headers = [...fields, 'errors'];

  let csv = headers.join(',') + '\n';
  for (const row of invalidRows) {
    const values = fields.map((f) => {
      const val = row[f];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    const errorStr = (row._errors || []).map((e) => `${e.field}: ${e.message}`).join('; ');
    values.push(`"${errorStr.replace(/"/g, '""')}"`);
    csv += values.join(',') + '\n';
  }

  return csv;
}
