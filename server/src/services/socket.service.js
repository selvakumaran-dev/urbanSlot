/**
 * UrbanSlot Socket.io Service
 * Manages real-time events:
 * - Booking notifications
 * - "Booking starts in 15 minutes" reminders
 * - Online presence tracking
 */

const connectedUsers = new Map(); // userId -> Set of socket IDs

export const initSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // ======= Join personal room on auth =======
        socket.on('join', ({ userId }) => {
            if (!userId) return;

            socket.join(`user:${userId}`);

            if (!connectedUsers.has(userId)) {
                connectedUsers.set(userId, new Set());
            }
            connectedUsers.get(userId).add(socket.id);

            console.log(`👤 User ${userId} joined. Online users: ${connectedUsers.size}`);

            // Confirm connection
            socket.emit('connected', { message: 'Real-time connection established!' });
        });

        // ======= Booking Reminder (triggered by scheduler) =======
        socket.on('send_reminder', ({ userId, bookingId, message }) => {
            io.to(`user:${userId}`).emit('booking_reminder', {
                bookingId,
                message,
                timestamp: new Date().toISOString(),
            });
        });

        // ======= Typing / Chat indicators (future feature) =======
        socket.on('typing', ({ roomId }) => {
            socket.to(roomId).emit('user_typing', { userId: socket.userId });
        });

        // ======= Disconnect =======
        socket.on('disconnect', (reason) => {
            console.log(`❌ Socket disconnected: ${socket.id} — ${reason}`);

            // Remove from connected users
            connectedUsers.forEach((sockets, userId) => {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) connectedUsers.delete(userId);
                }
            });
        });
    });

    // ======= Booking Reminder Scheduler =======
    // Runs every 5 minutes, finds bookings starting in ~15 min and sends reminders
    setInterval(async () => {
        try {
            const { default: Booking } = await import('../models/Booking.model.js');
            const now = new Date();
            const in15 = new Date(now.getTime() + 15 * 60 * 1000);
            const in20 = new Date(now.getTime() + 20 * 60 * 1000);

            const upcoming = await Booking.find({
                status: 'confirmed',
                startTime: { $gte: in15, $lte: in20 },
                reminderSent: false,
            });

            for (const booking of upcoming) {
                io.to(`user:${booking.driver.toString()}`).emit('booking_reminder', {
                    bookingId: booking._id,
                    message: `⏰ Your parking booking starts in 15 minutes!`,
                    startTime: booking.startTime,
                });

                // Mark reminder as sent
                booking.reminderSent = true;
                await booking.save();

                console.log(`📬 Reminder sent for booking ${booking._id}`);
            }
        } catch (err) {
            console.error('Reminder scheduler error:', err.message);
        }
    }, 5 * 60 * 1000);

    return io;
};

export const getConnectedUsers = () => connectedUsers;
