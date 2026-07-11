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
  'Ciudad',
  'Disponibilidad', 'Disponibilidad Producto Landing Page', 'Disponibilidad Producto Lucid Bot',
  'Envio',
  'Fecha Creacion',
  'Id Producto Aveonline', 'Id Producto Edrop', 'Id Producto Rocket', 'Id Producto Venndelo', 'Id Variante Upsell',
  'Mensaje Inicial',
  'Personalizar Mensaje Inicial',
  'Pais Origen', 'Peso',
  'Precio App', 'Precio Bodega', 'Precio Sugerido',
  'Preguntas Frecuentes', 'Preguntas Frecuentes Post Venta',
  'Profundo',
  'Reglas',
  'Testimonios',
  'Tipo',
  'Up Sell',
  'Url',
  'V', 'Videos'
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
            const url = item.image || item.imagen || item.src || item.url || item.URL || item.link || item.path;
            if (url && typeof url === 'string' && url.startsWith('http')) {
              urls.push(url);
            }
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        const url = parsed.image || parsed.imagen || parsed.src || parsed.url || parsed.URL || parsed.link || parsed.path;
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

const STOCK_THRESHOLD = 20;

const getStockStyle = (s) => {
  if (s === null || s === undefined) return {};
  if (s === 0) return { background: 'rgba(229,62,62,0.15)', color: '#e53e3e', fontWeight: 700 };
  if (s <= 5) return { background: 'rgba(229,62,62,0.06)', color: '#e53e3e', fontWeight: 600 };
  if (s <= STOCK_THRESHOLD) return { background: 'rgba(245,158,11,0.06)', color: '#f59e0b', fontWeight: 500 };
  return {};
};

export default function LucidSalesProductosPage() {
  const [productos, setProductos] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [refreshingStock, setRefreshingStock] = useState({});
  const [showAlert, setShowAlert] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alertasMap, setAlertasMap] = useState({});
  const [alertModalProducto, setAlertModalProducto] = useState(null);
  const [alertasProducto, setAlertasProducto] = useState([]);
  const [nuevaAlerta, setNuevaAlerta] = useState({ mensaje: '', tipo: 'warning' });
  const [savingAlerta, setSavingAlerta] = useState(false);
  const [showAlert, setShowAlert] = useState(true);

  const getStock = (p) => {
    const id = String(p.id ?? p.Id ?? '');
    return stockMap[id] ?? null;
  };

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError('');
    setStockMap({});
    setRefreshingStock({});
    try {
      const { data } = await api.post('/api/lucidsales/productos');
      const list = Array.isArray(data) ? data : data.productos || data.data || [];
      if (list.length > 0) console.log('[Productos] fields:', Object.keys(list[0]).filter(k => !isEmpty(list[0][k])).join(', '));
      setProductos(list);
      setSelected(null);
      setLastUpdate(new Date());

      const ids = list.map(p => String(p.id ?? p.Id)).filter(Boolean);
      if (ids.length > 0) {
        try {
          const stockRes = await api.post('/api/lucidsales/productos-stock', { productIds: ids });
          if (stockRes.data?.ok && stockRes.data.stock) {
            setStockMap(stockRes.data.stock);
          } else {
            console.warn('[Stock] Respuesta inesperada:', stockRes.data);
          }
        } catch (err) {
          console.error('[Stock] Error al obtener stock:', err?.response?.data?.error || err.message);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al obtener productos');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshStock = async (productId, e) => {
    if (e) e.stopPropagation();
    setRefreshingStock(prev => ({ ...prev, [productId]: true }));
    try {
      const { data } = await api.post('/api/lucidsales/productos-stock', { productIds: [productId] });
      if (data?.ok && data.stock) {
        setStockMap(prev => ({ ...prev, ...data.stock }));
      }
    } catch {}
    finally {
      setRefreshingStock(prev => { const next = { ...prev }; delete next[productId]; return next; });
    }
  };

  const fetchAlertCounts = async () => {
    try {
      const { data } = await api.get('/api/alertas');
      const map = {};
      data.forEach(a => {
        map[a.productoId] = (map[a.productoId] || 0) + 1;
      });
      setAlertasMap(map);
    } catch {}
  };

  const openAlertModal = async (producto, e) => {
    if (e) e.stopPropagation();
    const prodId = String(producto.id ?? producto.Id);
    setAlertModalProducto(producto);
    setNuevaAlerta({ mensaje: '', tipo: 'warning' });
    try {
      const { data } = await api.get(`/api/alertas?productoId=${prodId}`);
      setAlertasProducto(data);
    } catch {
      setAlertasProducto([]);
    }
  };

  const handleCreateAlerta = async () => {
    if (!nuevaAlerta.mensaje.trim()) return;
    setSavingAlerta(true);
    try {
      const prodId = String(alertModalProducto.id ?? alertModalProducto.Id);
      const prodName = alertModalProducto.nombre || alertModalProducto.name || alertModalProducto.Nombre || `#${prodId}`;
      await api.post('/api/alertas', {
        productoId: prodId,
        productoNombre: prodName,
        mensaje: nuevaAlerta.mensaje.trim(),
        tipo: nuevaAlerta.tipo
      });
      setNuevaAlerta({ mensaje: '', tipo: 'warning' });
      const { data } = await api.get(`/api/alertas?productoId=${prodId}`);
      setAlertasProducto(data);
      fetchAlertCounts();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAlerta(false);
    }
  };

  const handleDeleteAlerta = async (alertaId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/api/alertas/${alertaId}`);
      const prodId = String(alertModalProducto.id ?? alertModalProducto.Id);
      const { data } = await api.get(`/api/alertas?productoId=${prodId}`);
      setAlertasProducto(data);
      fetchAlertCounts();
    } catch {}
  };

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  useEffect(() => {
    fetchAlertCounts();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchProductos, 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  const lowStock = useMemo(() => {
    const agotados = [];
    const bajo = [];
    productos.forEach(p => {
      const s = getStock(p);
      if (s === 0) agotados.push({ ...p, _stock: s });
      else if (s !== null && s <= STOCK_THRESHOLD) bajo.push({ ...p, _stock: s });
    });
    return { agotados, bajo, total: agotados.length + bajo.length };
  }, [productos, stockMap]);

  const timeAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 60000) : null;

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
            {timeAgo !== null && (
              <span> · 🟢 actualizado hace {timeAgo < 1 ? 'menos de 1 min' : `${timeAgo} min`}</span>
            )}
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

      {showAlert && lowStock.total > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', borderRadius: 8, marginBottom: 14,
          background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.3)',
          fontSize: 13
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lowStock.agotados.length > 0 && (
              <span style={{ color: '#e53e3e', fontWeight: 600 }}>
                🔴 {lowStock.agotados.length} agotado{lowStock.agotados.length > 1 ? 's' : ''}
              </span>
            )}
            {lowStock.bajo.length > 0 && (
              <span style={{ color: '#f59e0b', fontWeight: 500 }}>
                ⚠ {lowStock.bajo.length} con stock bajo (≤{STOCK_THRESHOLD})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {timeAgo !== null && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                🟢 Actualizado hace {timeAgo < 1 ? 'menos de 1 min' : `${timeAgo} min`}
              </span>
            )}
            <button onClick={() => setShowAlert(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        </div>
      )}

      <div className="table-card" style={{ overflow: 'auto' }}>
        <table style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 50 }}></th>
              <th style={{ width: 50, textAlign: 'center' }}>🔔</th>
              <th style={{ width: 80, textAlign: 'center' }}>Stock</th>
              {sortedColumns.map(col => (
                <th key={col} style={{ whiteSpace: 'nowrap' }}>{formatLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={sortedColumns.length + 3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                  {search ? 'No se encontraron productos' : 'Sin productos'}
                </td>
              </tr>
            ) : (
              processed.map((p, i) => {
                  const stockVal = getStock(p);
                  const stockStyle = getStockStyle(stockVal);
                  return (
                    <tr key={p.id || i} onClick={(e) => { if (!e.target.closest('.alert-btn')) setSelected(p); }} style={{ cursor: 'pointer', ...stockStyle }}>
                      <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600 }}>
                        ▶
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {(() => {
                          const prodId = String(p.id ?? p.Id);
                          const count = alertasMap[prodId] || 0;
                          return (
                            <button
                              className="alert-btn"
                              onClick={(e) => openAlertModal(p, e)}
                              style={{
                                background: count > 0 ? 'rgba(245,158,11,0.15)' : 'transparent',
                                border: count > 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                                borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontSize: 14,
                                color: count > 0 ? 'var(--amber)' : 'var(--text3)', transition: 'all 0.15s'
                              }}
                              title={count > 0 ? `${count} alerta${count > 1 ? 's' : ''}` : 'Sin alertas'}
                            >
                              {count > 0 ? '🔔' : '🔕'}
                            </button>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        {stockVal !== null && stockVal !== undefined ? (stockVal === 0 ? 'AGOTADO' : stockVal) : '-'}
                        <button
                          onClick={(e) => handleRefreshStock(String(p.id ?? p.Id), e)}
                          disabled={refreshingStock[String(p.id ?? p.Id)]}
                          className="btn btn-ghost"
                          style={{ fontSize: 10, padding: '1px 4px', marginLeft: 4 }}
                          title="Actualizar stock desde Dropi"
                        >
                          {refreshingStock[String(p.id ?? p.Id)] ? '⏳' : '↻'}
                        </button>
                      </td>
                      {sortedColumns.map(col => (
                        <td key={col} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isEmpty(p[col]) ? '-' : renderVal(p[col], col, true)}
                        </td>
                      ))}
                    </tr>
                  );
                })
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

              <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>🔔 Alertas del producto</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(null); openAlertModal(selected, e); }}
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                  >
                    Gestionar alertas
                  </button>
                </div>
                {(() => {
                  const prodId = String(selected.id ?? selected.Id);
                  const count = alertasMap[prodId] || 0;
                  return count === 0
                    ? <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>Sin alertas activas</div>
                    : <div style={{ fontSize: 12, color: 'var(--amber)' }}>{count} alerta{count > 1 ? 's' : ''} activa{count > 1 ? 's' : ''}</div>;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {alertModalProducto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: 20
        }} onClick={() => setAlertModalProducto(null)}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 14, width: 'min(520px, 95vw)',
            maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                🔔 Alertas — {alertModalProducto.nombre || alertModalProducto.name || `#${alertModalProducto.id}`}
              </div>
              <button onClick={() => setAlertModalProducto(null)} className="btn btn-ghost" style={{ fontSize: 14, padding: '4px 10px' }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>Nueva alerta</div>
                <select
                  value={nuevaAlerta.tipo}
                  onChange={e => setNuevaAlerta(prev => ({ ...prev, tipo: e.target.value }))}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', marginBottom: 8, width: '100%' }}
                >
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="danger">🔴 Danger</option>
                </select>
                <textarea
                  value={nuevaAlerta.mensaje}
                  onChange={e => setNuevaAlerta(prev => ({ ...prev, mensaje: e.target.value }))}
                  placeholder="Mensaje de la alerta..."
                  rows={3}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)', resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }}
                />
                <button
                  onClick={handleCreateAlerta}
                  disabled={savingAlerta || !nuevaAlerta.mensaje.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '6px 16px', opacity: savingAlerta || !nuevaAlerta.mensaje.trim() ? 0.5 : 1 }}
                >
                  {savingAlerta ? 'Creando...' : 'Crear alerta'}
                </button>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Alertas activas ({alertasProducto.length})</div>
              {alertasProducto.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 12, padding: 8 }}>No hay alertas para este producto</div>
              ) : (
                alertasProducto.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    borderRadius: 8, marginBottom: 8,
                    background: a.tipo === 'danger' ? 'rgba(239,68,68,0.08)' : a.tipo === 'info' ? 'rgba(59,130,246,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${a.tipo === 'danger' ? 'rgba(239,68,68,0.25)' : a.tipo === 'info' ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`
                  }}>
                    <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                      {a.tipo === 'danger' ? '🔴' : a.tipo === 'info' ? 'ℹ️' : '⚠️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-word' }}>{a.mensaje}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                        Por {a.createdBy?.nombre || '...'} · {new Date(a.createdAt).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteAlerta(a.id, e)}
                      className="btn btn-ghost"
                      style={{ fontSize: 10, padding: '2px 6px', color: 'var(--red)', flexShrink: 0 }}
                      title="Eliminar alerta"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
