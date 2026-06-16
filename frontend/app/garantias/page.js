'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';

const ESTADO_COLORS = {
  esperando: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  pendiente: { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)' },
  revisada: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  subido_dropi: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  guia_generada: { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6' },
  guia_compartida: { bg: 'rgba(99,102,241,0.12)', color: 'var(--accent)' },
  aprobada: { bg: 'rgba(34,197,94,0.12)', color: 'var(--green)' },
  rechazada: { bg: 'rgba(239,68,68,0.12)', color: 'var(--red)' },
  finalizado: { bg: 'rgba(168,85,247,0.12)', color: 'var(--purple)' }
};

export default function GarantiasPage() {
  const { usuario } = useAuthStore();
  const [garantias, setGarantias] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };

  const fetchGarantias = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estado) params.append('estado', estado);
      if (search) params.append('search', search);
      const { data } = await api.get(`/api/garantias?${params}`);
      setGarantias(data.garantias);
      setStats(data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGarantias(); }, [estado, search]);

  const handleEstado = async (id, nuevoEstado) => {
    try { await api.patch(`/api/garantias/${id}/estado`, { estado: nuevoEstado }); fetchGarantias(); showToast('Estado actualizado'); }
    catch { showToast('Error', 'error'); }
  };

  const handleDelete = async (g) => {
    if (!confirm(`¿Eliminar garantía de "${g.clienteNombre || g.linkToken}"?`)) return;
    try { await api.delete(`/api/garantias/${g.id}`); fetchGarantias(); showToast('Garantía eliminada'); }
    catch { showToast('Error', 'error'); }
  };

  const getPhotosPreview = (g) => {
    try { const f = JSON.parse(g.fotos || '[]'); return f.slice(0, 2); } catch { return []; }
  };

  return (
    <div className="content">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500 }}>{toast.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Garantías</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Gestión de garantías de clientes</div>
        </div>
        <Link href="/garantias/nueva" className="btn btn-primary" style={{ padding: '8px 16px' }}>+ Nuevo link</Link>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card c-blue"><div className="stat-label">Esperando</div><div className="stat-value blue">{stats.esperando || 0}</div></div>
        <div className="stat-card c-amber"><div className="stat-label">Pendientes</div><div className="stat-value amber">{stats.pendiente || 0}</div></div>
        <div className="stat-card c-purple"><div className="stat-label">Subido Dropi</div><div className="stat-value purple">{stats.subido_dropi || 0}</div></div>
        <div className="stat-card c-teal"><div className="stat-label">Guía Generada</div><div className="stat-value">{stats.guia_generada || 0}</div></div>
        <div className="stat-card c-green"><div className="stat-label">Aprobadas</div><div className="stat-value green">{stats.aprobada || 0}</div></div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <input type="search" placeholder="Buscar por nombre, producto..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        <select value={estado} onChange={e => setEstado(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          <option value="">Todos</option>
          <option value="esperando">Esperando</option>
          <option value="pendiente">Pendiente</option>
          <option value="revisada">Revisada</option>
          <option value="subido_dropi">Subido a Dropi</option>
          <option value="guia_generada">Guía generada</option>
          <option value="guia_compartida">Guía compartida</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
          <option value="finalizado">Proceso finalizado</option>
        </select>
      </div>

      {loading ? <div className="table-card"><TableSkeleton rows={5} columns={6} /></div> : garantias.length === 0 ? (
        <div className="table-card"><div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>No hay garantías</div></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Cliente</th><th>Producto</th><th>Fotos</th><th>Video</th><th>Estado</th><th>Expira</th><th></th></tr></thead>
            <tbody>
              {garantias.map(g => {
                const fotos = getPhotosPreview(g);
                return (
                  <tr key={g.id}>
                    <td className="td-name">{g.clienteNombre || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Sin registrar</span>}</td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{g.producto || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {fotos.length > 0 ? fotos.map((f, i) => (
                          <img key={i} src={f} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', background: 'var(--bg3)' }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        )) : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
                        {g.fotos && JSON.parse(g.fotos).length > 2 && <span style={{ fontSize: 10, color: 'var(--text3)', alignSelf: 'center' }}>+{JSON.parse(g.fotos).length - 2}</span>}
                      </div>
                    </td>
                    <td>
                      {g.videoUrl ? <span style={{ fontSize: 11, color: 'var(--accent2)' }}>🎥 Sí</span> : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: ESTADO_COLORS[g.estado]?.bg, color: ESTADO_COLORS[g.estado]?.color, textTransform: 'capitalize' }}>{g.estado}</span>
                    </td>
                    <td className="td-mono" style={{ fontSize: 11, color: new Date(g.fechaExpiracion) < new Date() ? 'var(--red)' : 'var(--text3)' }}>
                      {new Date(g.fechaExpiracion).toLocaleDateString('es-CO')}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/garantias/${g.id}`} className="action-btn">Ver</Link>
                        {g.estado === 'pendiente' && <button onClick={() => handleEstado(g.id, 'revisada')} className="action-btn" style={{ color: '#3b82f6' }}>Revisar</button>}
                        {g.estado === 'revisada' && <button onClick={() => handleEstado(g.id, 'subido_dropi')} className="action-btn" style={{ color: '#8b5cf6' }}>Dropi</button>}
                        {g.estado === 'subido_dropi' && <button onClick={() => handleEstado(g.id, 'guia_generada')} className="action-btn" style={{ color: '#14b8a6' }}>Guía</button>}
                        {g.estado === 'guia_generada' && <button onClick={() => handleEstado(g.id, 'guia_compartida')} className="action-btn" style={{ color: 'var(--accent)' }}>Compartir</button>}
                        {g.estado === 'guia_compartida' && <button onClick={() => handleEstado(g.id, 'finalizado')} className="action-btn" style={{ color: 'var(--purple)' }}>Finalizar</button>}
                        {g.estado === 'revisada' && <button onClick={() => handleEstado(g.id, 'aprobada')} className="action-btn" style={{ color: 'var(--green)' }}>Aprobar</button>}
                        {usuario?.rol === 'admin' && <button onClick={() => handleDelete(g)} className="action-btn danger">Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
