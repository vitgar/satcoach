import api from './api';
import { AuthResponse, User } from '../types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    console.groupCollapsed('%c[AuthService][Register] Request Payload', 'color:#2563eb;font-weight:bold;');
    console.log('Endpoint:', '/auth/register');
    console.log('Payload (sanitized):', { ...data, password: '[REDACTED]' });
    console.groupEnd();

    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      console.groupCollapsed('%c[AuthService][Register] Success', 'color:#16a34a;font-weight:bold;');
      console.log('Response:', response.data);
      console.groupEnd();

      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      return response.data;
    } catch (error) {
      console.groupCollapsed('%c[AuthService][Register] Error', 'color:#dc2626;font-weight:bold;');
      console.error(error);
      console.groupEnd();
      throw error;
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.groupCollapsed('%c[AuthService][Login] Request Payload', 'color:#2563eb;font-weight:bold;');
    console.log('Endpoint:', '/auth/login');
    console.log('Payload (sanitized):', { ...credentials, password: '[REDACTED]' });
    console.groupEnd();

    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      console.groupCollapsed('%c[AuthService][Login] Success', 'color:#16a34a;font-weight:bold;');
      console.log('Response:', response.data);
      console.groupEnd();

      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      return response.data;
    } catch (error) {
      console.groupCollapsed('%c[AuthService][Login] Error', 'color:#dc2626;font-weight:bold;');
      console.error(error);
      console.groupEnd();
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {
    console.groupCollapsed('%c[AuthService][CurrentUser] Fetch', 'color:#2563eb;font-weight:bold;');
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      console.log('Response:', response.data);
      return response.data.user;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

