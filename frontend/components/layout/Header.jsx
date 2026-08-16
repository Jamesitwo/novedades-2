'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Icon from '../ui/Icon';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario } = useAuthStore();

  useEffect(() => {
    document.body.classList.remove('sidebar-open');
  }, [pathname]);

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-open');
  };

  const getTitle = () => {
    if (pathname === '/admin/dashboard') return 'Dashboard';
    if (pathname.startsWith('/admin/dashboard/metricas')) return 'Métricas';
    if (pathname.startsWith('/admin/novedades')) return 'Novedades de entrega';
    if (pathname.startsWith('/admin/oficina')) return 'Paquetes en oficina';
    if (pathname.startsWith('/admin/usuarios')) return 'Gestión de usuarios';
    if (pathname.startsWith('/admin/configuracion')) return 'Configuración';
    if (pathname.startsWith('/admin/apikey')) return 'API Keys';
    if (pathname.startsWith('/admin/sesiones')) return 'Sesiones';
    if (pathname.startsWith('/admin/devoluciones')) return 'Devoluciones';
    if (pathname.startsWith('/admin/solucionados')) return 'Solucionados';
    if (pathname.startsWith('/admin/recoger')) return 'Por Recoger';
    if (pathname.startsWith('/admin/pizdo')) return 'Pizdo · Productos Ganadores';
    if (pathname.startsWith('/admin/etiquetas')) return 'Etiquetas';
    if (pathname.startsWith('/admin/facturas')) return 'Facturas';
    if (pathname.startsWith('/admin/garantias')) return 'Garantías';
    if (pathname.startsWith('/admin/tareas')) return 'Tareas';
    if (pathname.startsWith('/admin/plantillas')) return 'Plantillas WhatsApp';
    if (pathname.startsWith('/admin/tienda')) return 'Admin Tienda';
    if (pathname.startsWith('/admin/perfumes')) return 'Perfumes';
    if (pathname.startsWith('/admin/pedidos')) return 'Pedidos Tienda';
    if (pathname.startsWith('/admin/lucidsales/productos')) return 'LucidSales · Productos';
    if (pathname.startsWith('/admin/lucidsales')) return 'LucidSales · Pedidos';
    return '';
  };

  const getInitials = (nombre) => {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="topbar">
      <button
        className="hamburger-btn"
        onClick={toggleSidebar}
        aria-label="Menú"
      >
        <Icon name="menu" size={22} />
      </button>
      <h1 className="topbar-title">{getTitle()}</h1>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="topbar-date" style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }} suppressHydrationWarning>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <button
          className="topbar-avatar"
          onClick={() => router.push('/admin/configuracion')}
          title={usuario?.nombre || 'Perfil'}
        >
          {getInitials(usuario?.nombre)}
        </button>
      </div>
    </header>
  );
}
