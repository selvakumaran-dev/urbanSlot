import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Login
            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await api.post('/auth/login', credentials);
                    localStorage.setItem('urbanslot_token', data.token);
                    initSocket(data.user._id);
                    set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
                    return { success: true };
                } catch (err) {
                    const res = err.response?.data;
                    const message = res?.errors?.[0]?.message || res?.message || 'Login failed';
                    set({ error: message, isLoading: false });
                    return {
                        success: false,
                        message,
                        isLocked: res?.isLocked || false,
                        lockMinutes: res?.lockMinutes || 0,
                    };
                }
            },

            // Register
            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await api.post('/auth/register', userData);
                    localStorage.setItem('urbanslot_token', data.token);
                    initSocket(data.user._id);
                    set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
                    return { success: true };
                } catch (err) {
                    const res = err.response?.data;
                    const message = res?.errors?.[0]?.message || res?.message || 'Registration failed';
                    set({ error: message, isLoading: false });
                    return { success: false, message };
                }
            },

            // Logout
            logout: () => {
                localStorage.removeItem('urbanslot_token');
                disconnectSocket();
                set({ user: null, token: null, isAuthenticated: false });
            },

            // Update user in store
            updateUser: (updates) => {
                set((state) => ({ user: { ...state.user, ...updates } }));
            },

            // Fetch fresh me
            fetchMe: async () => {
                try {
                    const { data } = await api.get('/auth/me');
                    set({ user: data.user });
                } catch (err) {
                    // Only log out on 401 Unauthorized — NOT on network errors or server restarts
                    if (err.response?.status === 401) {
                        get().logout();
                    }
                    // For other errors (network blip, 500) — silently ignore to preserve session
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'urbanslot-auth',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);

export default useAuthStore;
