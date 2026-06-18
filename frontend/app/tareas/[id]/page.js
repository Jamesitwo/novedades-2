'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const ESTADOS = ['pendiente', 'en_progreso', 'revision', 'completada', 'cancelada'];
const ESTADO_LABELS = { pendiente: 'Pendiente', en_progreso: 'En Progreso', revision: 'Revisión', completada: 'Completada', cancelada: 'Cancelada' };
const PRIORIDAD = { urgente: { color: '#ef4444', label: 'Urgente' }, alta: { color: '#f97316', label: 'Alta' }, media: { color: '#f59e0b', label: 'Media' }, baja: { color: '#22c55e', label: 'Baja' } };

export default function TareaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [tarea, setTarea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => { fetchTarea(); }, [params.id]);

  const fetchTarea = async () => {
    try { const { data } = await api.get(`/api/tareas/${params.id}`); setTarea(data); }
    catch { showToast('Error al cargar', 'error'); }
    finally { setLoading(false); }
  };

  const handleEstado = async (estado) => {
    try { await api.patch(`/api/tareas/${params.id}/estado`, { estado }); fetchTarea(); showToast('Estado actualizado'); }
    catch { showToast('Error', 'error'); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try { await api.delete(`/api/tareas/${params.id}`); router.push('/tareas'); }
    catch { showToast('Error', 'error'); }
  };

  if (loading) return <div className="content"><div className="loading">Cargando...</div></div>;
  if (!tarea) return <div className="content"><div className="loading">Tarea no encontrada</div></div>;

  const pr = PRIORIDAD[tarea.prioridad] || PRIORIDAD.media;

  return (
    <div className="content" style={{ maxWidth: 700 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500 }}>{toast.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>{tarea.titulo}</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: pr.bg, color: pr.color }}>{pr.label}</span>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: tarea.estado === 'completada' ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)', color: tarea.estado === 'completada' ? 'var(--green)' : 'var(--accent)' }}>{ESTADO_LABELS[tarea.estado]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleDelete} className="btn btn-danger" style={{ padding: '8px 14px' }}>Eliminar</button>
          <button onClick={() => router.push('/tareas')} className="btn btn-ghost">Volver</button>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-header-title">Cambiar estado</span></div>
        <div style={{ padding: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ESTADOS.map(est => (
            <button key={est} onClick={() => handleEstado(est)} disabled={est === tarea.estado}
              className="action-btn" style={{ padding: '6px 12px', opacity: est === tarea.estado ? 0.5 : 1, fontWeight: 500 }}>
              {ESTADO_LABELS[est]}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-header-title">Detalles</span></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Creado por</div><div>{tarea.creadoPor?.nombre}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Asignado a</div><div>{tarea.asignado?.nombre || 'Sin asignar'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Creado</div><div className="td-mono" style={{ fontSize: 12 }}>{new Date(tarea.createdAt).toLocaleString('es-CO')}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Actualizado</div><div className="td-mono" style={{ fontSize: 12 }}>{new Date(tarea.updatedAt).toLocaleString('es-CO')}</div></div>
          {tarea.fechaLimite && (
            <div className="span2">
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Fecha límite</div>
              <div className="td-mono" style={{ fontSize: 12, color: new Date(tarea.fechaLimite) < new Date() ? 'var(--red)' : 'var(--text2)' }}>
                {new Date(tarea.fechaLimite).toLocaleString('es-CO')}
              </div>
            </div>
          )}
          {tarea.origenTipo && (
            <div className="span2">
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Origen</div>
              <div>{tarea.origenTipo === 'novedad' ? '⚠ Novedad' : tarea.origenTipo === 'oficina' ? '📦 Oficina' : '✏️ Manual'}</div>
            </div>
          )}
          {tarea.origenId && (tarea.origenTipo === 'novedad' || tarea.origenTipo === 'oficina') && (
            <div className="span2">
              <Link href={`/${tarea.origenTipo === 'novedad' ? 'novedades' : 'oficina'}/${tarea.origenId}`}
                style={{ color: 'var(--accent2)', fontSize: 13, textDecoration: 'underline' }}>
                Ver {tarea.origenTipo === 'novedad' ? 'novedad' : 'pedido'} original →
              </Link>
            </div>
          )}
          {tarea.descripcion && (
            <div className="span2">
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Descripción</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{tarea.descripcion}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
