'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';

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
    <div style={{
      minHeight: '100vh', background: '#f7fafc', color: '#181c1e',
      fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 16
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        @media (max-width: 768px) {
          .admin-content { padding: 16px 12px !important; }
        }
      `}} />
      <div style={{
        background: '#181c1e', borderBottom: '2px solid #181c1e',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/dashboard" style={{ color: '#ffb875', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            ← Dashboard
          </a>
          <span style={{ color: '#887362', fontSize: 18 }}>|</span>
          <a href="/tienda" target="_blank" style={{ color: '#f28c00', textDecoration: 'none', fontSize: 14, fontWeight: 800 }}>
            Ver Tienda →
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#ffb875', fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
            PIZDO ADMIN
          </span>
          <span style={{ color: '#887362', fontSize: 13, fontWeight: 700 }}>
            {usuario?.nombre}
          </span>
        </div>
      </div>
      <div className="admin-content" style={{ padding: '24px 24px 64px', maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}
