/**
 * Import Controller
 * HTTP endpoints for CSV bulk import (books/products)
 */

import {
  stageCSVImport,
  remapStagedImport,
  getStagedRows,
  commitImport,
  generateErrorCSV,
  TARGET_FIELDS,
} from '../services/import/importService.js';
import { getStagedImport, getImportResult, stageImport } from '../services/import/stagingStore.js';
import db from '../models/index.js';

/** Stage CSV Import (Vendor) */
export const vendorStageImport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const vendor = await db.Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile not found' });
    }

    if (!req.file && !req.body.csvContent) {
      return res.status(400).json({ success: false, message: 'CSV file is required' });
    }

    const csvContent = req.file ? req.file.buffer.toString('utf-8') : req.body.csvContent;
    const result = await stageCSVImport(csvContent, {
      fileName: req.file?.originalname || 'import.csv',
      vendorId: vendor.id,
      userId,
      role: 'vendor',
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Import] Stage error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to stage CSV import',
    });
  }
};

/** Stage CSV Import (Admin) */
export const adminStageImport = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!req.file && !req.body.csvContent) {
      return res.status(400).json({ success: false, message: 'CSV file is required' });
    }

    const csvContent = req.file ? req.file.buffer.toString('utf-8') : req.body.csvContent;
    const vendorId = req.body.vendorId ? parseInt(req.body.vendorId) : null;

    const result = await stageCSVImport(csvContent, {
      fileName: req.file?.originalname || 'import.csv',
      vendorId,
      userId,
      role: 'admin',
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Import] Admin stage error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to stage CSV import',
    });
  }
};

/** Re-map columns */
export const remapImport = async (req, res) => {
  try {
    const { importId, mappings } = req.body;
    if (!importId || !mappings) {
      return res
        .status(400)
        .json({ success: false, message: 'importId and mappings are required' });
    }

    const staging = await getStagedImport(importId);
    if (!staging) {
      return res
        .status(404)
        .json({ success: false, message: 'Import session not found or expired' });
    }

    const result = await remapStagedImport(importId, mappings);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Import] Remap error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/** Get paginated rows from staged import */
export const getRows = async (req, res) => {
  try {
    const { importId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filter = req.query.filter || 'all';

    const result = await getStagedRows(importId, page, limit, filter);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

/** Get import status */
export const getImportStatus = async (req, res) => {
  try {
    const { importId } = req.params;

    const staging = await getStagedImport(importId);
    if (staging) {
      return res.json({
        success: true,
        data: {
          importId,
          status: staging.status,
          stats: staging.stats,
          meta: staging.meta,
        },
      });
    }

    const result = await getImportResult(importId);
    if (result) {
      return res.json({ success: true, data: result });
    }

    return res.status(404).json({ success: false, message: 'Import not found' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Commit staged import (Vendor) */
export const vendorCommitImport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { importId, mode = 'upsert', matchStrategy = 'sku', defaultStatus = 'draft' } = req.body;

    if (!importId) {
      return res.status(400).json({ success: false, message: 'importId is required' });
    }

    const vendor = await db.Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(403).json({ success: false, message: 'Vendor profile not found' });
    }

    const staging = await getStagedImport(importId);
    if (!staging) {
      return res
        .status(404)
        .json({ success: false, message: 'Import session not found or expired' });
    }
    if (staging.meta.vendorId !== vendor.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this import' });
    }

    const result = await commitImport(
      importId,
      { mode, matchStrategy, defaultStatus, vendorId: vendor.id, userId },
      db,
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Import] Commit error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/** Commit staged import (Admin) */
export const adminCommitImport = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      importId,
      mode = 'upsert',
      matchStrategy = 'sku',
      defaultStatus = 'draft',
      vendorId,
    } = req.body;

    if (!importId) {
      return res.status(400).json({ success: false, message: 'importId is required' });
    }
    if (!vendorId) {
      return res
        .status(400)
        .json({ success: false, message: 'vendorId is required for admin imports' });
    }

    const result = await commitImport(
      importId,
      { mode, matchStrategy, defaultStatus, vendorId: parseInt(vendorId), userId },
      db,
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Import] Admin commit error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/** Download error CSV */
export const downloadErrorCSV = async (req, res) => {
  try {
    const { importId } = req.params;
    const staging = await getStagedImport(importId);
    if (!staging) {
      return res
        .status(404)
        .json({ success: false, message: 'Import session not found or expired' });
    }

    const csv = generateErrorCSV(staging.normalizedRows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${importId}.csv"`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Get target fields */
export const getTargetFields = (req, res) => {
  return res.json({ success: true, data: TARGET_FIELDS });
};

/** Update a single row in staged import */
export const updateStagedRow = async (req, res) => {
  try {
    const { importId, rowIndex } = req.params;
    const updates = req.body;

    const staging = await getStagedImport(importId);
    if (!staging) {
      return res.status(404).json({ success: false, message: 'Import session not found' });
    }

    const idx = staging.normalizedRows.findIndex((r) => r._rowIndex === parseInt(rowIndex));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Row not found' });
    }

    for (const [field, value] of Object.entries(updates)) {
      if (field.startsWith('_')) continue;
      staging.normalizedRows[idx][field] = value;
    }

    // Re-validate this row
    const row = staging.normalizedRows[idx];
    const rowErrors = [];
    if (!row.title || !String(row.title).trim()) {
      rowErrors.push({ field: 'title', message: 'Title is required' });
    }
    if (row.price === null || row.price === undefined || row.price < 0) {
      rowErrors.push({ field: 'price', message: 'Price must be a valid positive number' });
    }

    staging.normalizedRows[idx]._errors = rowErrors.length > 0 ? rowErrors : undefined;

    const validCount = staging.normalizedRows.filter(
      (r) => !r._errors || r._errors.length === 0,
    ).length;
    staging.stats.validRows = validCount;
    staging.stats.invalidRows = staging.normalizedRows.length - validCount;

    staging.validationErrors = staging.normalizedRows
      .filter((r) => r._errors && r._errors.length > 0)
      .map((r) => ({ rowIndex: r._rowIndex, errors: r._errors }));

    await stageImport(importId, staging);

    return res.json({
      success: true,
      data: { row: staging.normalizedRows[idx], stats: staging.stats },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
