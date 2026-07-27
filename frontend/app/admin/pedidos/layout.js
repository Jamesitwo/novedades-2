'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';

export default function PedidosAdminLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, initialized, usuario, initialize } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) { router.push('/admin/login'); return; }
    if (usuario?.rol !== 'admin') { router.push('/admin/dashboard'); }
  }, [isAuthenticated, initialized, usuario, router]);

  if (!initialized || !isAuthenticated || usuario?.rol !== 'admin') return null;

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f9ff', color: '#0b1c30',
      fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 16
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        @media (max-width: 768px) {
          .admin-content { padding: 16px 12px !important; }
        }
      `}} />
      <div style={{
        background: '#213145', borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/admin/dashboard" style={{ color: '#ffb77d', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            ← Dashboard
          </a>
          <span style={{ color: '#cbdbf5', opacity: 0.4, fontSize: 18 }}>|</span>
          <span style={{ color: '#ff8c00', fontSize: 14, fontWeight: 700 }}>
            📦 Pedidos
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#ffb77d', fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            PIZDO ADMIN
          </span>
          <span style={{ color: '#cbdbf5', fontSize: 13, fontWeight: 600, opacity: 0.7 }}>
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
