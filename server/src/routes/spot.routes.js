import express from 'express';
import { protect, hostOnly } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createSpotSchema, searchSchema, reviewSchema } from '../validators/schemas.js';
import {
    searchSpots,
    getSpotById,
    createSpot,
    updateSpot,
    deleteSpot,
    getMySpots,
    addReview,
    toggleSaveSpot,
    checkAvailability,
} from '../controllers/spot.controller.js';

const router = express.Router();

// Public routes
router.get('/search', validate(searchSchema, 'query'), searchSpots);
router.get('/host/my-spots', protect, hostOnly, getMySpots);
router.get('/:id/availability', checkAvailability);
router.get('/:id', getSpotById);

// Protected routes
router.post('/', protect, hostOnly, validate(createSpotSchema), createSpot);
router.put('/:id', protect, hostOnly, updateSpot);
router.delete('/:id', protect, hostOnly, deleteSpot);
router.post('/:id/review', protect, validate(reviewSchema), addReview);
router.post('/:id/save', protect, toggleSaveSpot);

export default router;
