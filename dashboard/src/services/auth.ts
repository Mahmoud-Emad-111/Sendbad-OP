import axios from 'axios';

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80/api';

const api = axios.create({
    baseURL: BASE_API_URL,
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
// Ensure FormData requests don't keep the default JSON content-type so browser can set multipart boundary
api.interceptors.request.use((config) => {
    try {
        if (config && (config as any).data && (config as any).data instanceof FormData) {
            if (config.headers) {
                delete (config.headers as any)['Content-Type'];
                delete (config.headers as any)['content-type'];
            }
        }
    } catch (e) {
        // ignore
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
    getUsers: async (page?: number, search?: string, role?: string) => {
        const params: any = {};
        if (page) params.page = page;
        if (search) params.search = search;
        if (role) params.role = role;

        const response = await api.get('/admin/users', { params });
        return response.data;
    },
    getUserDetails: async (id: number) => {
        const response = await api.get(`/admin/users/${id}`);
        return response.data;
    },
    lookupUserByPhone: async (phone: string) => {
        const response = await api.get(`/admin/users/lookup/${phone}`);
        return response.data;
    },
    createManualUser: async (data: any) => {
        const response = await api.post('/admin/users', data);
        return response.data;
    },
    updateUser: async (id: number, data: any) => {
        try {
            const response = await api.put(`/admin/users/${id}`, data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    sendCustomNotification: async (data: any) => {
        try {
            const response = await api.post('/admin/notifications/send', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// Export API_URL for components that need to construct storage URLs
export const API_URL = BASE_API_URL;
export const getBaseUrl = () => API_URL.replace('/api', '').replace(/\/$/, '');

export default api;
