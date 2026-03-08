import dotenv from 'dotenv';
dotenv.config(); // Must be first — before any code that reads process.env

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import connectDB from './src/config/db.js';
import { initSocket } from './src/services/socket.service.js';
import { errorHandler } from './src/middlewares/error.middleware.js';

import authRoutes from './src/routes/auth.routes.js';
import spotRoutes from './src/routes/spot.routes.js';
import bookingRoutes from './src/routes/booking.routes.js';
import geoRoutes from './src/routes/geo.routes.js';

const app = express();
const httpServer = http.createServer(app);

// Trust Render's reverse proxy so rate limiters see the real client IP.
app.set('trust proxy', 1);

const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(url => url.trim()) : ['http://localhost:5173'];

// ======= Socket.io setup =======
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

initSocket(io);

// ======= Middlewares =======
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ======= Gzip/Brotli Compression (avg 70% smaller responses) =======
app.use(compression({
    level: 6,          // good balance between speed and compression ratio
    threshold: 1024,   // only compress responses > 1 KB
    filter: (req, res) => {
        // Don't compress server-sent events or WebSocket upgrades
        if (req.headers['accept'] === 'text/event-stream') return false;
        return compression.filter(req, res);
    },
}));

// ======= Performance: smart cache-control headers =======
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        // API: no cache — always fresh data
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
});

// ======= Attach io to res so controllers can emit events =======
app.use((req, res, next) => {
    res.io = io;
    next();
});

// ======= Health check =======
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'UrbanSlot API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// ======= API Routes =======
app.use('/api/auth', authRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/geo', geoRoutes);

// ======= 404 Handler =======
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ======= Global Error Handler =======
app.use(errorHandler);

// ======= Bootstrap =======
const PORT = process.env.PORT || 5000;

const start = async () => {
    await connectDB();
    httpServer.listen(PORT, () => {
        console.log(`
🚀 UrbanSlot Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
📡 WebSocket: enabled
🌐 CORS Origin: ${process.env.CLIENT_URL}
    `);
    });
};

start();
