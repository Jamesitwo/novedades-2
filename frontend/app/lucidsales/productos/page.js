'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';

export default function LucidSalesProductosPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/lucidsales/productos');
      const list = Array.isArray(data) ? data : data.productos || data.data || [];
      setProductos(list);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al obtener productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const filtered = search
    ? productos.filter(p =>
        Object.values(p).some(v =>
          String(v).toLowerCase().includes(search.toLowerCase())
        )
      )
    : productos;

  const renderValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  if (loading) return <div className="content"><TableSkeleton /></div>;

  if (error) {
    return (
      <div className="content">
        <div className="table-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--red)', marginBottom: 12, fontSize: 16 }}>{error}</div>
          <button onClick={fetchProductos} className="btn btn-primary">Reintentar</button>
        </div>
      </div>
    );
  }

  const columns = productos.length > 0 ? Object.keys(productos[0]) : [];

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>LucidSales · Productos</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            {productos.length.toLocaleString()} productos
          </div>
        </div>
        <button onClick={fetchProductos} className="btn btn-ghost" style={{ fontSize: 12 }}>
          ↻ Actualizar
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          className="topbar-search"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className="table-card" style={{ overflow: 'auto' }}>
        <table style={{ fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                  {search ? 'No se encontraron productos' : 'Sin productos'}
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr key={p.id || i}>
                  {columns.map(col => (
                    <td key={col} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {renderValue(p[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
