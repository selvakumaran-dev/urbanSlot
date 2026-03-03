import ParkingSpot from '../models/ParkingSpot.model.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

// ======= Smart Dynamic Pricing Algorithm =======
const applyDynamicPricing = (spot, startTime) => {
    const hour = new Date(startTime).getHours();
    const { dynamicPricing, pricing } = spot;

    if (!dynamicPricing.enabled) {
        return { rate: pricing.hourlyRate, multiplier: 1.0, isDynamic: false };
    }

    const { peakHours, eveningPeakHours, peakMultiplier } = dynamicPricing;
    const isPeakMorning = hour >= peakHours.start && hour < peakHours.end;
    const isPeakEvening = hour >= eveningPeakHours.start && hour < eveningPeakHours.end;

    if (isPeakMorning || isPeakEvening) {
        return {
            rate: parseFloat((pricing.hourlyRate * peakMultiplier).toFixed(2)),
            multiplier: peakMultiplier,
            isDynamic: true,
        };
    }
    return { rate: pricing.hourlyRate, multiplier: 1.0, isDynamic: false };
};

// @route   GET /api/spots/search
// Query: lat, lng, radius, startTime, endTime, spotType, minPrice, maxPrice, vehicleType
export const searchSpots = asyncHandler(async (req, res) => {
    const {
        lat,
        lng,
        radius = 5000,
        startTime,
        endTime,
        spotType,
        minPrice,
        maxPrice,
        vehicleType,
        page = 1,
        limit = 20,
    } = req.validatedQuery;

    const skip = (page - 1) * limit;

    // Fetch all active spots that match text filters first
    const dbQuery = { isActive: true };
    if (spotType && spotType !== 'any') dbQuery.spotType = spotType;
    if (vehicleType) dbQuery.vehicleTypes = vehicleType;
    if (minPrice !== undefined) dbQuery['pricing.hourlyRate'] = { $gte: Number(minPrice) };
    if (maxPrice !== undefined) {
        dbQuery['pricing.hourlyRate'] = {
            ...dbQuery['pricing.hourlyRate'],
            $lte: Number(maxPrice),
        };
    }
    if (startTime && endTime) {
        dbQuery['unavailableTimeSlots'] = {
            $not: {
                $elemMatch: {
                    startTime: { $lt: new Date(endTime) },
                    endTime: { $gt: new Date(startTime) },
                },
            },
        };
    }

    try {
        const spots = await ParkingSpot.find(dbQuery)
            .populate('host', 'name avatar rating')
            .lean();

        // Compute haversine distance and filter manually for MAXIMUM RELIABILITY
        const latR = parseFloat(lat) * (Math.PI / 180);
        const lngR = parseFloat(lng) * (Math.PI / 180);
        const searchRadiusMs = Number(radius);

        const withDistance = spots
            .map((spot) => {
                const [sLng, sLat] = spot.location.coordinates;
                const dLat = (sLat - parseFloat(lat)) * (Math.PI / 180);
                const dLng = (sLng - parseFloat(lng)) * (Math.PI / 180);
                const a =
                    Math.sin(dLat / 2) ** 2 +
                    Math.cos(latR) * Math.cos(sLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
                const distMeters = 2 * 6378100 * Math.asin(Math.sqrt(a));

                let enriched = { ...spot, distanceMeters: Math.round(distMeters) };
                if (startTime) enriched.effectivePricing = applyDynamicPricing(spot, startTime);
                return enriched;
            })
            // Force pure JavaScript radius filtering!
            .filter((spot) => spot.distanceMeters <= searchRadiusMs);

        withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);

        const total = withDistance.length;
        const paginated = withDistance.slice(skip, skip + limit);

        res.status(200).json({
            success: true,
            data: paginated,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (geoErr) {
        // Handle Atlas geo index errors gracefully
        if (
            geoErr.code === 5626500 ||
            geoErr.codeName === 'Location5626500' ||
            geoErr.message?.includes('geoNear') ||
            geoErr.message?.includes('near')
        ) {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: { page, limit, total: 0, pages: 0 },
            });
        }
        throw geoErr;
    }
});

// @route   GET /api/spots/:id
export const getSpotById = asyncHandler(async (req, res) => {
    try {
        const spot = await ParkingSpot.findById(req.params.id)
            .populate('host', 'name avatar rating totalEarnings phone payoutMethods')
            .populate('reviews.user', 'name avatar');

        if (!spot) {
            return res.status(404).json({ success: false, message: 'Parking spot not found.' });
        }

        res.status(200).json({ success: true, data: spot });
    } catch (err) {
        console.error("GET SPOT ERR:", err);
        return res.status(500).json({ success: false, message: "Server error loading spot: " + err.message });
    }
});

// @route   POST /api/spots
export const createSpot = asyncHandler(async (req, res) => {
    const {
        title, description, address, location, pricing, spotType,
        vehicleTypes, amenities, isInstantBook, availableDays, images,
    } = req.body;

    const spot = await ParkingSpot.create({
        host: req.user._id,
        title,
        description,
        address: {
            ...address,
            displayAddress: `${address.street}, ${address.city}, ${address.state}`,
        },
        location: {
            type: 'Point',
            coordinates: location.coordinates, // [lng, lat]
        },
        pricing,
        spotType,
        vehicleTypes,
        amenities,
        isInstantBook,
        availableDays,
        images: images || [],
    });

    res.status(201).json({ success: true, data: spot });
});

// @route   PUT /api/spots/:id
export const updateSpot = asyncHandler(async (req, res) => {
    const spot = await ParkingSpot.findOne({ _id: req.params.id, host: req.user._id });

    if (!spot) {
        return res.status(404).json({
            success: false,
            message: 'Spot not found or you are not the owner.',
        });
    }

    const allowedUpdates = [
        'title', 'description', 'pricing', 'spotType', 'vehicleTypes',
        'amenities', 'isInstantBook', 'availableDays', 'isActive', 'images',
        'availableHours', 'dynamicPricing',
    ];

    allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) spot[field] = req.body[field];
    });

    await spot.save();
    res.status(200).json({ success: true, data: spot });
});

// @route   DELETE /api/spots/:id
export const deleteSpot = asyncHandler(async (req, res) => {
    const spot = await ParkingSpot.findOneAndDelete({
        _id: req.params.id,
        host: req.user._id,
    });

    if (!spot) {
        return res.status(404).json({
            success: false,
            message: 'Spot not found or you are not the owner.',
        });
    }

    res.status(200).json({ success: true, message: 'Spot deleted successfully.' });
});

// @route   GET /api/spots/host/my-spots
export const getMySpots = asyncHandler(async (req, res) => {
    const spots = await ParkingSpot.find({ host: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: spots });
});

// @route   POST /api/spots/:id/review
export const addReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const spot = await ParkingSpot.findById(req.params.id);

    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found.' });

    // Check if user already reviewed
    const alreadyReviewed = spot.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
        return res.status(400).json({ success: false, message: 'You have already reviewed this spot.' });
    }

    spot.reviews.push({ user: req.user._id, rating, comment });

    // Recalculate average
    const total = spot.reviews.reduce((acc, r) => acc + r.rating, 0);
    spot.rating.average = parseFloat((total / spot.reviews.length).toFixed(1));
    spot.rating.count = spot.reviews.length;

    await spot.save();
    res.status(201).json({ success: true, data: spot.reviews });
});

// @route   GET /api/spots/:id/availability?start=&end=
export const checkAvailability = asyncHandler(async (req, res) => {
    const { start, end } = req.query;
    const spot = await ParkingSpot.findById(req.params.id).select('unavailableTimeSlots isActive');

    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found.' });
    if (!spot.isActive) return res.status(200).json({ success: true, available: false, reason: 'inactive' });

    // Return all booked slots (stripped of internal bookingId) for calendar display
    const bookedSlots = spot.unavailableTimeSlots.map(s => ({
        start: s.startTime,
        end: s.endTime,
    }));

    if (start && end) {
        const available = spot.isSlotAvailable(start, end);
        // Find conflicting slot for user-friendly message
        const conflict = spot.unavailableTimeSlots.find(s => {
            const sStart = new Date(s.startTime).getTime();
            const sEnd = new Date(s.endTime).getTime();
            const rStart = new Date(start).getTime();
            const rEnd = new Date(end).getTime();
            return !(rEnd <= sStart || rStart >= sEnd);
        });
        return res.status(200).json({
            success: true,
            available,
            conflict: conflict ? {
                start: conflict.startTime,
                end: conflict.endTime,
            } : null,
            bookedSlots,
        });
    }

    // No range provided — just return all booked slots
    res.status(200).json({ success: true, available: true, bookedSlots });
});

// @route   POST /api/spots/:id/save
export const toggleSaveSpot = asyncHandler(async (req, res) => {
    const user = req.user;
    const spotId = req.params.id;
    const isSaved = user.savedSpots.includes(spotId);

    const update = isSaved
        ? { $pull: { savedSpots: spotId } }
        : { $addToSet: { savedSpots: spotId } };

    await user.constructor.findByIdAndUpdate(user._id, update);

    res.status(200).json({
        success: true,
        message: isSaved ? 'Spot removed from saved.' : 'Spot saved.',
        saved: !isSaved,
    });
});
