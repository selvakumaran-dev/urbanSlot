import axios from 'axios';

const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        // Strip trailing slash if present from Render's injection, then append /api
        return `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`;
    }
    return '/api';
};

const API_BASE = getApiUrl();

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('urbanslot_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('urbanslot_token');
            localStorage.removeItem('urbanslot_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
