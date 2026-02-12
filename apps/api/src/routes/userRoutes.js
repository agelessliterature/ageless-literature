import express from 'express';
import * as usersController from '../controllers/usersController.js';
import * as customOffersController from '../controllers/customOffersController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.get('/profile', usersController.getUserProfile);
router.get('/me', verifyToken, usersController.getCurrentUser);

// Custom offers routes for users (must be before /:id routes)
router.get('/offers', verifyToken, customOffersController.getUserOffers);
router.get('/offers/:id', verifyToken, customOffersController.getOfferById);
router.post('/offers', verifyToken, customOffersController.createBuyerOffer);
router.post('/offers/:id/respond', verifyToken, customOffersController.respondToOffer);

router.get('/:id', verifyToken, usersController.getUserById);
router.patch('/:id', verifyToken, usersController.updateUser);
router.delete('/:id', verifyToken, usersController.deleteUser);

// User statistics and helpers
router.get('/:id/stats', verifyToken, usersController.getUserStats);
router.get('/:id/is-vendor', verifyToken, usersController.checkIsVendor);
router.get('/:id/is-member', verifyToken, usersController.checkIsMember);
router.get('/:id/is-admin', verifyToken, usersController.checkIsAdmin);

// Password and preferences
router.patch('/:id/password', verifyToken, usersController.updatePassword);
router.patch('/:id/language', verifyToken, usersController.updateLanguage);

export default router;
