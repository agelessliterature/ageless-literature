import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminDashboardController from '../controllers/admin/adminDashboardController.js';
import * as adminUsersController from '../controllers/admin/adminUsersController.js';
import * as adminVendorsController from '../controllers/admin/adminVendorsController.js';
import * as adminPayoutsController from '../controllers/admin/adminPayoutsController.js';
import * as adminWithdrawalsController from '../controllers/admin/adminWithdrawalsController.js';
import * as adminBooksController from '../controllers/admin/adminBooksController.js';
import * as adminCategoriesController from '../controllers/admin/adminCategoriesController.js';
import * as adminOrdersController from '../controllers/admin/adminOrdersController.js';
import * as adminMembershipsController from '../controllers/admin/adminMembershipsController.js';
import * as adminGlossaryController from '../controllers/admin/adminGlossaryController.js';
import * as adminEmailsController from '../controllers/admin/adminEmailsController.js';
import * as adminProductsController from '../controllers/admin/adminProductsController.js';
import * as adminCouponsController from '../controllers/admin/adminCouponsController.js';
import { createAdminImportRouter } from './importRoutes.js';

const router = express.Router();

router.use(adminAuth);

// Dashboard endpoint (aggregated data)
router.get('/dashboard', adminDashboardController.getAdminDashboard);

router.get('/users', adminUsersController.listAll);
router.get('/users/stats', adminUsersController.getUserStats);
router.post('/users/create', adminUsersController.createUser);
router.get('/users/:id', adminUsersController.getUser);
router.get('/users/:id/payment-methods', adminUsersController.getUserPaymentMethods);
router.put('/users/:id', adminUsersController.updateUser);
router.put('/users/:id/role', adminUsersController.updateRole);
router.put('/users/:id/status', adminUsersController.toggleStatus);
router.post('/users/:id/reset-password', adminUsersController.resetPassword);
router.delete('/users/:id', adminUsersController.deleteUser);

router.get('/vendors', adminVendorsController.listAll);
router.get('/vendors/stats', adminVendorsController.getVendorStats);
router.get('/vendors/search-users', adminVendorsController.searchUsers);
router.post('/vendors/create', adminVendorsController.createVendor);
router.post('/vendors/create-with-user', adminVendorsController.createVendorWithUser);
router.post('/vendors/expire-featured', adminVendorsController.expireFeaturedVendors);
router.get('/vendors/:id', adminVendorsController.getVendorById);
router.put('/vendors/:id', adminVendorsController.updateVendor);
router.put('/vendors/:id/featured', adminVendorsController.updateFeaturedStatus);
router.post('/vendors/:id/approve', adminVendorsController.approveVendor);
router.post('/vendors/:id/reject', adminVendorsController.rejectVendor);
router.post('/vendors/:id/suspend', adminVendorsController.suspendVendor);
router.get('/vendors/:id/inventory', adminVendorsController.getVendorInventory);
router.get('/vendors/:id/orders', adminVendorsController.getVendorOrders);
router.get('/vendors/:id/payouts', adminVendorsController.getVendorPayouts);
router.post('/vendors/:id/payouts', adminVendorsController.createPayout);
router.patch('/vendors/:id/notes', adminVendorsController.updateVendorNotes);
router.delete('/vendors/:id', adminVendorsController.deleteVendor);
router.post('/vendors/:vendorId/adjust-balance', adminPayoutsController.adjustVendorBalance);

router.get('/payouts', adminPayoutsController.listPayouts);
router.get('/payouts/stats', adminPayoutsController.getPayoutStats);
router.get('/payouts/:id', adminPayoutsController.getPayoutById);
router.post('/payouts', adminPayoutsController.createPayout);
router.patch('/payouts/:id/mark-paid', adminPayoutsController.markPayoutAsPaid);
router.patch('/payouts/:id/cancel', adminPayoutsController.cancelPayout);

router.get('/withdrawals', adminWithdrawalsController.listWithdrawals);
router.get('/withdrawals/:id', adminWithdrawalsController.getWithdrawalById);
router.post('/withdrawals/:id/approve', adminWithdrawalsController.approveWithdrawal);
router.post('/withdrawals/:id/process', adminWithdrawalsController.processWithdrawalRequest);
router.post('/withdrawals/:id/reject', adminWithdrawalsController.rejectWithdrawal);
router.post('/withdrawals/:id/complete', adminWithdrawalsController.completeWithdrawal);

router.get('/books', adminBooksController.listAll);
router.post('/books', adminBooksController.create);
router.put('/books/menu-order', adminBooksController.updateMenuOrder);
router.post('/books/sync-menu-order', adminBooksController.syncMenuOrderFromProd);
router.put('/books/:id', adminBooksController.update);
router.delete('/books/:id', adminBooksController.deleteBook);

router.get('/categories', adminCategoriesController.listAll);
router.post('/categories', adminCategoriesController.create);
router.put('/categories/:id', adminCategoriesController.update);
router.delete('/categories/:id', adminCategoriesController.deleteCategory);

router.get('/orders', adminOrdersController.listAll);
router.get('/orders/:id', adminOrdersController.getOne);
router.put('/orders/:id/status', adminOrdersController.updateStatus);
router.post('/orders/:id/refund', adminOrdersController.refundOrder);

router.get('/memberships/plans', adminMembershipsController.listPlans);
router.post('/memberships/plans', adminMembershipsController.createPlan);
router.put('/memberships/plans/:id', adminMembershipsController.updatePlan);
router.delete('/memberships/plans/:id', adminMembershipsController.deletePlan);
router.get('/memberships/subscriptions', adminMembershipsController.listSubscriptions);
router.post('/memberships/subscriptions/create', adminMembershipsController.createSubscription);
router.put('/memberships/subscriptions/:id', adminMembershipsController.updateSubscription);
router.post('/memberships/subscriptions/:id/cancel', adminMembershipsController.cancelSubscription);

// CSV Import
router.use('/imports/books', createAdminImportRouter());

router.get('/products', adminProductsController.listAll);
router.post('/products', adminProductsController.createProduct);
router.get('/products/stats', adminProductsController.getProductStats);
router.get('/products/:id', adminProductsController.getProduct);
router.put('/products/:id', adminProductsController.updateProduct);
router.delete('/products/:id', adminProductsController.deleteProduct);

router.get('/glossary', adminGlossaryController.listAll);
router.get('/glossary/:slug', adminGlossaryController.getBySlug);
router.post('/glossary', adminGlossaryController.create);
router.put('/glossary/:id', adminGlossaryController.update);
router.delete('/glossary/:id', adminGlossaryController.deleteTerm);

router.get('/emails', adminEmailsController.listAll);
router.get('/emails/:id', adminEmailsController.getOne);
router.post('/emails', adminEmailsController.create);
router.put('/emails/:id', adminEmailsController.update);
router.delete('/emails/:id', adminEmailsController.deleteTemplate);
router.get('/emails/:id/preview', adminEmailsController.preview);
router.post('/emails/:id/test', adminEmailsController.sendTest);

// Coupons
router.get('/coupons', adminCouponsController.listAll);
router.get('/coupons/stats', adminCouponsController.getStats);
router.get('/coupons/:id', adminCouponsController.getOne);
router.post('/coupons', adminCouponsController.create);
router.put('/coupons/:id', adminCouponsController.update);
router.delete('/coupons/:id', adminCouponsController.deleteCoupon);

export default router;
