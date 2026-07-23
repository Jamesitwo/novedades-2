'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import Sidebar from '../../../components/layout/Sidebar';

export default function TiendaAdminLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, initialized, usuario, initialize } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (usuario?.rol !== 'admin') { router.push('/dashboard'); }
  }, [isAuthenticated, initialized, usuario, router]);

  if (!initialized || !isAuthenticated || usuario?.rol !== 'admin') return null;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: '#181c1e', color: '#ffb875', borderBottom: '2px solid #181c1e',
          padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 13, fontWeight: 700, fontFamily: '"Inter", sans-serif'
        }}>
          <a href="/dashboard" style={{ color: '#ffb875', textDecoration: 'none' }}>← Dashboard</a>
          <span style={{ color: '#887362' }}>|</span>
          <a href="/tienda" target="_blank" style={{ color: '#f28c00', textDecoration: 'none', fontWeight: 800 }}>Pizdo Admin</a>
        </div>
        {children}
      </div>
    </div>
  );
}
