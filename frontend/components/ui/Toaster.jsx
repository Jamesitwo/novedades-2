'use client';

import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],
  show: (message, type = 'success') => {
    const id = Date.now() + Math.random();
    set(s => ({ toasts: [...s.toasts.slice(-3), { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
}));

export const toast = {
  success: (msg) => useToastStore.getState().show(msg, 'success'),
  error: (msg) => useToastStore.getState().show(msg, 'error'),
  info: (msg) => useToastStore.getState().show(msg, 'info')
};

const COLORS = {
  success: 'var(--green)',
  error: 'var(--red)',
  info: 'var(--accent)'
};

export default function Toaster() {
  const toasts = useToastStore(s => s.toasts);
  const remove = useToastStore(s => s.remove);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'min(360px, calc(100vw - 32px))' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${COLORS[t.type] || COLORS.info}`,
            borderRadius: 10,
            padding: '12px 16px',
            boxShadow: '0 10px 20px -5px rgba(0,0,0,0.35)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            cursor: 'pointer',
            animation: 'slideIn 0.25s ease'
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
