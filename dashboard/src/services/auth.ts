import axios from 'axios';

// const API_URL = 'https://back.sindbad.om/public/api';
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Add token to requests if exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (phone: string, password: string) => {
        const response = await api.post('/auth/login', { phone, password });
        if (response.data.success) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

export const adminService = {
    getUsers: async (role?: string) => {
        const params = role ? { role } : {};
        const response = await api.get('/admin/users', { params });
        return response.data;
    },
    getUserDetails: async (id: number) => {
        const response = await api.get(`/admin/users/${id}`);
        return response.data;
    }
};

export default api;
