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
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();
const authMiddleware = verifyToken;

router.get('/status', authMiddleware, vendorController.getVendorStatus);
router.post('/apply', authMiddleware, vendorController.applyAsVendor);
router.get('/profile', authMiddleware, vendorController.getVendorProfile);
router.patch('/profile', authMiddleware, vendorController.updateVendorProfile);
router.get('/earnings', authMiddleware, vendorController.getVendorEarnings);
router.get('/payouts', authMiddleware, vendorController.getVendorPayouts);
router.get('/inventory', authMiddleware, vendorController.getVendorInventory);
router.get('/dashboard', authMiddleware, vendorController.getVendorDashboard);
router.get('/payout-settings', authMiddleware, vendorController.getPayoutSettings);
router.patch('/payout-method', authMiddleware, vendorController.updatePayoutMethod);
router.patch('/paypal-email', authMiddleware, vendorController.updatePayPalEmail);
router.post('/withdraw', authMiddleware, vendorWithdrawalController.requestWithdrawal);
router.get('/withdrawals', authMiddleware, vendorWithdrawalController.getWithdrawals);
router.get('/withdrawals/:id', authMiddleware, vendorWithdrawalController.getWithdrawalById);
router.post('/withdrawals/:id/cancel', authMiddleware, vendorWithdrawalController.cancelWithdrawal);

router.get('/products', authMiddleware, vendorProductsController.getVendorProducts);
router.get('/products/:id', authMiddleware, vendorProductsController.getVendorProduct);
router.post('/products', authMiddleware, vendorProductsController.createProduct);
router.put('/products/:id', authMiddleware, vendorProductsController.updateProduct);
router.delete('/products/:id', authMiddleware, vendorProductsController.deleteProduct);
router.patch('/products/:id/status', authMiddleware, vendorProductsController.updateProductStatus);

router.get('/collectibles', authMiddleware, vendorCollectiblesController.getVendorCollectibles);
router.get('/collectibles/stats', authMiddleware, vendorCollectiblesController.getCollectibleStats);
router.get('/collectibles/:id', authMiddleware, vendorCollectiblesController.getVendorCollectible);
router.post('/collectibles', authMiddleware, vendorCollectiblesController.createCollectible);
router.put('/collectibles/:id', authMiddleware, vendorCollectiblesController.updateCollectible);
router.delete('/collectibles/:id', authMiddleware, vendorCollectiblesController.deleteCollectible);
router.patch(
  '/collectibles/:id/status',
  authMiddleware,
  vendorCollectiblesController.updateCollectibleStatus,
);

router.get('/orders', authMiddleware, vendorOrdersController.getVendorOrders);
router.get('/orders/:id', authMiddleware, vendorOrdersController.getVendorOrderDetail);
router.put('/orders/:id/status', authMiddleware, vendorOrdersController.updateOrderStatus);
router.put('/orders/:id/tracking', authMiddleware, vendorOrdersController.updateTrackingInfo);
router.post('/orders/:id/refund-request', authMiddleware, vendorOrdersController.requestRefund);

router.get('/reports/summary', authMiddleware, vendorReportsController.getSummary);
router.get('/reports/charts', authMiddleware, vendorReportsController.getChartData);
router.get('/reports/products', authMiddleware, vendorReportsController.getProductPerformance);
router.get('/reports/revenue', authMiddleware, vendorReportsController.getRevenueBreakdown);

router.get('/chat/conversations', authMiddleware, vendorChatController.getConversations);
router.get('/chat/messages/:conversationId', authMiddleware, vendorChatController.getMessages);
router.post('/chat/messages', authMiddleware, vendorChatController.sendMessage);
router.patch('/chat/conversations/:id/read', authMiddleware, vendorChatController.markAsRead);

router.get('/requests', authMiddleware, vendorRequestsController.getRequests);
router.get('/requests/:id', authMiddleware, vendorRequestsController.getRequestDetail);
router.post('/requests/:id/respond', authMiddleware, vendorRequestsController.respondToRequest);

router.get('/settings', authMiddleware, vendorSettingsController.getSettings);
router.put('/settings', authMiddleware, vendorSettingsController.updateSettings);
router.put('/settings/payout', authMiddleware, vendorSettingsController.updatePayoutSettings);

// Custom offers routes
router.get('/offers', authMiddleware, customOffersController.getVendorOffers);
router.get('/offers/search-users', authMiddleware, customOffersController.searchUsers);
router.post('/offers', authMiddleware, customOffersController.createOffer);
router.delete('/offers/:id', authMiddleware, customOffersController.cancelOffer);

export default router;
