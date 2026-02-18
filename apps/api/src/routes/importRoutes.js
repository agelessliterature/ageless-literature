/**
 * Import Routes
 * Configures multer for CSV upload and mounts import endpoints
 */

import express from 'express';
import multer from 'multer';
import * as importController from '../controllers/importController.js';

// Configure multer for CSV upload (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/csv'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

/** Vendor import router */
export function createVendorImportRouter() {
  const router = express.Router();
  router.get('/target-fields', importController.getTargetFields);
  router.post('/stage', upload.single('file'), importController.vendorStageImport);
  router.post('/remap', importController.remapImport);
  router.post('/commit', importController.vendorCommitImport);
  router.get('/:importId/status', importController.getImportStatus);
  router.get('/:importId/rows', importController.getRows);
  router.get('/:importId/errors-csv', importController.downloadErrorCSV);
  router.put('/:importId/rows/:rowIndex', importController.updateStagedRow);
  return router;
}

/** Admin import router */
export function createAdminImportRouter() {
  const router = express.Router();
  router.get('/target-fields', importController.getTargetFields);
  router.post('/stage', upload.single('file'), importController.adminStageImport);
  router.post('/remap', importController.remapImport);
  router.post('/commit', importController.adminCommitImport);
  router.get('/:importId/status', importController.getImportStatus);
  router.get('/:importId/rows', importController.getRows);
  router.get('/:importId/errors-csv', importController.downloadErrorCSV);
  router.put('/:importId/rows/:rowIndex', importController.updateStagedRow);
  return router;
}
