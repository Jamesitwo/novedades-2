'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function PlantillasPage() {
  const { usuario, initialized } = useAuthStore();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (initialized && (!usuario || usuario.rol !== 'admin')) {
      router.push('/dashboard');
    }
  }, [usuario, initialized, router]);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/api/whatsapp/plantillas');
      setTemplates(data);
    } catch (err) {
      setError('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.rol === 'admin') fetchTemplates();
  }, [usuario]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const { data } = await api.post('/api/whatsapp/plantillas/sync');
      setTemplates(data.templates);
      showToast(`Sincronización completada: ${data.count} plantillas`);
      fetchTemplates();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (template) => {
    try {
      await api.patch(`/api/whatsapp/plantillas/${template.id}`, {
        activa: !template.activa
      });
      fetchTemplates();
      showToast(`Plantilla ${template.activa ? 'desactivada' : 'activada'}`);
    } catch {
      showToast('Error al actualizar plantilla', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const CATEGORY_LABELS = {
    marketing: 'Marketing',
    utility: 'Utilidad',
    authentication: 'Autenticación'
  };

  const ESTADO_LABELS = {
    approved: 'Aprobada',
    pending: 'Pendiente',
    rejected: 'Rechazada',
    aprobada: 'Aprobada',
    pendiente: 'Pendiente',
    rechazada: 'Rechazada'
  };

  if (!usuario || usuario.rol !== 'admin') return null;

  return (
    <div className="page-container">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Plantillas WhatsApp</h1>
          <p className="page-subtitle">Administra las plantillas sincronizadas con Meta</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn btn-primary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar con Meta'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--red)', fontSize: 14
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-container">
          <div className="loading-state">Cargando plantillas...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No hay plantillas</div>
            <div className="empty-text">
              Haz clic en &quot;Sincronizar con Meta&quot; para importar las plantillas aprobadas desde WhatsApp Business Manager.
            </div>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Idioma</th>
                <th>Estado Meta</th>
                <th>Activa</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id || t.nombre}>
                  <td>
                    <span style={{ fontWeight: 500, fontSize: 14, fontFamily: 'var(--mono)' }}>
                      {t.nombre}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${t.categoria}`} style={{
                      background: t.categoria === 'MARKETING' || t.categoria === 'marketing' ? 'rgba(168,85,247,0.15)' :
                                  t.categoria === 'UTILITY' || t.categoria === 'utility' ? 'rgba(59,130,246,0.15)' :
                                  'rgba(34,197,94,0.15)',
                      color: t.categoria === 'MARKETING' || t.categoria === 'marketing' ? '#a855f7' :
                             t.categoria === 'UTILITY' || t.categoria === 'utility' ? '#3b82f6' : '#22c55e',
                      padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600
                    }}>
                      {CATEGORY_LABELS[t.categoria] || t.categoria}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase' }}>
                    {t.idioma}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: t.estado === 'approved' || t.estado === 'aprobada' ? 'var(--green)' :
                             t.estado === 'rejected' || t.estado === 'rechazada' ? 'var(--red)' : 'var(--amber)'
                    }}>
                      {ESTADO_LABELS[t.estado] || t.estado}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                      color: t.activa ? 'var(--green)' : 'var(--text3)'
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: t.activa ? 'var(--green)' : 'var(--text3)'
                      }} />
                      {t.activa ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(t)}
                      className="btn btn-ghost"
                      style={{ padding: '4px 12px', fontSize: 11 }}
                    >
                      {t.activa ? 'Desactivar' : 'Activar'}
                    </button>
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
