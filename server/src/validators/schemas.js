import { z } from 'zod';

// ======= Strong Password Rule =======
const strongPassword = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .refine((p) => /[A-Z]/.test(p), { message: 'Must contain at least one uppercase letter' })
    .refine((p) => /[a-z]/.test(p), { message: 'Must contain at least one lowercase letter' })
    .refine((p) => /[0-9]/.test(p), { message: 'Must contain at least one number' })
    .refine((p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p), {
        message: 'Must contain at least one special character (!@#$%^&* etc.)',
    });

// ======= Auth Schemas =======
export const registerSchema = z.object({
    firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50)
        .refine((v) => /^[a-zA-Z\s'-]+$/.test(v), { message: 'First name contains invalid characters' }),
    lastName: z
        .string()
        .min(1, 'Last name must be at least 1 character')
        .max(50)
        .refine((v) => /^[a-zA-Z\s'-]+$/.test(v), { message: 'Last name contains invalid characters' }),
    password: strongPassword,
    role: z.enum(['driver', 'host']).optional().default('driver'),
    phone: z
        .string()
        .optional()
        .refine((v) => !v || /^\+?[\d\s\-()]{7,15}$/.test(v), {
            message: 'Invalid phone number format',
        }),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
});

// ======= Parking Spot Schemas =======
export const createSpotSchema = z.object({
    title: z.string().min(5).max(100),
    description: z.string().max(1000).optional(),
    address: z.object({
        street: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().optional(),
    }),
    location: z.object({
        coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
    }),
    pricing: z.object({
        hourlyRate: z.number().positive('Hourly rate must be positive'),
        dailyRate: z.number().nonnegative().optional(),
    }),
    spotType: z.enum(['uncovered', 'covered', 'garage', 'basement', 'valet']).optional(),
    vehicleTypes: z.array(z.enum(['bike', 'car', 'suv', 'truck'])).optional(),
    amenities: z.array(z.string()).optional(),
    isInstantBook: z.boolean().optional(),
    availableDays: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
});

// ======= Booking Schemas =======
export const createBookingSchema = z.object({
    spotId: z.string().min(1, 'Spot ID is required'),
    startTime: z.string().datetime('Invalid start time'),
    endTime: z.string().datetime('Invalid end time'),
    vehicleInfo: z
        .object({
            plate: z.string().optional(),
            model: z.string().optional(),
            color: z.string().optional(),
        })
        .optional(),
    paymentMethod: z.enum(['card', 'upi', 'wallet', 'cash', 'p2p_direct']).optional(),
});

export const updateBookingStatusSchema = z.object({
    status: z.enum(['confirmed', 'active', 'completed', 'cancelled']),
    note: z.string().optional(),
});

// ======= Review Schema =======
export const reviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

// ======= Search Schema =======
export const searchSchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().min(100).max(50000).optional().default(5000),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    spotType: z.enum(['uncovered', 'covered', 'garage', 'basement', 'valet', 'any']).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    vehicleType: z.enum(['bike', 'car', 'suv', 'truck']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
