import express from 'express';
import * as accountController from '../controllers/accountController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();
router.post('/update-password', verifyToken, accountController.updatePassword);

// Billing address
router.get('/billing-address', verifyToken, accountController.getBillingAddress);
router.post('/billing-address', verifyToken, accountController.updateBillingAddress);

// Shipping address
router.get('/shipping-address', verifyToken, accountController.getShippingAddress);
router.post('/shipping-address', verifyToken, accountController.updateShippingAddress);

export default router;
