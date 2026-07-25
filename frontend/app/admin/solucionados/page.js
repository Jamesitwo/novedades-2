'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';

export default function SolucionadosPage() {
  const [novedades, setNovedades] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('estados', JSON.stringify(['solucionado']));
      if (search) params.append('search', search);
      params.append('limit', '50');
      const { data } = await api.get(`/api/novedades?${params}`);
      setNovedades(data.data);
      setPagination(data.pagination);
    } catch { /* error */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search]);

  const formatMoney = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Solucionados</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Novedades marcadas como solucionadas</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card c-green">
          <div className="stat-label">Total Solucionados</div>
          <div className="stat-value green" style={{ fontSize: 28 }}>{pagination?.total || 0}</div>
        </div>
        <div className="stat-card c-amber">
          <div className="stat-label">Valor Recuperado</div>
          <div className="stat-value amber" style={{ fontSize: 28 }}>{formatMoney(novedades.reduce((s, n) => s + (n.totalAPagar || 0), 0))}</div>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <input type="search" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
      </div>

      {loading ? <div className="table-card"><TableSkeleton rows={5} columns={6} /></div> : novedades.length === 0 ? (
        <div className="table-card"><div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>No hay novedades solucionadas</div></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Cliente</th><th>Producto</th><th>Total</th><th>Transportadora</th><th>Guía</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {novedades.map(n => (
                <tr key={n.id}>
                  <td>
                    <div className="td-name">{n.nombre} {n.apellido}</div>
                    <div className="td-mono" style={{ color: 'var(--text3)', fontSize: 11 }}>{n.celular}</div>
                  </td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.producto}</td>
                  <td className="td-mono" style={{ fontWeight: 600, color: 'var(--green)' }}>{formatMoney(n.totalAPagar)}</td>
                  <td>{n.transportadora}</td>
                  <td className="td-mono">{n.guia}</td>
                  <td className="td-mono" style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(n.createdAt).toLocaleDateString('es-CO')}</td>
                  <td><Link href={`/novedades/${n.id}`} className="action-btn">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
