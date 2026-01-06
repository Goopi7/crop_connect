const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Store rate limit info in headers
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health';
        }
    });
};

// General API rate limiting
const apiLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later.'
);

// Stricter rate limiting for authentication routes
const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 login requests per windowMs
    'Too many authentication attempts from this IP, please try again later.'
);

// Stricter rate limiting for ML prediction endpoints
const mlLimiter = createRateLimit(
    60 * 1000, // 1 minute
    10, // limit each IP to 10 ML requests per minute
    'Too many prediction requests, please slow down.'
);

// Password strength validation
const validatePasswordStrength = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    
    if (password.length < minLength) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!hasUpperCase) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!hasLowerCase) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!hasNumbers) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }
    
    if (!hasNonalphas) {
        return { isValid: false, message: 'Password must contain at least one special character' };
    }
    
    return { isValid: true, message: 'Password is strong' };
};

// Helmet configuration for security headers
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://api.mapbox.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://api.mapbox.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.mapbox.com"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false // Allow embedding for map tiles
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remove potentially dangerous characters
            return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                       .replace(/javascript:/gi, '')
                       .replace(/on\w+\s*=/gi, '');
        }
        return value;
    };

    const sanitizeObject = (obj) => {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                } else {
                    obj[key] = sanitizeValue(obj[key]);
                }
            }
        }
    };

    // Sanitize request body
    if (req.body) {
        sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
        sanitizeObject(req.params);
    }

    next();
};

// Role-based access control
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userRole = req.user.constructor.modelName === 'FarmerLogin' ? 'farmer' : 'buyer';
        
        if (requiredRole && userRole !== requiredRole) {
            return res.status(403).json({
                success: false,
                error: `Access denied. ${requiredRole} role required.`
            });
        }

        next();
    };
};

// Session security configuration
const getSecureSessionConfig = (store, secret) => {
    return {
        store,
        secret: secret || 'fallback-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            httpOnly: true, // Prevent XSS
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict' // CSRF protection
        },
        name: 'cropconnect.sid' // Change default session name
    };
};

// API key validation for ML service
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ML_API_KEY;
    
    if (!validApiKey) {
        // If no API key is configured, skip validation
        return next();
    }
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key'
        });
    }
    
    next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
    const userAgent = req.get('User-Agent');
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
    });
    
    next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: isDevelopment ? err.message : 'Invalid input data'
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID format'
        });
    }
    
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry',
            details: isDevelopment ? err.message : 'Resource already exists'
        });
    }
    
    // Generic error response
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: isDevelopment ? err.message : 'Something went wrong'
    });
};

module.exports = {
    apiLimiter,
    authLimiter,
    mlLimiter,
    helmetConfig,
    sanitizeInput,
    requireRole,
    getSecureSessionConfig,
    validatePasswordStrength,
    validateApiKey,
    requestLogger,
    errorHandler
};