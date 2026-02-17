import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import webhookRoutes from './webhooks.js';
import paypalWebhooks from './paypalWebhooks.js';
import cloudinaryRoutes from './cloudinaryRoutes.js';
import accountRoutes from './accountRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import * as cartController from '../controllers/cartController.js';
import * as ordersController from '../controllers/ordersController.js';
import * as reservationsController from '../controllers/reservationsController.js';
import * as wishlistController from '../controllers/wishlistController.js';
import * as conversationsController from '../controllers/conversationsController.js';
import * as customerChatController from '../controllers/customerChatController.js';
import * as membershipsController from '../controllers/membershipsController.js';
import * as auctionsController from '../controllers/auctionsController.js';
import * as auctionActionsController from '../controllers/auctionActionsController.js';
import * as bidsController from '../controllers/bidsController.js';
import * as winningsController from '../controllers/winningsController.js';
import * as productsController from '../controllers/productsController.js';
import * as booksController from '../controllers/booksController.js';
import * as categoriesController from '../controllers/categoriesController.js';
import * as vendorController from '../controllers/vendorController.js';
import * as notificationsController from '../controllers/notificationsController.js';
import * as usersController from '../controllers/usersController.js';
import * as stripeController from '../controllers/stripeController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();
const authMiddleware = verifyToken;

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/webhooks/paypal', paypalWebhooks);
router.use('/cloudinary', cloudinaryRoutes);
router.use('/account', accountRoutes);
router.use('/vendor', vendorRoutes);
router.use('/upload', uploadRoutes); // Phase 5.1: Direct upload endpoint for NativeImageUploader

// Stripe routes
router.post('/stripe/setup-intent', authMiddleware, stripeController.createSetupIntent);

router.get('/cart', authMiddleware, cartController.getCart);
router.post('/cart', authMiddleware, cartController.addToCart);
router.delete('/cart/:itemId', authMiddleware, cartController.removeFromCart);
router.delete('/cart', authMiddleware, cartController.clearCart);

router.get('/orders', authMiddleware, ordersController.getOrders);
router.get('/orders/:id', authMiddleware, ordersController.getOrderById);
router.post('/orders', authMiddleware, ordersController.createOrder);
router.patch('/orders/:id/status', authMiddleware, ordersController.updateOrderStatus);

router.get('/reservations', authMiddleware, reservationsController.getUserReservations);
router.post('/reservations', authMiddleware, reservationsController.createReservation);
router.delete('/reservations/:id', authMiddleware, reservationsController.cancelReservation);

router.get('/wishlist', authMiddleware, wishlistController.getWishlist);
router.post('/wishlist', authMiddleware, wishlistController.addToWishlist);
router.delete('/wishlist/:itemId', authMiddleware, wishlistController.removeFromWishlist);

router.get('/conversations', authMiddleware, conversationsController.getConversations);
router.post('/conversations', authMiddleware, conversationsController.createConversation);
router.get(
  '/conversations/:conversationId/messages',
  authMiddleware,
  conversationsController.getMessages,
);
router.post(
  '/conversations/:conversationId/messages',
  authMiddleware,
  conversationsController.sendMessage,
);

// Customer chat routes
router.post(
  '/customer/chat/conversations',
  authMiddleware,
  customerChatController.getOrCreateConversation,
);
router.get(
  '/customer/chat/messages/:conversationId',
  authMiddleware,
  customerChatController.getMessages,
);
router.post('/customer/chat/messages', authMiddleware, customerChatController.sendMessage);

router.get('/memberships/plans', membershipsController.getPlans);
router.get('/memberships/subscription', authMiddleware, membershipsController.getUserSubscription);
router.post('/memberships/subscribe', authMiddleware, membershipsController.subscribe);
router.post('/memberships/cancel', authMiddleware, membershipsController.cancelSubscription);
router.post('/memberships/pause', authMiddleware, membershipsController.pauseSubscription);
router.post('/memberships/resume', authMiddleware, membershipsController.resumeSubscription);
router.post('/memberships/rejoin', authMiddleware, membershipsController.rejoinSubscription);
router.post('/memberships/change-plan', authMiddleware, membershipsController.changePlan);
router.get('/memberships/billing-history', authMiddleware, membershipsController.getBillingHistory);
router.post(
  '/memberships/payment-method',
  authMiddleware,
  membershipsController.updatePaymentMethod,
);

router.get('/auctions', auctionsController.listAuctions);
router.get('/auctions/active', auctionsController.getActiveAuctionForProduct);
router.get('/auctions/:id', auctionsController.getAuctionById);
router.post('/auctions', authMiddleware, auctionsController.createAuction);
router.patch('/auctions/:id', authMiddleware, auctionsController.updateAuction);
router.post('/auctions/:id/close', authMiddleware, auctionsController.closeAuction);
router.delete('/auctions/:id', authMiddleware, auctionsController.cancelAuction);

// Auction actions (vendor post-auction management)
router.post('/auctions/:id/relist', authMiddleware, auctionActionsController.relistAuction);
router.post(
  '/auctions/:id/convert-to-fixed',
  authMiddleware,
  auctionActionsController.convertToFixed,
);
router.post('/auctions/:id/unlist', authMiddleware, auctionActionsController.unlistAuction);
router.patch('/auctions/:id/end-policy', authMiddleware, auctionActionsController.updateEndPolicy);

router.get('/auctions/:auctionId/bids', bidsController.getAuctionBids);
router.post('/auctions/:auctionId/bids', authMiddleware, bidsController.placeBid);
router.get('/user/bids', authMiddleware, bidsController.getUserBids);
router.get('/user/bids/active', authMiddleware, bidsController.getUserActiveBids);

router.get('/user/winnings', authMiddleware, winningsController.getUserWinnings);
router.get('/user/winnings/:id', authMiddleware, winningsController.getAuctionWinning);
router.post('/user/winnings/:id/claim', authMiddleware, winningsController.claimWinning);
router.post('/user/winnings/:id/pay', authMiddleware, winningsController.payForWinning);

router.get('/vendors', vendorController.getPublicVendors);
router.get('/vendors/:shopUrl', vendorController.getVendorByShopUrl);

// Public site stats (homepage)
router.get('/stats', async (req, res) => {
  try {
    const db = (await import('../models/index.js')).default;
    const [booksCount, vendorsCount, auctionsCount] = await Promise.all([
      db.Product.count({ where: { status: 'active' } }).catch(() => db.Product.count()),
      db.Vendor.count({ where: { verified: true } }).catch(() => db.Vendor.count()),
      db.Auction.count().catch(() => 0),
    ]);
    return res.json({ success: true, data: { booksCount, vendorsCount, auctionsCount } });
  } catch (error) {
    return res.json({ success: true, data: { booksCount: 0, vendorsCount: 0, auctionsCount: 0 } });
  }
});

router.get('/books', booksController.getAllBooks);
router.get('/books/:id', booksController.getBookById);
router.post('/books', authMiddleware, booksController.createBook);
router.put('/books/:id', authMiddleware, booksController.updateBook);
router.delete('/books/:id', authMiddleware, booksController.deleteBook);

router.get('/categories', categoriesController.getAllCategories);
router.get('/categories/:id', categoriesController.getCategoryById);
router.post('/categories', authMiddleware, categoriesController.createCategory);
router.put('/categories/:id', authMiddleware, categoriesController.updateCategory);
router.delete('/categories/:id', authMiddleware, categoriesController.deleteCategory);
router.post('/categories/assign', authMiddleware, categoriesController.assignCategoryToBook);
router.delete(
  '/categories/:bookId/:categoryId',
  authMiddleware,
  categoriesController.removeCategoryFromBook,
);

router.get('/products', productsController.getAllProducts);
router.get('/products/categories', productsController.getProductCategories);
router.get('/products/:identifier', productsController.getProductBySlug);
router.get('/products/:id/related', productsController.getRelatedProducts);

router.get('/notifications', authMiddleware, notificationsController.getNotifications);
router.get('/notifications/unread-count', authMiddleware, notificationsController.getUnreadCount);
router.patch('/notifications/:id/read', authMiddleware, notificationsController.markAsRead);
router.patch('/notifications/mark-all-read', authMiddleware, notificationsController.markAllAsRead);
router.delete('/notifications/:id', authMiddleware, notificationsController.deleteNotification);
router.delete('/notifications/all', authMiddleware, notificationsController.deleteAllNotifications);

// SMS Verification & Preferences (Phase 5)
router.post('/sms/start-verification', authMiddleware, usersController.startSmsVerification);
router.post('/sms/confirm-verification', authMiddleware, usersController.confirmSmsVerification);
router.post('/sms/opt-out', authMiddleware, usersController.smsOptOut);
router.post('/sms/opt-in', authMiddleware, usersController.smsOptIn);
router.get('/sms/preferences', authMiddleware, usersController.getSmsPreferences);

// Twilio Inbound Webhook (public endpoint for STOP/HELP compliance)
router.post('/twilio/inbound', usersController.handleInboundSms);

export default router;
