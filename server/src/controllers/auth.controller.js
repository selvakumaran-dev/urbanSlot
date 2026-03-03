import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { sendWelcomeEmail } from '../services/email.service.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.loginAttempts;
    delete userObj.lockUntil;
    delete userObj.refreshTokens;

    res.status(statusCode).json({
        success: true,
        token,
        user: userObj,
    });
};

// @route   POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
    const { firstName, lastName, password, role, phone } = req.body;

    // Auto-generate a unique email from firstName + role domain
    const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domain = role === 'host' ? 'hostus.com' : 'driverus.com';

    let email = `${cleanFirstName}@${domain}`;
    let counter = 1;
    while (await User.findOne({ email })) {
        counter++;
        email = `${cleanFirstName}${counter}@${domain}`;
    }

    const name = `${firstName} ${lastName}`.trim();

    const user = await User.create({
        name,
        email,
        password,
        role,
        phone,
        isHost: role === 'host',
    });

    // Fire & forget the welcome email
    sendWelcomeEmail(user, role).catch(err => console.error('Failed to send welcome email:', err));

    sendTokenResponse(user, 201, res);
});

// @route   POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() })
        .select('+password +loginAttempts +lockUntil');

    // Generic error message to prevent email enumeration
    const invalidMsg = 'Invalid email or password. Please check your credentials.';

    if (!user) {
        return res.status(401).json({ success: false, message: invalidMsg });
    }

    // Check if account is locked
    if (user.isLocked) {
        const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
            success: false,
            message: `Account temporarily locked due to too many failed attempts. Please try again in ${lockMinutes} minute(s).`,
            isLocked: true,
            lockMinutes,
        });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        await user.incrementLoginAttempts();
        // user.loginAttempts is the OLD value (before increment), so correct remaining is:
        const attemptsUsed = user.loginAttempts + 1; // after this increment
        const remaining = Math.max(0, 5 - attemptsUsed);
        const msg =
            remaining > 0
                ? `${invalidMsg} ${remaining} attempt(s) remaining before account lockout.`
                : 'Account locked for 15 minutes due to too many failed login attempts.';

        return res.status(401).json({ success: false, message: msg });
    }

    // Successful login - reset attempts
    await user.resetLoginAttempts();

    // Update last seen
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
});

// @route   GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('savedSpots', 'title address pricing images rating')
        .lean();

    res.status(200).json({ success: true, user });
});

// @route   PUT /api/auth/me
export const updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = ['name', 'phone', 'avatar', 'vehicleInfo', 'payoutMethods'];
    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({ success: true, user });
});

// @route   POST /api/auth/become-host
export const becomeHost = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { isHost: true, role: 'host' },
        { new: true }
    );
    res.status(200).json({ success: true, message: 'You are now a host!', user });
});

// @route   GET /api/auth/notifications
export const getNotifications = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('notifications');
    const sorted = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ success: true, notifications: sorted });
});

// @route   PUT /api/auth/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req, res) => {
    await User.updateOne(
        { _id: req.user._id, 'notifications._id': req.params.id },
        { $set: { 'notifications.$.isRead': true } }
    );
    res.status(200).json({ success: true, message: 'Notification marked as read.' });
});

// @route   PUT /api/auth/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
    await User.updateOne(
        { _id: req.user._id },
        { $set: { 'notifications.$[].isRead': true } }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});
