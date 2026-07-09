'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { on, isConnected } from '../../lib/websocket';
import api from '../../lib/api';
import PasswordChangeModal from './PasswordChangeModal';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const [counts, setCounts] = useState({ novedadesActivas: 0, oficinaActivos: 0, devoluciones: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [openSections, setOpenSections] = useState({ pedidos: false, pizdo: false, lucidsales: false, admin: false });

  useEffect(() => {
    initTheme();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/dashboard/resumen');
      setCounts({
        novedadesActivas: data.novedades?.novedad || 0,
        oficinaActivos: data.oficina?.pendiente_llamar || 0,
        devoluciones: (data.novedades?.devolucion || 0) + (data.oficina?.devolucion || 0)
      });
    } catch {
      // silent failure for sidebar counters
    }
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    const unsub = on('dashboard:refresh', () => fetchCounts());
    return () => unsub();
  }, [fetchCounts]);

  const getInitials = (nombre) => {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isAdmin = usuario?.rol === 'admin';
  const canNov = isAdmin || usuario?.gestionaNovedades !== false;
  const canOfi = isAdmin || usuario?.gestionaOficina !== false;
  const showLucidsales = isAdmin || usuario?.accesoLucidsales === true;

  const mainItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '▣' },
    ...(canNov ? [{ href: '/novedades', label: 'Novedades', icon: '⚠', badge: counts.novedadesActivas > 0 ? counts.novedadesActivas : null, badgeColor: 'amber' }] : []),
    ...(canOfi ? [{ href: '/oficina', label: 'En oficina', icon: '📦', badge: counts.oficinaActivos > 0 ? counts.oficinaActivos : null }] : []),
    ...(canNov || canOfi ? [{ href: '/devoluciones', label: 'Devoluciones', icon: '↩️', badge: counts.devoluciones > 0 ? counts.devoluciones : null, badgeColor: 'purple' }] : []),
  ];

  const pedidosItems = [
    ...(canNov ? [{ href: '/solucionados', label: 'Solucionados', icon: '✅' }] : []),
    ...(canOfi ? [{ href: '/recoger', label: 'Por Recoger', icon: '📦' }] : []),
    { href: '/facturas', label: 'Facturas', icon: '📄' },
    { href: '/garantias', label: 'Garantías', icon: '📋' },
    { href: '/etiquetas', label: 'Etiquetas', icon: '🏷️' },
  ];

  const pizdoItems = [
    ...(showLucidsales || isAdmin ? [{ href: '/tienda', label: 'Tienda', icon: '🛒' }] : []),
    ...(isAdmin ? [{ href: '/tienda/admin', label: 'Admin Tienda', icon: '⚙' }] : []),
  ];

  const adminItems = isAdmin ? [
    { href: '/dashboard/metricas', label: 'Métricas', icon: '📊' },
    { href: '/pizdo', label: 'Productos Ganadores', icon: '🏆' },
    { href: '/tareas', label: 'Tareas', icon: '📋' },
    { href: '/usuarios', label: 'Usuarios', icon: '👥' },
    { href: '/configuracion', label: 'Configuración', icon: '⚙' },
    { href: '/apikey', label: 'API Keys', icon: '🔑' },
    { href: '/sesiones', label: 'Sesiones', icon: '🔐' },
  ] : [];

  const lucidsalesItems = showLucidsales ? [
    { href: '/lucidsales', label: 'LucidSales', icon: '💎' },
    { href: '/lucidsales/productos', label: 'Prod. LucidSales', icon: '📦' },
  ] : [];

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">
          <span className="logo-dot"></span>GestiónNovedades
        </div>
        <div className="logo-sub">v1.0 · desarrollo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 10 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: wsConnected ? 'var(--green)' : 'var(--red)',
            boxShadow: wsConnected ? '0 0 6px var(--green)' : 'none',
            transition: 'background 0.3s'
          }} />
          <span style={{ color: 'var(--text3)' }}>{wsConnected ? 'En vivo' : 'Sin conexión'}</span>
        </div>
      </div>

      <nav className="sidebar-section">
        {mainItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && <span className={`nav-badge ${item.badgeColor || ''}`}>{item.badge}</span>}
          </Link>
        ))}

        <div className="sidebar-label" onClick={() => toggleSection('pedidos')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Pedidos</span>
          <span style={{ fontSize: 10 }}>{openSections.pedidos ? '▲' : '▼'}</span>
        </div>
        {openSections.pedidos && pedidosItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="sidebar-label" onClick={() => toggleSection('pizdo')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Pizdo</span>
          <span style={{ fontSize: 10 }}>{openSections.pizdo ? '▲' : '▼'}</span>
        </div>
        {openSections.pizdo && pizdoItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {lucidsalesItems.length > 0 && (
          <>
            <div className="sidebar-label" onClick={() => toggleSection('lucidsales')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>LucidSales</span>
              <span style={{ fontSize: 10 }}>{openSections.lucidsales ? '▲' : '▼'}</span>
            </div>
            {openSections.lucidsales && lucidsalesItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </>
        )}

        {adminItems.length > 0 && (
          <>
            <div className="sidebar-label" onClick={() => toggleSection('admin')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Administración</span>
              <span style={{ fontSize: 10 }}>{openSections.admin ? '▲' : '▼'}</span>
            </div>
            {openSections.admin && adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </>
        )}
        </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">{getInitials(usuario?.nombre)}</div>
          <div className="user-info">
            <div className="name">{usuario?.nombre}</div>
            <div className="role">{usuario?.rol}</div>
          </div>
        </div>
        <button onClick={() => setShowPasswordModal(true)} className="btn btn-ghost" style={{ width: '100%', marginTop: 8, justifyContent: 'center', gap: 8 }}>
          🔒 Cambiar contraseña
        </button>
        <button onClick={toggleTheme} className="btn btn-ghost" style={{ width: '100%', marginTop: 4, justifyContent: 'center', gap: 8 }}>
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </button>
        <button onClick={() => { logout(); router.push('/login'); }} className="btn btn-ghost" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}>
          Cerrar Sesión
        </button>
      </div>
    </aside>

    {showPasswordModal && (
      <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
    )}
    </>
  );
}
