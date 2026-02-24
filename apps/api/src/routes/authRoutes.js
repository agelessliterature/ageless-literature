import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.verifyToken, authController.logout);
router.get('/me', authController.verifyToken, authController.getCurrentUser);
router.get('/online-users', authController.verifyToken, authController.getOnlineUsers);
router.post('/oauth/callback', authController.oauthCallback);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
