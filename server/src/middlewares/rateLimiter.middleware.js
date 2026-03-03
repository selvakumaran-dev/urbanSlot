import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for auth routes: 10 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
    skipSuccessfulRequests: false,
});

/**
 * Tighter limiter specifically for login: 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    },
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * General API rate limiter: 100 requests per 10 minutes per IP
 */
export const generalRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
});
