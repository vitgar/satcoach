import axios from 'axios';

const API_URL = import.meta.env.VITE_DB_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token and log outgoing requests
api.interceptors.request.use(
  (config) => {
    const { method, url, baseURL } = config;
    console.groupCollapsed(
      `%c[API][Request] ${method?.toUpperCase() || 'GET'} ${baseURL}${url}`,
      'color:#2563eb;font-weight:bold;'
    );
    console.log('Config:', config);
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Auth Token Attached:', true);
    } else {
      console.log('Auth Token Attached:', false);
    }
    console.groupEnd();
    return config;
  },
  (error) => {
    console.groupCollapsed('%c[API][Request][Error]', 'color:#dc2626;font-weight:bold;');
    console.error(error);
    console.groupEnd();
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.groupCollapsed(
      `%c[API][Response] ${response.status} ${response.config?.method?.toUpperCase() || ''} ${response.config?.url}`,
      'color:#16a34a;font-weight:bold;'
    );
    console.log('Response Data:', response.data);
    console.groupEnd();
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || 'Unknown URL';
    console.groupCollapsed(
      `%c[API][Response][Error] ${status || 'NO_STATUS'} ${error.config?.method?.toUpperCase() || ''} ${requestUrl}`,
      'color:#dc2626;font-weight:bold;'
    );
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. Raw request:', error.request);
    }
    console.groupEnd();

    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

