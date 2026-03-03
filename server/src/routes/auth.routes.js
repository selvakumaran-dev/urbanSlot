import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import { authRateLimiter, loginRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
    register,
    login,
    getMe,
    updateProfile,
    becomeHost,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../controllers/auth.controller.js';

const router = express.Router();

// Auth routes with rate limiting + validation
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', loginRateLimiter, validate(loginSchema), login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/become-host', protect, becomeHost);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsRead);
router.put('/notifications/:id/read', protect, markNotificationRead);

export default router;
