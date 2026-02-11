import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createPayPalPayout,
  recordManualPayPalPayout,
  checkPayPalPayoutStatus,
} from '../controllers/paypalPayoutController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/paypal/payout/create
 * Create a payout via PayPal Payouts API (requires API configuration)
 * Body: { vendorId, amount, notes }
 */
router.post('/payout/create', createPayPalPayout);

/**
 * POST /api/paypal/payout/manual
 * Manually record a PayPal payout (for when API is not configured)
 * Body: { vendorId, amount, transactionId, notes }
 */
router.post('/payout/manual', recordManualPayPalPayout);

/**
 * GET /api/paypal/payout/status/:batchId
 * Check the status of a PayPal payout batch
 */
router.get('/payout/status/:batchId', checkPayPalPayoutStatus);

export default router;
