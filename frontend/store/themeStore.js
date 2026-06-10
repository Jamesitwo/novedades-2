import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  theme: typeof window !== 'undefined' && localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    return { theme: newTheme };
  }),
  initTheme: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      set({ theme: saved });
    }
  }
}));