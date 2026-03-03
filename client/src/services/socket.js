import io from 'socket.io-client';

let socket = null;

export const initSocket = (userId) => {
    if (socket?.connected) return socket;

    const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

    socket = io(SOCKET_URL, {
        transports: ['websocket'],
        withCredentials: true,
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
        socket.emit('join', { userId });
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
