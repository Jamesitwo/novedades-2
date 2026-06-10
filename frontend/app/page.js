'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const router = useRouter();
  const { initialized, isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [initialized, isAuthenticated, router]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', color: '#8b90b0', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #2e3250',
          borderTopColor: '#5b6ef5', borderRadius: '50%', margin: '0 auto 16px',
          animation: 'spin08 0.8s linear infinite'
        }} />
        <style>{'@keyframes spin08{to{transform:rotate(360deg)}}'}</style>
        <div style={{ fontSize: 14 }}>Cargando...</div>
      </div>
    </div>
  );
}
