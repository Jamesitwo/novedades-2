'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import api from '../../lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const [counts, setCounts] = useState({ novedadesActivas: 0, oficinaActivos: 0, devoluciones: 0 });

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data } = await api.get('/api/dashboard/resumen');
        setCounts({
          novedadesActivas: data.novedades?.novedad || 0,
          oficinaActivos: data.oficina?.pendiente_llamar || 0,
          devoluciones: (data.novedades?.devolucion || 0) + (data.oficina?.devolucion || 0)
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();
  }, []);

  const getInitials = (nombre) => {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '▣' },
    { href: '/novedades', label: 'Novedades', icon: '⚠', badge: counts.novedadesActivas > 0 ? counts.novedadesActivas : null, badgeColor: 'amber' },
    { href: '/oficina', label: 'En oficina', icon: '📦', badge: counts.oficinaActivos > 0 ? counts.oficinaActivos : null },
    { href: '/devoluciones', label: 'Devoluciones', icon: '↩️', badge: counts.devoluciones > 0 ? counts.devoluciones : null, badgeColor: 'purple' },
  ];

  if (usuario?.rol === 'admin') {
    menuItems.push({ href: '/dashboard/metricas', label: 'Métricas', icon: '📊' });
    menuItems.push({ href: '/pizdo', label: 'Pizdo', icon: '🏆' });
    menuItems.push({ href: '/etiquetas', label: 'Etiquetas', icon: '🏷️' });
    menuItems.push({ href: '/usuarios', label: 'Usuarios', icon: '👥' });
    menuItems.push({ href: '/configuracion', label: 'Configuración', icon: '⚙' });
    menuItems.push({ href: '/apikey', label: 'API Keys', icon: '🔑' });
    menuItems.push({ href: '/sesiones', label: 'Sesiones', icon: '🔐' });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">
          <span className="logo-dot"></span>GestiónNovedades
        </div>
        <div className="logo-sub">v1.0 · desarrollo</div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Principal</div>
        {menuItems.map((item) => (
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
      </div>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">{getInitials(usuario?.nombre)}</div>
          <div className="user-info">
            <div className="name">{usuario?.nombre}</div>
            <div className="role">{usuario?.rol}</div>
          </div>
        </div>
        <button onClick={toggleTheme} className="btn btn-ghost" style={{ width: '100%', marginTop: 8, justifyContent: 'center', gap: 8 }}>
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </button>
        <button onClick={logout} className="btn btn-ghost" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}