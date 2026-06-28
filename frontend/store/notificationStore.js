import { create } from 'zustand';

let idCounter = 0;

export const useNotificationStore = create((set, get) => ({
  notifications: [],

  add: (message, type = 'info', duration = 5000) => {
    const id = ++idCounter;
    set(state => ({
      notifications: [...state.notifications, { id, message, type, timestamp: Date.now() }]
    }));
    if (duration > 0) {
      setTimeout(() => get().remove(id), duration);
    }
    return id;
  },

  remove: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  clear: () => set({ notifications: [] })
}));
