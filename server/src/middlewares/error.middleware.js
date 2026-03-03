// Centralized async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware (register last in app.js)
export const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
        statusCode = 409;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors).map((e) => e.message).join(', ');
        statusCode = 400;
    }

    // Mongoose version conflict (optimistic locking)
    if (err.name === 'VersionError') {
        message = 'Booking conflict detected. Please try again.';
        statusCode = 409;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        message = 'Invalid token.';
        statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        message = 'Token has expired.';
        statusCode = 401;
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
