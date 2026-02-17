import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import * as stripeConnectController from '../controllers/stripeConnectController.js';
import * as stripePaymentMethodsController from '../controllers/stripePaymentMethodsController.js';

const router = express.Router();

router.use(authenticateToken);
router.post('/connect/create', stripeConnectController.createConnectAccount);
router.post('/connect/onboard', stripeConnectController.getOnboardingLink);
router.get('/connect/status', stripeConnectController.getAccountStatus);
router.post('/connect/login', stripeConnectController.getLoginLink);

// Admin only - trigger payout
router.post('/connect/payout', adminAuth, stripeConnectController.createStripePayout);

// User payment methods routes
router.get('/payment-methods', stripePaymentMethodsController.getPaymentMethods);
router.post('/payment-methods', stripePaymentMethodsController.addPaymentMethod);
router.delete(
  '/payment-methods/:paymentMethodId',
  stripePaymentMethodsController.deletePaymentMethod,
);
router.post('/set-default-payment', stripePaymentMethodsController.setDefaultPaymentMethod);

export default router;
