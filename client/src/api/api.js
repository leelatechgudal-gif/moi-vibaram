import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE_URL = '/api';

const api = axios.create({ baseURL: API_BASE_URL });

// Attach token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('mv_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('mv_token');
            localStorage.removeItem('mv_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export const authAPI = {
    register: data => api.post('/auth/register', data),
    login: data => api.post('/auth/login', data),
    forgotPassword: data => api.post('/auth/forgot-password', data),
    verifyOTP: data => api.post('/auth/verify-otp', data),
    logout: () => api.post('/auth/logout'),
};

export const usersAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: data => api.put('/users/profile', data),
    updateThemePreference: data => api.put('/users/profile/theme', data),
    uploadPhoto: formData => api.post('/users/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    // Contact (Persons) CRUD mapped to /api/users
    getAll: params => api.get('/users', { params }),
    create: data => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: id => api.delete(`/users/${id}`),
};

export const eventsAPI = {
    getAll: config => api.get('/events', config),
    getUpcoming: config => api.get('/events/upcoming', config),
    create: formData => api.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) => api.put(`/events/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: id => api.delete(`/events/${id}`),
};

export const transactionsAPI = {
    getById: id => api.get(`/transactions/${id}`),
    getAll: params => api.get('/transactions', { params }),
    create: data => api.post('/transactions', data),
    bulkCreate: data => api.post('/transactions/bulk', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: id => api.delete(`/transactions/${id}`),
    getBalanceSheet: () => api.get('/transactions/balance-sheet'),
    getMasterSheet: () => api.get('/transactions/master-sheet'),
    getPersonDetail: params => api.get('/transactions/person-detail', { params }),
    search: params => api.get('/transactions/search', { params }),
};

export default api;
