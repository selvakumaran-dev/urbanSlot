import mongoose from 'mongoose';
import Booking from '../models/Booking.model.js';
import ParkingSpot from '../models/ParkingSpot.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

// Helper: Calculate pricing for a booking
const calculatePricing = (spot, startTime, endTime, paymentMethod = 'card') => {
    const durationMs = new Date(endTime) - new Date(startTime);
    const hours = durationMs / (1000 * 60 * 60);
    const startHour = new Date(startTime).getHours();

    const baseRate = spot.pricing.hourlyRate;
    const { dynamicPricing } = spot;

    let multiplier = 1.0;
    let isDynamic = false;

    if (dynamicPricing.enabled) {
        const { peakHours, eveningPeakHours, peakMultiplier } = dynamicPricing;
        const isPeakMorning = startHour >= peakHours.start && startHour < peakHours.end;
        const isPeakEvening = startHour >= eveningPeakHours.start && startHour < eveningPeakHours.end;
        if (isPeakMorning || isPeakEvening) {
            multiplier = peakMultiplier;
            isDynamic = true;
        }
    }

    const effectiveRate = parseFloat((baseRate * multiplier).toFixed(2));
    const subtotal = parseFloat((effectiveRate * hours).toFixed(2));
    const serviceFee = paymentMethod === 'p2p_direct' ? 0 : parseFloat((subtotal * 0.1).toFixed(2)); // 10% platform fee, 0 for P2P
    const total = parseFloat((subtotal + serviceFee).toFixed(2));

    return {
        baseHourlyRate: baseRate,
        effectiveHourlyRate: effectiveRate,
        subtotal,
        serviceFee,
        total,
        currency: spot.pricing.currency,
        isDynamicPricing: isDynamic,
        dynamicMultiplier: multiplier,
    };
};

// @route   POST /api/bookings
// ======= CONCURRENCY-SAFE BOOKING with Optimistic Locking =======
export const createBooking = asyncHandler(async (req, res) => {
    const { spotId, startTime, endTime, vehicleInfo, paymentMethod } = req.body;

    // Validate time range
    if (new Date(startTime) >= new Date(endTime)) {
        return res.status(400).json({ success: false, message: 'Start time must be before end time.' });
    }

    // Use a MongoDB session for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Load spot with session
        const spot = await ParkingSpot.findById(spotId).session(session);

        if (!spot || !spot.isActive) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Parking spot not found or inactive.' });
        }

        // ── Guard: host cannot book their own spot ──
        if (spot.host.toString() === req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'You cannot book your own parking spot.' });
        }

        // Check availability (conflict check)
        if (!spot.isSlotAvailable(startTime, endTime)) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: 'This time slot is already booked. Please choose a different time.',
            });
        }

        // Calculate pricing
        const pricing = calculatePricing(spot, startTime, endTime, paymentMethod);

        // Enforce Vehicle Information (Plate & Model)
        const finalVehicleInfo = vehicleInfo || req.user.vehicleInfo;
        if (!finalVehicleInfo || !finalVehicleInfo.plate || !finalVehicleInfo.model) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Vehicle information (license plate and model) is required to book a spot. Please provide it or update your profile.'
            });
        }

        // Create the booking
        const booking = new Booking({
            driver: req.user._id,
            spot: spot._id,
            host: spot.host,
            startTime,
            endTime,
            pricing,
            vehicleInfo: finalVehicleInfo,
            payment: { method: paymentMethod || 'card', status: 'pending' },
            status: spot.isInstantBook ? 'confirmed' : 'pending',
        });

        await booking.save({ session });

        // ======= Optimistic Locking: Block the time slot =======
        // This will fail with VersionError if the document was modified concurrently
        spot.unavailableTimeSlots.push({
            startTime,
            endTime,
            bookingId: booking._id,
        });
        spot.totalBookings += 1;
        spot.concurrencyVersion += 1;

        await spot.save({ session });

        // Add notification to Host
        const hostUser = await User.findById(spot.host).session(session);
        if (hostUser) {
            hostUser.notifications.push({
                type: 'BOOKING_CONFIRMED',
                title: 'New Booking Request',
                message: `${req.user.name} booked ${spot.title}.`,
                relatedBooking: booking._id,
                isRead: false
            });
            await hostUser.save({ session });
        }

        await session.commitTransaction();

        // Notify host via Socket.io (attached to res.io)
        if (res.io) {
            res.io.to(`user:${spot.host.toString()}`).emit('new_booking', {
                bookingId: booking._id,
                spotTitle: spot.title,
                driverName: req.user.name,
                startTime,
                endTime,
                status: booking.status,
            });
        }

        await booking.populate([
            { path: 'spot', select: 'title address pricing images' },
            { path: 'driver', select: 'name email avatar' },
        ]);

        res.status(201).json({ success: true, data: booking });
    } catch (error) {
        await session.abortTransaction();
        if (error.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                message: 'Booking conflict! Someone else just booked this spot. Please try again.',
            });
        }
        throw error;
    } finally {
        session.endSession();
    }
});

// @route   GET /api/bookings/my
export const getMyBookings = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { driver: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate('spot', 'title address images pricing rating location')
            .populate('host', 'name avatar rating')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Booking.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        data: bookings,
        pagination: { page: Number(page), limit: Number(limit), total },
    });
});

// @route   GET /api/bookings/:id
export const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('spot', 'title address images pricing amenities host')
        .populate('driver', 'name email avatar phone')
        .populate('host', 'name avatar phone rating');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Ensure user owns or is host of this booking
    const isAuthorized =
        booking.driver._id.toString() === req.user._id.toString() ||
        booking.host._id.toString() === req.user._id.toString() ||
        req.user.role === 'admin';

    if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    res.status(200).json({ success: true, data: booking });
});

// @route   PUT /api/bookings/:id/status
export const updateBookingStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // State machine validation
    const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['active', 'cancelled'],
        active: ['completed'],
        completed: ['reviewed'],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Cannot transition from '${booking.status}' to '${status}'`,
        });
    }

    booking.status = status;

    await booking.save();

    // Attach note to the NEWLY pushed history entry (pushed by pre-save hook)
    if (note) {
        const lastIdx = booking.statusHistory.length - 1;
        booking.statusHistory[lastIdx].note = note;
        await booking.save();
    }

    // If cancelled, free up the time slot
    if (status === 'cancelled') {
        booking.cancelledAt = new Date();
        booking.cancelledBy = req.user._id;
        await booking.save();

        await ParkingSpot.updateOne(
            { _id: booking.spot },
            { $pull: { unavailableTimeSlots: { bookingId: booking._id } } }
        );

        // Notify driver
        if (res.io) {
            res.io.to(`user:${booking.driver.toString()}`).emit('booking_cancelled', {
                bookingId: booking._id,
                reason: note || 'Booking was cancelled.',
            });
        }
    }

    res.status(200).json({ success: true, data: booking });
});

// @route   PUT /api/bookings/:id/confirm  (HOST only)
export const confirmBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('spot', 'title')
        .populate('driver', 'name');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Only the host of this booking can confirm it
    if (booking.host.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Only the host can confirm this booking.' });
    }

    if (booking.status !== 'pending') {
        return res.status(400).json({
            success: false,
            message: `Booking is already '${booking.status}' — cannot confirm again.`,
        });
    }

    booking.status = 'confirmed';
    booking.payment.status = 'paid'; // Mark as paid since host confirmed receipt
    await booking.save();

    // Notify the driver in real-time via socket
    if (res.io) {
        res.io.to(`user:${booking.driver._id.toString()}`).emit('booking_confirmed', {
            bookingId: booking._id,
            spotTitle: booking.spot?.title,
            message: `Your booking for "${booking.spot?.title}" has been confirmed by the host!`,
        });
    }

    // Also push notification into driver's notifications array
    await User.findByIdAndUpdate(booking.driver._id, {
        $push: {
            notifications: {
                type: 'BOOKING_CONFIRMED',
                title: 'Booking Confirmed!',
                message: `Your booking for "${booking.spot?.title}" has been confirmed by the host.`,
                relatedBooking: booking._id,
                isRead: false,
            },
        },
    });

    res.status(200).json({ success: true, data: booking });
});

// @route   DELETE /api/bookings/:id
export const cancelBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, driver: req.user._id });

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({
            success: false,
            message: 'Active or completed bookings cannot be cancelled.',
        });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;
    await booking.save();

    // Free the time slot using explicit ObjectId cast to avoid silent mismatches
    await ParkingSpot.updateOne(
        { _id: booking.spot },
        { $pull: { unavailableTimeSlots: { bookingId: new mongoose.Types.ObjectId(booking._id) } } }
    );

    // Notify the HOST that the driver cancelled
    if (res.io) {
        res.io.to(`user:${booking.host.toString()}`).emit('booking_cancelled', {
            bookingId: booking._id,
            reason: 'Driver cancelled their booking.',
        });
    }
    await User.findByIdAndUpdate(booking.host, {
        $push: {
            notifications: {
                type: 'BOOKING_CANCELLED',
                title: 'Booking Cancelled',
                message: `A driver cancelled their booking for one of your spots.`,
                relatedBooking: booking._id,
                isRead: false,
            },
        },
    });

    res.status(200).json({ success: true, message: 'Booking cancelled successfully.' });
});

// @route   GET /api/bookings/host/dashboard
export const getHostDashboard = asyncHandler(async (req, res) => {
    const hostId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate earnings and stats
    const [monthlyStats, totalStats, recentBookings, occupancyData] = await Promise.all([
        // Monthly earnings
        Booking.aggregate([
            {
                $match: {
                    host: hostId,
                    status: { $in: ['pending', 'confirmed', 'active', 'completed'] },
                    createdAt: { $gte: startOfMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    earnings: { $sum: '$pricing.subtotal' },
                    bookings: { $sum: 1 },
                },
            },
        ]),

        // All-time stats
        Booking.aggregate([
            { $match: { host: hostId, status: { $in: ['pending', 'confirmed', 'active', 'completed', 'cancelled'] } } },
            { $group: { _id: null, totalEarnings: { $sum: '$pricing.subtotal' }, totalBookings: { $sum: 1 } } },
        ]),

        // Recent 5 bookings
        Booking.find({ host: hostId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('driver', 'name avatar')
            .populate('spot', 'title'),

        // Last 7 days daily earnings
        Booking.aggregate([
            {
                $match: {
                    host: hostId,
                    status: { $in: ['pending', 'confirmed', 'active', 'completed'] },
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    earnings: { $sum: '$pricing.subtotal' },
                    bookings: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    // Occupancy rate: (booked hours / total available hours this month) * 100
    const spots = await ParkingSpot.find({ host: hostId, isActive: true }).select('title');
    const spotCount = spots.length;

    const hoursInMonth = (now.getDate() * 24);
    const totalAvailableHours = spotCount * hoursInMonth;

    const bookedHoursResult = await Booking.aggregate([
        { $match: { host: hostId, status: { $in: ['active', 'completed'] }, createdAt: { $gte: startOfMonth } } },
        {
            $group: {
                _id: null,
                totalHours: {
                    $sum: { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 3600000] }
                }
            }
        },
    ]);
    const bookedHours = bookedHoursResult[0]?.totalHours || 0;
    const occupancyRate = totalAvailableHours > 0
        ? parseFloat(((bookedHours / totalAvailableHours) * 100).toFixed(1))
        : 0;

    res.status(200).json({
        success: true,
        data: {
            monthly: {
                earnings: monthlyStats[0]?.earnings || 0,
                bookings: monthlyStats[0]?.bookings || 0,
            },
            allTime: {
                earnings: totalStats[0]?.totalEarnings || 0,
                bookings: totalStats[0]?.totalBookings || 0,
            },
            occupancyRate,
            spots,
            recentBookings,
            earningsChart: occupancyData,
        },
    });
});
