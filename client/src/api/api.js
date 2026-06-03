import axios from 'axios';
import { Capacitor } from '@capacitor/core';

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://leelatech.co.in/api';

if (import.meta.env.DEV) {
    if (Capacitor.isNativePlatform()) {
        if (Capacitor.getPlatform() === 'android') {
            API_BASE_URL = 'http://10.0.2.2:5001/api';
        } else {
            API_BASE_URL = 'http://localhost:5001/api';
        }
    } else {
        API_BASE_URL = '/api';
    }
}

const api = axios.create({ baseURL: API_BASE_URL });

// Attach token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('mv_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

// Handle 401 and refresh tokens
api.interceptors.response.use(
    res => res,
    async err => {
        const originalRequest = err.config;

        // Don't retry auth endpoints or already-retried requests
        if (
            err.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('mv_refresh_token');
                if (!refreshToken) throw new Error('No refresh token');

                // Use a fresh axios instance to avoid interceptor loops
                const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                const { token, refreshToken: newRefreshToken } = res.data;

                localStorage.setItem('mv_token', token);
                localStorage.setItem('mv_refresh_token', newRefreshToken);

                api.defaults.headers.common.Authorization = `Bearer ${token}`;
                originalRequest.headers.Authorization = `Bearer ${token}`;

                processQueue(null, token);
                return api(originalRequest);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem('mv_token');
                localStorage.removeItem('mv_refresh_token');
                localStorage.removeItem('mv_user');
                // Only redirect if we're not already on the login page
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle network errors (CORS, offline, etc.) without forcing logout
        if (!err.response && err.message === 'Network Error') {
            console.warn('[API] Network error — possible CORS or connectivity issue');
        }

        return Promise.reject(err);
    }
);

export const authAPI = {
    register: data => api.post('/auth/register', data),
    login: data => api.post('/auth/login', data),
    forgotPassword: data => api.post('/auth/forgot-password', data),
    verifyOTP: data => api.post('/auth/verify-otp', data),
    logout: data => api.post('/auth/logout', data),
    refresh: data => api.post('/auth/refresh', data),
};

export const usersAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: data => api.put('/users/profile', data),
    updateThemePreference: data => api.put('/users/profile/theme', data),
    uploadPhoto: formData => api.post('/users/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    // Admin management of app users
    getAdminAll: params => api.get('/users/admin/all', { params }),
    adminCreate: data => api.post('/users/admin', data),
    adminUpdate: (id, data) => api.put(`/users/admin/${id}`, data),
    adminDelete: (id, password) => api.delete(`/users/admin/${id}`, { data: { password } }),
    adminGetUserParties: userId => api.get(`/users/admin/user-parties/${userId}`),
};

export const partiesAPI = {
    getAll: params => api.get('/parties', { params }),
    create: data => api.post('/parties', data),
    update: (id, data) => api.put(`/parties/${id}`, data),
    delete: (id, password) => api.delete(`/parties/${id}`, { data: { password } }),
};

export const eventsAPI = {
    getAll: config => api.get('/events', config),
    getUpcoming: config => api.get('/events/upcoming', config),
    create: formData => api.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) => api.put(`/events/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id, password) => api.delete(`/events/${id}`, { data: { password } }),
};

export const remindersAPI = {
    getAll: config => api.get('/reminders', config),
    getUpcoming: config => api.get('/reminders/upcoming', config),
    create: data => api.post('/reminders', data),
    update: (id, data) => api.put(`/reminders/${id}`, data),
    delete: (id, password) => api.delete(`/reminders/${id}`, { data: { password } }),
};

export const transactionsAPI = {
    getById: id => api.get(`/transactions/${id}`),
    getAll: params => api.get('/transactions', { params }),
    create: data => api.post('/transactions', data),
    bulkCreate: data => api.post('/transactions/bulk', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: (id, password) => api.delete(`/transactions/${id}`, { data: { password } }),
    getBalanceSheet: () => api.get('/transactions/balance-sheet'),
    getMasterSheet: () => api.get('/transactions/master-sheet'),
    getPersonDetail: params => api.get('/transactions/person-detail', { params }),
    search: params => api.get('/transactions/search', { params }),
};

export const tenantAPI = {
    getMembers: () => api.get('/tenant/members'),
    invite: data => api.post('/tenant/invite', data),
    remove: userId => api.post(`/tenant/remove/${userId}`),
    leave: () => api.post('/tenant/leave'),
    transfer: (userId, password) => api.post(`/tenant/transfer/${userId}`, { password }),
    createUser: data => api.post('/tenant/users', data),
    updateUser: (userId, data) => api.put(`/tenant/users/${userId}`, data),
    deleteUser: (userId, password) => api.delete(`/tenant/users/${userId}`, { data: { password } }),
};

export default api;
