import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  usuario: null,
  token: null,
  isAuthenticated: false,
  initialized: false,

  login: (token, usuario) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    set({ token, usuario, isAuthenticated: true, initialized: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ token: null, usuario: null, isAuthenticated: false, initialized: true });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const usuarioRaw = localStorage.getItem('usuario');
      if (token && usuarioRaw) {
        try {
          const usuario = JSON.parse(usuarioRaw);
          set({ token, usuario, isAuthenticated: true, initialized: true });
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          set({ initialized: true });
        }
      } else {
        set({ initialized: true });
      }
    }
  }
}));