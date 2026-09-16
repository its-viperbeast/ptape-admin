// lib/axios.js
import axios from 'axios';

const PRODUCTION_API = 'https://api.porntape.net/api/v1/admin/';
const LOCAL_API = 'http://localhost:5551/api/v1/admin/';

function adminApiBaseURL() {
    if (typeof window !== 'undefined') {
        const { hostname } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return LOCAL_API;
        }
    }
    return PRODUCTION_API;
}

const axiosInstance = axios.create({
    baseURL: PRODUCTION_API,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Optional: Add interceptors for request/response
axiosInstance.interceptors.request.use(
    (config) => {
        config.baseURL = adminApiBaseURL();
        // Example: attach auth token
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) config.headers.Authorization = `Bearer ${token}`;
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            if (config.headers && typeof config.headers.delete === 'function') {
                config.headers.delete('Content-Type');
            } else {
                delete config.headers['Content-Type'];
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
