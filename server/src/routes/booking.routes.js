import express from 'express';
import { protect, hostOnly } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createBookingSchema, updateBookingStatusSchema } from '../validators/schemas.js';
import {
    createBooking,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking,
    getHostDashboard,
    confirmBooking,
} from '../controllers/booking.controller.js';

const router = express.Router();

router.use(protect); // All booking routes require auth

router.get('/my', getMyBookings);
router.get('/host/dashboard', getHostDashboard);
router.post('/', validate(createBookingSchema), createBooking);
router.get('/:id', getBookingById);
router.put('/:id/confirm', confirmBooking);
router.put('/:id/status', hostOnly, validate(updateBookingStatusSchema), updateBookingStatus);
router.delete('/:id', cancelBooking);

export default router;
