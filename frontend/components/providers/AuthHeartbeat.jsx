'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function AuthHeartbeat({ children }) {
  const { isAuthenticated, initialize, initialized } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const send = () => { api.post('/api/sesiones/heartbeat').catch(() => {}); };
    send();
    const interval = setInterval(send, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!initialized) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text2)', fontSize: 14 }}>Cargando...</div>;
  }

  return children;
}
