import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        spot: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ParkingSpot',
            required: true,
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // ======= Booking Time =======
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        duration: { type: Number }, // in hours

        // ======= Booking Lifecycle State Machine =======
        // Pending -> Confirmed -> Active -> Completed -> Reviewed
        // Can also transition to: Cancelled
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'active', 'completed', 'reviewed', 'cancelled'],
            default: 'pending',
        },

        statusHistory: [
            {
                status: String,
                changedAt: { type: Date, default: Date.now },
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                note: String,
            },
        ],

        // ======= Pricing Snapshot =======
        pricing: {
            baseHourlyRate: { type: Number, required: true },
            effectiveHourlyRate: { type: Number, required: true }, // After dynamic pricing
            subtotal: { type: Number, required: true },
            serviceFee: { type: Number, default: 0 },
            total: { type: Number, required: true },
            currency: { type: String, default: 'INR' },
            isDynamicPricing: { type: Boolean, default: false },
            dynamicMultiplier: { type: Number, default: 1.0 },
        },

        // ======= Payment =======
        payment: {
            method: {
                type: String,
                enum: ['card', 'upi', 'wallet', 'cash', 'p2p_direct'],
                default: 'card',
            },
            status: {
                type: String,
                enum: ['pending', 'paid', 'refunded', 'failed'],
                default: 'pending',
            },
            stripePaymentIntentId: String,
            paidAt: Date,
        },

        // ======= Vehicle Info snapshot =======
        vehicleInfo: {
            plate: String,
            model: String,
            color: String,
        },

        // ======= Notifications sent =======
        reminderSent: { type: Boolean, default: false },

        // ======= Review =======
        driverReview: {
            rating: { type: Number, min: 1, max: 5 },
            comment: String,
            createdAt: Date,
        },

        cancellationReason: String,
        cancelledAt: Date,
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
    }
);

// ======= Pre-save: compute duration =======
bookingSchema.pre('save', function (next) {
    if (this.startTime && this.endTime) {
        const ms = new Date(this.endTime) - new Date(this.startTime);
        this.duration = ms / (1000 * 60 * 60); // hours
    }
    next();
});

// ======= Pre-save: track status history =======
bookingSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.statusHistory.push({ status: this.status, changedAt: new Date() });
    }
    next();
});

// ======= Indexes =======
bookingSchema.index({ driver: 1, status: 1 });
bookingSchema.index({ spot: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ host: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startTime: 1 }); // For reminder scheduler

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
