import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// General API rate limiterz§
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes per IP
    message: {
        status: 'failed',
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
});

// TEST RATE LIMITER (for development/testing - lower limits)
export const testLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute (for faster testing)
    max: 5, // Only 5 requests per minute
    message: {
        status: 'failed',
        message: 'Rate limit exceeded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Add handler to see when limit is hit
    handler: (req, res) => {
        res.status(429).json({
            status: 'failed',
            message: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // seconds until reset
        });
    }
});

// Stricter limiter for authentication endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes per IP
    message: {
        status: 'failed',
        message: 'Too many login attempts, please try again later.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    standardHeaders: true,
});

// Higher limit for admin endpoints
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for admins
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP (with IPv6 support)
        return req.user?.id || ipKeyGenerator(req);
    },
    message: {
        status: 'failed',
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
});