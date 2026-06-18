'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (document.body.classList.contains('sidebar-open')) {
        const sidebar = document.querySelector('.sidebar');
        const hamburger = document.querySelector('.hamburger-btn');
        if (sidebar && !sidebar.contains(e.target) && hamburger && !hamburger.contains(e.target)) {
          document.body.classList.remove('sidebar-open');
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.classList.remove('sidebar-open');
  }, [pathname]);

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-open');
  };

  const getTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/metricas')) return 'Métricas';
    if (pathname.startsWith('/novedades')) return 'Novedades de entrega';
    if (pathname.startsWith('/oficina')) return 'Paquetes en oficina';
    if (pathname.startsWith('/usuarios')) return 'Gestión de usuarios';
    if (pathname.startsWith('/configuracion')) return 'Configuración';
    if (pathname.startsWith('/apikey')) return 'API Keys';
    if (pathname.startsWith('/sesiones')) return 'Sesiones';
    if (pathname.startsWith('/devoluciones')) return 'Devoluciones';
    if (pathname.startsWith('/solucionados')) return 'Solucionados';
    if (pathname.startsWith('/recoger')) return 'Por Recoger';
    if (pathname.startsWith('/pizdo')) return 'Pizdo · Productos Ganadores';
    if (pathname.startsWith('/etiquetas')) return 'Etiquetas';
    if (pathname.startsWith('/facturas')) return 'Facturas';
    if (pathname.startsWith('/garantias')) return 'Garantías';
    if (pathname.startsWith('/tareas')) return 'Tareas';
    return '';
  };

  return (
    <header className="topbar">
      <button
        className="hamburger-btn"
        onClick={toggleSidebar}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          fontSize: 22,
          cursor: 'pointer',
          padding: '4px 6px',
          marginRight: 8,
          lineHeight: 1
        }}
        aria-label="Menú"
      >
        ☰
      </button>
      <h1 className="topbar-title">{getTitle()}</h1>
      <div style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: '11px', fontFamily: 'var(--mono)' }}>
        {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </header>
  );
}
