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

// Interceptor para debugging (opcional, pode remover em produção)
api.interceptors.request.use((config) => {
  // console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

export default api;
