import mongoose from 'mongoose';

const unavailableSlotSchema = new mongoose.Schema({
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
});

const reviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

const parkingSpotSchema = new mongoose.Schema(
    {
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Spot title is required'],
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            maxlength: 1000,
            default: '',
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, default: 'India' },
            displayAddress: String, // Formatted single string for display
        },

        // ======= GeoJSON Location (required for $near queries) =======
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },

        // ======= Pricing =======
        pricing: {
            hourlyRate: {
                type: Number,
                required: [true, 'Hourly rate is required'],
                min: 0,
            },
            dailyRate: { type: Number, default: 0 },
            currency: { type: String, default: 'INR' },
        },

        // ======= Smart Dynamic Pricing Config =======
        dynamicPricing: {
            enabled: { type: Boolean, default: true },
            peakMultiplier: { type: Number, default: 1.5 }, // 1.5x during peak hours
            peakHours: {
                start: { type: Number, default: 8 },  // 8 AM
                end: { type: Number, default: 10 },   // 10 AM
            },
            eveningPeakHours: {
                start: { type: Number, default: 17 }, // 5 PM
                end: { type: Number, default: 20 },   // 8 PM
            },
            eventMultiplier: { type: Number, default: 2.0 },
        },

        // ======= Availability =======
        isActive: { type: Boolean, default: true },
        isInstantBook: { type: Boolean, default: false },
        unavailableTimeSlots: [unavailableSlotSchema],

        availableHours: {
            start: { type: String, default: '00:00' },
            end: { type: String, default: '23:59' },
        },

        availableDays: {
            type: [String],
            enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },

        // ======= Spot Details =======
        spotType: {
            type: String,
            enum: ['uncovered', 'covered', 'garage', 'basement', 'valet'],
            default: 'uncovered',
        },
        vehicleTypes: {
            type: [String],
            enum: ['bike', 'car', 'suv', 'truck'],
            default: ['car'],
        },
        amenities: {
            type: [String],
            enum: ['cctv', 'lighting', 'security', 'ev_charging', 'wheelchair', 'gated'],
            default: [],
        },
        images: [{ type: String }],

        // ======= Stats =======
        totalBookings: { type: Number, default: 0 },
        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
        reviews: [reviewSchema],

        // ======= Optimistic Locking =======
        // Mongoose's built-in __v (versionKey) serves as our optimistic lock key.
        // We also add a dedicated concurrencyVersion for explicit conflict checks.
        concurrencyVersion: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        optimisticConcurrency: true, // Uses __v for optimistic locking
    }
);

// ======= Indexes =======
parkingSpotSchema.index({ location: '2dsphere' });
parkingSpotSchema.index({ 'address.city': 1 });
parkingSpotSchema.index({ host: 1 });
parkingSpotSchema.index({ isActive: 1 });
parkingSpotSchema.index({ 'pricing.hourlyRate': 1 });

// ======= Virtual: calculated price (applies dynamic pricing) =======
parkingSpotSchema.methods.getEffectivePrice = function (startHour) {
    const { hourlyRate } = this.pricing;
    if (!this.dynamicPricing.enabled) return hourlyRate;

    const { peakHours, eveningPeakHours, peakMultiplier } = this.dynamicPricing;
    const isPeakMorning = startHour >= peakHours.start && startHour < peakHours.end;
    const isPeakEvening = startHour >= eveningPeakHours.start && startHour < eveningPeakHours.end;

    if (isPeakMorning || isPeakEvening) {
        return parseFloat((hourlyRate * peakMultiplier).toFixed(2));
    }
    return hourlyRate;
};

// ======= Static: check slot availability =======
parkingSpotSchema.methods.isSlotAvailable = function (requestedStart, requestedEnd) {
    const reqStart = new Date(requestedStart).getTime();
    const reqEnd = new Date(requestedEnd).getTime();

    return !this.unavailableTimeSlots.some((slot) => {
        const slotStart = new Date(slot.startTime).getTime();
        const slotEnd = new Date(slot.endTime).getTime();
        // Overlap check: requested overlaps if not (reqEnd <= slotStart || reqStart >= slotEnd)
        return !(reqEnd <= slotStart || reqStart >= slotEnd);
    });
};

const ParkingSpot = mongoose.model('ParkingSpot', parkingSpotSchema);
export default ParkingSpot;
