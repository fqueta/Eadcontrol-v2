import axios from 'axios';
import { getTenantApiUrl, getVersionApi } from '@/lib/qlib';

/**
 * Instância global do Axios configurada para a API
 * Use 'withCredentials' para sessões Sanctum
 */
const api = axios.create({
  baseURL: `${getTenantApiUrl()}${getVersionApi()}`,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:invalid_token'));
    }
    return Promise.reject(error);
  }
);

export default api;
