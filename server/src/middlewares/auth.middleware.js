import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// ======= Protect routes: verify JWT =======
export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

// ======= Role-based authorization =======
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this route.`,
            });
        }
        next();
    };
};

// ======= Host-only guard =======
export const hostOnly = (req, res, next) => {
    if (!req.user.isHost && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'You must be a host to perform this action.',
        });
    }
    next();
};

// ======= Admin guard =======
export const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required.',
        });
    }
    next();
};
