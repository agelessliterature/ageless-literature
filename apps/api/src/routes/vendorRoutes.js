import express from 'express';
import * as vendorController from '../controllers/vendorController.js';
import * as vendorProductsController from '../controllers/vendorProductsController.js';
import * as vendorCollectiblesController from '../controllers/vendorCollectiblesController.js';
import * as vendorOrdersController from '../controllers/vendorOrdersController.js';
import * as vendorReportsController from '../controllers/vendorReportsController.js';
import * as vendorChatController from '../controllers/vendorChatController.js';
import * as vendorRequestsController from '../controllers/vendorRequestsController.js';
import * as vendorSettingsController from '../controllers/vendorSettingsController.js';
import * as vendorWithdrawalController from '../controllers/vendorWithdrawalController.js';
import * as customOffersController from '../controllers/customOffersController.js';
import * as vendorCouponsController from '../controllers/vendorCouponsController.js';
import { verifyToken } from '../controllers/authController.js';
import { vendorAuth } from '../middleware/vendorAuth.js';
import { createVendorImportRouter } from './importRoutes.js';

const router = express.Router();

// Public/pre-vendor routes (authenticated users, but don't require vendor status)
// These routes are for checking vendor status and applying to become a vendor
router.get('/status', verifyToken, vendorController.getVendorStatus);
router.post('/apply', verifyToken, vendorController.applyAsVendor);

// All routes below require approved/active vendor status
// Profile & Dashboard
router.get('/profile', vendorAuth, vendorController.getVendorProfile);
router.patch('/profile', vendorAuth, vendorController.updateVendorProfile);
router.get('/earnings', vendorAuth, vendorController.getVendorEarnings);
router.get('/payouts', vendorAuth, vendorController.getVendorPayouts);
router.get('/inventory', vendorAuth, vendorController.getVendorInventory);
router.get('/dashboard', vendorAuth, vendorController.getVendorDashboard);
router.get('/payout-settings', vendorAuth, vendorController.getPayoutSettings);
router.patch('/payout-method', vendorAuth, vendorController.updatePayoutMethod);
router.patch('/paypal-email', vendorAuth, vendorController.updatePayPalEmail);
router.post('/withdraw', vendorAuth, vendorWithdrawalController.requestWithdrawal);
router.get('/withdrawals', vendorAuth, vendorWithdrawalController.getWithdrawals);
router.get('/withdrawals/:id', vendorAuth, vendorWithdrawalController.getWithdrawalById);
router.post('/withdrawals/:id/cancel', vendorAuth, vendorWithdrawalController.cancelWithdrawal);

// Products Management
router.get('/products', vendorAuth, vendorProductsController.getVendorProducts);
router.get('/products/:id', vendorAuth, vendorProductsController.getVendorProduct);
router.post('/products', vendorAuth, vendorProductsController.createProduct);
router.put('/products/:id', vendorAuth, vendorProductsController.updateProduct);
router.delete('/products/:id', vendorAuth, vendorProductsController.deleteProduct);
router.patch('/products/:id/status', vendorAuth, vendorProductsController.updateProductStatus);
router.patch('/products/:id/quantity', vendorAuth, vendorProductsController.updateProductQuantity);
router.post('/products/:id/relist', vendorAuth, vendorProductsController.relistProduct);

// Collectibles Management
router.get('/collectibles', vendorAuth, vendorCollectiblesController.getVendorCollectibles);
router.get('/collectibles/stats', vendorAuth, vendorCollectiblesController.getCollectibleStats);
router.get('/collectibles/:id', vendorAuth, vendorCollectiblesController.getVendorCollectible);
router.post('/collectibles', vendorAuth, vendorCollectiblesController.createCollectible);
router.put('/collectibles/:id', vendorAuth, vendorCollectiblesController.updateCollectible);
router.delete('/collectibles/:id', vendorAuth, vendorCollectiblesController.deleteCollectible);
router.patch(
  '/collectibles/:id/status',
  vendorAuth,
  vendorCollectiblesController.updateCollectibleStatus,
);

// Orders Management
router.get('/orders', vendorAuth, vendorOrdersController.getVendorOrders);
router.get('/orders/:id', vendorAuth, vendorOrdersController.getVendorOrderDetail);
router.put('/orders/:id/status', vendorAuth, vendorOrdersController.updateOrderStatus);
router.put('/orders/:id/tracking', vendorAuth, vendorOrdersController.updateTrackingInfo);
router.post('/orders/:id/refund-request', vendorAuth, vendorOrdersController.requestRefund);

// Reports & Analytics
router.get('/reports/summary', vendorAuth, vendorReportsController.getSummary);
router.get('/reports/overview', vendorAuth, vendorReportsController.getReportsOverview); // Aggregated endpoint
router.get('/reports/charts', vendorAuth, vendorReportsController.getChartData);
router.get('/reports/products', vendorAuth, vendorReportsController.getProductPerformance);
router.get('/reports/revenue', vendorAuth, vendorReportsController.getRevenueBreakdown);

// Chat/Messaging
router.get('/chat/conversations', vendorAuth, vendorChatController.getConversations);
router.get('/chat/messages/:conversationId', vendorAuth, vendorChatController.getMessages);
router.post('/chat/messages', vendorAuth, vendorChatController.sendMessage);
router.patch('/chat/conversations/:id/read', vendorAuth, vendorChatController.markAsRead);

// Customer Requests
router.get('/requests', vendorAuth, vendorRequestsController.getRequests);
router.get('/requests/:id', vendorAuth, vendorRequestsController.getRequestDetail);
router.post('/requests/:id/respond', vendorAuth, vendorRequestsController.respondToRequest);

// Settings
router.get('/settings', vendorAuth, vendorSettingsController.getSettings);
router.put('/settings', vendorAuth, vendorSettingsController.updateSettings);
router.put('/settings/payout', vendorAuth, vendorSettingsController.updatePayoutSettings);

// CSV Import
router.use('/imports/books', vendorAuth, createVendorImportRouter());

// Custom Offers
router.get('/offers', vendorAuth, customOffersController.getVendorOffers);
router.get('/offers/search-users', vendorAuth, customOffersController.searchUsers);
router.post('/offers', vendorAuth, customOffersController.createOffer);
router.post('/offers/:id/respond', vendorAuth, customOffersController.vendorRespondToOffer);
router.delete('/offers/:id', vendorAuth, customOffersController.cancelOffer);

// Coupons
router.get('/coupons', vendorAuth, vendorCouponsController.getVendorCoupons);
router.get('/coupons/:id', vendorAuth, vendorCouponsController.getVendorCoupon);
router.post('/coupons', vendorAuth, vendorCouponsController.createVendorCoupon);
router.put('/coupons/:id', vendorAuth, vendorCouponsController.updateVendorCoupon);
router.delete('/coupons/:id', vendorAuth, vendorCouponsController.deleteVendorCoupon);

export default router;
