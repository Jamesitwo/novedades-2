'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { on, isConnected } from '../../lib/websocket';
import api from '../../lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const [counts, setCounts] = useState({ novedadesActivas: 0, oficinaActivos: 0, devoluciones: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  useEffect(() => {
    const unsub1 = on('__connect__', () => setWsConnected(true));
    const unsub2 = on('__disconnect__', () => setWsConnected(false));
    setWsConnected(isConnected());
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    const unsub = on('dashboard:refresh', () => {
      const fetchCounts = async () => {
        try {
          const { data } = await api.get('/api/dashboard/resumen');
          setCounts({
            novedadesActivas: data.novedades?.novedad || 0,
            oficinaActivos: data.oficina?.pendiente_llamar || 0,
            devoluciones: (data.novedades?.devolucion || 0) + (data.oficina?.devolucion || 0)
          });
        } catch {}
      };
      fetchCounts();
    });
    return () => unsub();
  }, []);

  const getInitials = (nombre) => {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/api/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 1500);
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '▣' },
    { href: '/novedades', label: 'Novedades', icon: '⚠', badge: counts.novedadesActivas > 0 ? counts.novedadesActivas : null, badgeColor: 'amber' },
    { href: '/oficina', label: 'En oficina', icon: '📦', badge: counts.oficinaActivos > 0 ? counts.oficinaActivos : null },
    { href: '/devoluciones', label: 'Devoluciones', icon: '↩️', badge: counts.devoluciones > 0 ? counts.devoluciones : null, badgeColor: 'purple' },
    { href: '/solucionados', label: 'Solucionados', icon: '✅' },
    { href: '/recoger', label: 'Por Recoger', icon: '📦' },
    { href: '/facturas', label: 'Facturas', icon: '📄' },
    { href: '/garantias', label: 'Garantías', icon: '📋' },
    { href: '/etiquetas', label: 'Etiquetas', icon: '🏷️' },
    { href: '/tienda', label: 'Pizdo', icon: '🏆' },
  ];

  if (usuario?.rol === 'admin') {
    menuItems.push({ href: '/dashboard/metricas', label: 'Métricas', icon: '📊' });
    menuItems.push({ href: '/lucidsales', label: 'LucidSales', icon: '💎' });
    menuItems.push({ href: '/lucidsales/productos', label: 'Productos', icon: '📦' });
    menuItems.push({ href: '/tareas', label: 'Tareas', icon: '📋' });
    menuItems.push({ href: '/pizdo', label: 'Pizdo', icon: '🏆' });
    menuItems.push({ href: '/usuarios', label: 'Usuarios', icon: '👥' });
    menuItems.push({ href: '/configuracion', label: 'Configuración', icon: '⚙' });
    menuItems.push({ href: '/apikey', label: 'API Keys', icon: '🔑' });
    menuItems.push({ href: '/sesiones', label: 'Sesiones', icon: '🔐' });
    menuItems.push({ href: '/tienda/admin', label: 'Admin Pizdo', icon: '🏆' });
  }

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
        <button onClick={() => setShowPasswordModal(true)} className="btn btn-ghost" style={{ width: '100%', marginTop: 8, justifyContent: 'center', gap: 8 }}>
          🔒 Cambiar contraseña
        </button>
        <button onClick={toggleTheme} className="btn btn-ghost" style={{ width: '100%', marginTop: 4, justifyContent: 'center', gap: 8 }}>
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </button>
        <button onClick={logout} className="btn btn-ghost" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}>
          Cerrar Sesión
        </button>
      </div>
    </aside>

    {showPasswordModal && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
      }}>
        <div style={{
          background: 'var(--bg2)', borderRadius: 14, width: 'min(400px, 92vw)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16 }}>
            Cambiar contraseña
          </div>
          {passwordSuccess ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--green)', fontWeight: 500 }}>
              ✅ Contraseña actualizada correctamente
            </div>
          ) : (
            <form onSubmit={handleChangePassword} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {passwordError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12
                }}>
                  {passwordError}
                </div>
              )}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Contraseña actual
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  autoFocus
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Nueva contraseña
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  placeholder="Mínimo 6 caracteres"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Confirmar nueva contraseña
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={() => { setShowPasswordModal(false); setPasswordError(''); }} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={passwordLoading} className="btn btn-primary">
                  {passwordLoading ? 'Cambiando...' : 'Cambiar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </>
  );
}
