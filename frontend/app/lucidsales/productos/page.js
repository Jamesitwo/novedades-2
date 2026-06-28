'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/Skeleton';

const isEmpty = (v) => {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') {
    const trimmed = v.trim().toLowerCase();
    return trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[]' || trimmed === '{}';
  }
  if (v === 0 || v === '0') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
};

const OMIT_FIELDS = new Set([
  'Active Integrations', 'Ads Meta Campaigns', 'Ads Meta Tags',
  'Alto', 'Ancho',
  'Bundle', 'By Id Dropi',
  'Caracteristicas', 'Caracteristicas Name',
  'Mensaje Inicial',
  'Precio App', 'Precio Bodega', 'Precio Sugerido',
  'Preguntas Frecuentes', 'Preguntas Frecuentes Post Venta',
  'Profundo',
  'Reglas',
  'Testimonios',
  'Tipo',
  'Up Sell'
]);

const formatLabel = (key) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const isImgKey = (k) => /imagen|image|img|foto|picture/i.test(k);

const renderVal = (val, key, isTable = false) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val ? '✅ Sí' : '❌ No';
  
  if (isImgKey(key)) {
    let urls = [];
    try {
      let parsed = val;
      if (typeof val === 'string') {
        if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
          parsed = JSON.parse(val);
        } else {
          urls = val.split(',').map(s => s.trim()).filter(s => s.startsWith('http'));
        }
      }
      
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          if (typeof item === 'string' && item.startsWith('http')) {
            urls.push(item);
          } else if (item && typeof item === 'object') {
            const url = item.src || item.url || item.URL || item.link || item.path;
            if (url && typeof url === 'string' && url.startsWith('http')) {
              urls.push(url);
            }
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        const url = parsed.src || parsed.url || parsed.URL || parsed.link || parsed.path;
        if (url && typeof url === 'string' && url.startsWith('http')) {
          urls.push(url);
        }
      } else if (typeof parsed === 'string' && parsed.startsWith('http')) {
        urls.push(parsed);
      }
    } catch (e) {
      if (typeof val === 'string' && val.startsWith('http')) {
        urls.push(val);
      }
    }

    if (urls.length > 0) {
      if (isTable) {
        return (
          <img
            src={urls[0]}
            alt=""
            style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        );
      } else {
        return (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {urls.map((url, idx) => (
              <a href={url} target="_blank" rel="noopener noreferrer" key={idx}>
                <img
                  src={url}
                  alt=""
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </a>
            ))}
          </div>
        );
      }
    }
  }

  if (typeof val === 'object') return <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{JSON.stringify(val, null, 2)}</pre>;
  
  if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
    if (/\.(png|jpg|jpeg|gif|webp|svg|avif)(\?|$)/i.test(val)) {
      return (
        <img
          src={val}
          alt=""
          style={{
            maxWidth: isTable ? 44 : 120,
            maxHeight: isTable ? 44 : 120,
            borderRadius: 6,
            objectFit: 'cover',
            border: '1px solid var(--border)'
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      );
    }
    return <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 12 }}>🔗 Abrir</a>;
  }
  return String(val);
};

const GROUP_ORDER = ['id', 'idEmpresa', 'nombre', 'name', 'nombreCliente', 'sku', 'precio', 'price', 'costo', 'stock', 'categoria', 'category', 'descripcion', 'description', 'imagen', 'image', 'link', 'estado', 'status', 'activo', 'createdAt', 'updatedAt'];

export default function LucidSalesProductosPage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/lucidsales/productos');
      const list = Array.isArray(data) ? data : data.productos || data.data || [];
      if (list.length > 0) console.log('[Productos] fields:', Object.keys(list[0]).filter(k => !isEmpty(list[0][k])).join(', '));
      setProductos(list);
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al obtener productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const processed = useMemo(() => {
    let list = [...productos];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => Object.values(p).some(v => String(v).toLowerCase().includes(q)));
    }
    return list;
  }, [productos, search]);

  const columns = useMemo(() => {
    if (productos.length === 0) return [];
    const allKeys = Object.keys(productos[0]);
    return allKeys.filter(key => !OMIT_FIELDS.has(formatLabel(key)) && productos.some(p => !isEmpty(p[key])));
  }, [productos]);

  const sortedColumns = useMemo(() => {
    const sorted = [...columns].sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a);
      const ib = GROUP_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [columns]);

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
              <th style={{ width: 50 }}></th>
              {sortedColumns.map(col => (
                <th key={col} style={{ whiteSpace: 'nowrap' }}>{formatLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={sortedColumns.length + 1} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                  {search ? 'No se encontraron productos' : 'Sin productos'}
                </td>
              </tr>
            ) : (
              processed.map((p, i) => (
                <tr key={p.id || i} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600 }}>
                    ▶
                  </td>
                  {sortedColumns.map(col => (
                    <td key={col} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isEmpty(p[col]) ? '-' : renderVal(p[col], col, true)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 14, width: 'min(640px, 95vw)',
            maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky',
              top: 0, background: 'var(--bg2)', zIndex: 1
            }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {selected.nombre || selected.name || selected.sku || `Producto #${selected.id}`}
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost" style={{ fontSize: 14, padding: '4px 10px' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(selected)
                .filter(([k, v]) => !OMIT_FIELDS.has(formatLabel(k)) && !isEmpty(v))
                .sort(([a], [b]) => {
                  const ia = GROUP_ORDER.indexOf(a);
                  const ib = GROUP_ORDER.indexOf(b);
                  if (ia !== -1 && ib !== -1) return ia - ib;
                  if (ia !== -1) return -1;
                  if (ib !== -1) return 1;
                  return a.localeCompare(b);
                })
                .map(([key, val]) => (
                  <div key={key} style={{
                    display: 'flex', gap: 12, padding: '8px 0',
                    borderBottom: '1px solid var(--border)', fontSize: 13
                  }}>
                    <div style={{ width: 140, flexShrink: 0, color: 'var(--text3)', fontWeight: 500 }}>
                      {formatLabel(key)}
                    </div>
                    <div style={{ flex: 1, color: 'var(--text)', wordBreak: 'break-word' }}>
                      {renderVal(val, key, false)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
