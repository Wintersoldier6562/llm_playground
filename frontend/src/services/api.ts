import axios from 'axios';
import config from '../config';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await api.post('/auth/refresh', null, {
          params: { refresh_token: refreshToken },
        });
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, full_name?: string) => {
    const response = await api.post('/auth/register', { email, password, full_name });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const comparison = {
  getHistory: async () => {
    const response = await api.get('/comparison/history');
    return response.data;
  },
  deletePrompt: async (promptId: string) => {
    const response = await api.delete(`/comparison/${promptId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/comparison/create', data);
    return response.data;
  },
  getModels: async () => {
    const response = await api.get('/comparison/models');
    return response.data;
  },
  compare: async (prompt: string, providerModels: Record<string, string>, isFreeTier?: boolean, maxTokens?: number) => {
    const token = localStorage.getItem('access_token');
    const endpoint = isFreeTier ? '/comparison/compare-free' : '/comparison/compare';
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider_models: providerModels,
        max_tokens: maxTokens
      })
    });
    if (!response.ok) {
      const error = new Error(response.status === 429 ? '429: Rate limit exceeded' : `HTTP error! status: ${response.status}`);
      // @ts-ignore
      error.status = response.status;
      throw error;
    }
    return response;
  }
};

export default api; 