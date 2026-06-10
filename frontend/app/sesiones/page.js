'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function SesionesPage() {
  const router = useRouter();
  const { usuario, isAuthenticated } = useAuthStore();
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchSesiones();
  }, []);

  const fetchSesiones = async () => {
    try {
      const { data } = await api.get('/api/sesiones');
      setSesiones(data);
    } catch (error) {
      showToast('Error al cargar sesiones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const eliminarSesion = async (id) => {
    if (!confirm('¿Cerrar esta sesión?')) return;
    try {
      await api.delete(`/api/sesiones/${id}`);
      showToast('Sesión cerrada');
      fetchSesiones();
    } catch (error) {
      showToast('Error al cerrar sesión', 'error');
    }
  };

  const eliminarSesionesUsuario = async (usuarioId) => {
    if (!confirm('¿Cerrar todas las sesiones de este usuario?')) return;
    try {
      await api.delete(`/api/sesiones/usuario/${usuarioId}`);
      showToast('Sesiones cerradas');
      fetchSesiones();
    } catch (error) {
      showToast('Error al cerrar sesiones', 'error');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (usuario?.rol !== 'admin') {
    return (
      <div className="content">
        <div className="table-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text2)' }}>No tienes permiso para ver sesiones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1 className="page-title">Sesiones activas</h1>
        <button onClick={fetchSesiones} className="btn btn-ghost">🔄 Actualizar</button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '12px 20px', borderRadius: 8,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : sesiones.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text2)' }}>No hay sesiones activas</p>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>IP</th>
                <th>Navegador</th>
                <th>Última actividad</th>
                <th>Expira</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.map((sesion) => (
                <tr key={sesion.id}>
                  <td className="td-name">{sesion.usuario.nombre}</td>
                  <td><span className={`badge ${sesion.usuario.rol}`}>{sesion.usuario.rol}</span></td>
                  <td className="td-mono" style={{ fontSize: 12 }}>{sesion.ip || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sesion.navegador || '—'}
                  </td>
                  <td className="td-mono" style={{ fontSize: 12 }}>{formatDate(sesion.ultimaAct)}</td>
                  <td className="td-mono" style={{ fontSize: 12 }}>{formatDate(sesion.expiraAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => eliminarSesionesUsuario(sesion.usuario.id)} className="action-btn danger" title="Cerrar todas las sesiones de este usuario">
                        🧹
                      </button>
                      <button onClick={() => eliminarSesion(sesion.id)} className="action-btn danger" title="Cerrar sesión">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}