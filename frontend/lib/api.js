import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== 'undefined' && config.url && String(config.url).startsWith('/')) {
    const tiendaActiva = localStorage.getItem('tiendaActiva');
    if (tiendaActiva === 'zunto' || tiendaActiva === 'pizdo') {
      if (config.params && !('tienda' in config.params)) {
        config.params = { ...config.params, tienda: tiendaActiva };
      } else if (!config.params && !String(config.url).includes('tienda=')) {
        const separator = config.url.includes('?') ? '&' : '?';
        config.url = `${config.url}${separator}tienda=${tiendaActiva}`;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isBackgroundRequest = error.config?.skipAuthRedirect;
        const onAdminSection = window.location.pathname.startsWith('/admin');
        if (!isBackgroundRequest && onAdminSection) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;