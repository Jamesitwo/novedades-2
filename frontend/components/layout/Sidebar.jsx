'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { on, isConnected } from '../../lib/websocket';
import api from '../../lib/api';
import PasswordChangeModal from './PasswordChangeModal';
import Toaster from '../ui/Toaster';
import Icon from '../ui/Icon';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const [counts, setCounts] = useState({ novedadesActivas: 0, oficinaActivos: 0, devoluciones: 0, perfumesPendientes: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [openSections, setOpenSections] = useState({ logistics: true, finance: true, channels: true, system: true });

  useEffect(() => {
    initTheme();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/dashboard/resumen');
      setCounts(prev => ({
        ...prev,
        novedadesActivas: data.novedades?.novedad || 0,
        oficinaActivos: data.oficina?.pendiente_llamar || 0,
        devoluciones: (data.novedades?.devolucion || 0) + (data.oficina?.devolucion || 0)
      }));
    } catch {
      // silent failure for sidebar counters
    }
    try {
      const { usuario } = useAuthStore.getState();
      if (usuario?.rol === 'admin') {
        const { data } = await api.get('/api/pedidos/resumen?tienda=perfumes');
        setCounts(prev => ({ ...prev, perfumesPendientes: data.pendientes || 0 }));
      }
    } catch {
      // tienda perfumes sin pedidos o sin permiso
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

  const NavItem = ({ href, icon, label, badge, badgeColor, exact }) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`nav-item ${active ? 'active' : ''}`}
      >
        <span className="nav-icon"><Icon name={icon} size={18} /></span>
        <span className="nav-text">{label}</span>
        {badge && <span className={`nav-badge ${badgeColor || ''}`}>{badge}</span>}
      </Link>
    );
  };

  const Section = ({ title, children, sectionKey }) => (
    <>
      <div className="sidebar-label" onClick={() => setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}>
        {title}
        <span className="sidebar-label-arrow">{openSections[sectionKey] ? '▼' : '▶'}</span>
      </div>
      {openSections[sectionKey] && children}
    </>
  );

  return (
    <>
    <Toaster />
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">
          <span className="logo-dot"></span>AdminPanel
        </div>
        <div className="logo-sub">Back-office · Pizdo</div>
        <div className="sidebar-status" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 10 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: wsConnected ? 'var(--green)' : 'var(--red)',
            boxShadow: wsConnected ? '0 0 6px var(--green)' : 'none',
            transition: 'background 0.3s'
          }} />
          <span className="nav-text" style={{ color: 'var(--text3)' }}>{wsConnected ? 'En vivo' : 'Sin conexión'}</span>
        </div>
      </div>

      <div className="sidebar-new-btn-wrap">
        <Link href="/admin/novedades/nueva" className="sidebar-new-btn">
          <Icon name="add" size={18} />
          <span className="nav-text">Nueva novedad</span>
        </Link>
      </div>

      <nav className="sidebar-section">
        <NavItem href="/admin/dashboard" icon="dashboard" label="Dashboard" exact />

        <Section title="Logística" sectionKey="logistics">
          {canNov && <NavItem href="/admin/novedades" icon="local_shipping" label="Novedades" badge={counts.novedadesActivas > 0 ? counts.novedadesActivas : null} badgeColor="amber" />}
          {canOfi && <NavItem href="/admin/oficina" icon="inventory_2" label="En oficina" badge={counts.oficinaActivos > 0 ? counts.oficinaActivos : null} badgeColor="amber" />}
          {(canNov || canOfi) && <NavItem href="/admin/devoluciones" icon="assignment_return" label="Devoluciones" badge={counts.devoluciones > 0 ? counts.devoluciones : null} badgeColor="purple" />}
          {canOfi && <NavItem href="/admin/recoger" icon="hail" label="Por Recoger" />}
          {canNov && <NavItem href="/admin/solucionados" icon="check_circle" label="Solucionados" />}
        </Section>

        <Section title="Finanzas y Admin" sectionKey="finance">
          <NavItem href="/admin/facturas" icon="receipt_long" label="Facturas" />
          <NavItem href="/admin/garantias" icon="verified" label="Garantías" />
          <NavItem href="/admin/etiquetas" icon="label" label="Etiquetas" />
        </Section>

        <Section title="Canales" sectionKey="channels">
          {(showLucidsales || isAdmin) && <NavItem href="/" icon="storefront" label="Pizdo · Tienda" exact />}
          {isAdmin && <NavItem href="/admin/perfumes" icon="sanitizer" label="Perfumes" badge={counts.perfumesPendientes > 0 ? counts.perfumesPendientes : null} badgeColor="purple" />}
          {showLucidsales && <NavItem href="/admin/lucidsales" icon="shopping_cart" label="LucidSales" />}
        </Section>

        <Section title="Sistema" sectionKey="system">
          {isAdmin && <NavItem href="/admin/dashboard/metricas" icon="bar_chart" label="Métricas" />}
          {isAdmin && <NavItem href="/admin/tareas" icon="task_alt" label="Tareas" />}
          {isAdmin && <NavItem href="/admin/tienda" icon="store" label="Admin Tienda" />}
          {isAdmin && <NavItem href="/admin/pedidos" icon="package_2" label="Pedidos" />}
          {isAdmin && <NavItem href="/admin/pizdo" icon="trophy" label="P. Ganadores" />}
          {isAdmin && <NavItem href="/admin/usuarios" icon="group" label="Usuarios" />}
          {isAdmin && <NavItem href="/admin/plantillas" icon="forum" label="Plantillas" />}
          {isAdmin && <NavItem href="/admin/configuracion" icon="settings" label="Configuración" />}
          {isAdmin && <NavItem href="/admin/apikey" icon="key" label="API Keys" />}
          {isAdmin && <NavItem href="/admin/sesiones" icon="lock_clock" label="Sesiones" />}
        </Section>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">{getInitials(usuario?.nombre)}</div>
          <div className="user-info">
            <div className="name">{usuario?.nombre}</div>
            <div className="role">{usuario?.rol} · {usuario?.email}</div>
          </div>
        </div>
        <div className="sidebar-bottom-actions">
          <button onClick={() => setShowPasswordModal(true)} className="btn btn-ghost" title="Cambiar contraseña">
            <Icon name="key" size={16} />
            <span className="nav-text">Contraseña</span>
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost" title="Cambiar tema">
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={16} />
            <span className="nav-text">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
          <button onClick={() => { logout(); router.push('/admin/login'); }} className="btn btn-ghost" title="Cerrar sesión">
            <Icon name="logout" size={16} />
            <span className="nav-text">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>

    {showPasswordModal && (
      <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
    )}
    </>
  );
}
