'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';

export default function FacturasPage() {
  const { usuario } = useAuthStore();
  const [facturas, setFacturas] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendiente: 0, pagada: 0, cancelada: 0, totalMonto: 0 });
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };
  const formatMoney = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estado) params.append('estado', estado);
      if (search) params.append('search', search);
      const { data } = await api.get(`/api/facturas?${params}`);
      setFacturas(data.facturas);
      setStats(data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFacturas(); }, [estado, search]);

  const handleEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/api/facturas/${id}/estado`, { estado: nuevoEstado });
      fetchFacturas();
      showToast('Estado actualizado');
    } catch { showToast('Error', 'error'); }
  };

  const handleDelete = async (f) => {
    if (!confirm(`¿Eliminar factura #${f.numero}?`)) return;
    try { await api.delete(`/api/facturas/${f.id}`); fetchFacturas(); showToast('Factura eliminada'); }
    catch { showToast('Error al eliminar', 'error'); }
  };

  const downloadPdf = async (f) => {
    try {
      const res = await api.get(`/api/facturas/${f.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${f.numero}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { showToast('Error al descargar PDF', 'error'); }
  };

  return (
    <div className="content">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500 }}>{toast.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Facturas</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Sistema de facturación</div>
        </div>
        <Link href="/facturas/nueva" className="btn btn-primary" style={{ padding: '8px 16px' }}>+ Nueva factura</Link>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card c-amber">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value amber">{formatMoney(stats.totalMonto)}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{stats.pendiente} facturas</div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-label">Pagadas</div>
          <div className="stat-value green">{stats.pagada}</div>
        </div>
        <div className="stat-card c-red">
          <div className="stat-label">Canceladas</div>
          <div className="stat-value red">{stats.cancelada}</div>
        </div>
        <div className="stat-card c-blue">
          <div className="stat-label">Total</div>
          <div className="stat-value blue">{stats.total}</div>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <input type="search" placeholder="Buscar por nombre, documento o N°..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        <select value={estado} onChange={e => setEstado(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagada">Pagada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {loading ? <div className="table-card"><TableSkeleton rows={5} columns={6} /></div> : facturas.length === 0 ? (
        <div className="table-card"><div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>No hay facturas</div></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>N°</th><th>Cliente</th><th>Documento</th><th>Total</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td className="td-mono" style={{ fontWeight: 600 }}>{String(f.numero).padStart(4, '0')}</td>
                  <td className="td-name">{f.clienteNombre}</td>
                  <td className="td-mono" style={{ fontSize: 12, color: 'var(--text2)' }}>{f.clienteDocumento || '—'}</td>
                  <td className="td-mono" style={{ fontWeight: 600 }}>{formatMoney(f.total)}</td>
                  <td>
                    <span className="badge" style={{
                      background: f.estado === 'pagada' ? 'rgba(34,197,94,0.15)' : f.estado === 'cancelada' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: f.estado === 'pagada' ? 'var(--green)' : f.estado === 'cancelada' ? 'var(--red)' : 'var(--amber)'
                    }}>{f.estado}</span>
                  </td>
                  <td className="td-mono" style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(f.createdAt).toLocaleDateString('es-CO')}</td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/facturas/${f.id}`} className="action-btn">Ver</Link>
                      <button onClick={() => downloadPdf(f)} className="action-btn" style={{ color: 'var(--accent2)' }}>PDF</button>
                      {f.estado === 'pendiente' && <button onClick={() => handleEstado(f.id, 'pagada')} className="action-btn" style={{ color: 'var(--green)' }}>Pagar</button>}
                      {usuario?.rol === 'admin' && <button onClick={() => handleDelete(f)} className="action-btn danger">Eliminar</button>}
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
