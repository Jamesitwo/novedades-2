'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';

export default function RecogerPage() {
  const [pedidos, setPedidos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('estados', JSON.stringify(['va_a_recoger']));
      if (search) params.append('search', search);
      params.append('limit', '50');
      const { data } = await api.get(`/api/oficina?${params}`);
      setPedidos(data.data);
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
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Por Recoger</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Paquetes listos para ser recogidos</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card c-green">
          <div className="stat-label">Listos para recoger</div>
          <div className="stat-value green" style={{ fontSize: 28 }}>{pagination?.total || 0}</div>
        </div>
        <div className="stat-card c-teal">
          <div className="stat-label">Valor Total</div>
          <div className="stat-value" style={{ fontSize: 28, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>{formatMoney(pedidos.reduce((s, p) => s + (p.precio || 0), 0))}</div>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <input type="search" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
      </div>

      {loading ? <div className="table-card"><TableSkeleton rows={5} columns={6} /></div> : pedidos.length === 0 ? (
        <div className="table-card"><div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>No hay paquetes por recoger</div></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Cliente</th><th>Producto</th><th>Precio</th><th>Transportadora</th><th>Guía</th><th>Fecha Límite</th><th></th></tr></thead>
            <tbody>
              {pedidos.map(p => {
                const dias = Math.ceil((new Date(p.fechaLimite) - new Date()) / 86400000);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="td-name">{p.nombre} {p.apellido}</div>
                      <div className="td-mono" style={{ color: 'var(--text3)', fontSize: 11 }}>{p.celular}</div>
                    </td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.producto}</td>
                    <td className="td-mono">{p.precio > 0 ? formatMoney(p.precio) : '—'}</td>
                    <td>{p.transportadora}</td>
                    <td className="td-mono">{p.guia}</td>
                    <td className="td-mono" style={{ fontSize: 12, color: dias <= 0 ? 'var(--red)' : 'var(--text2)' }}>
                      {new Date(p.fechaLimite).toLocaleDateString('es-CO')}
                      {dias <= 3 && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>⚠ {dias}d</span>}
                    </td>
                    <td><Link href={`/oficina/${p.id}`} className="action-btn">Ver</Link></td>
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
