'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';
import { on, isConnected } from '@/lib/websocket';
import LucidsalesDetailPanel from '@/components/detail/LucidsalesDetailPanel';

const ESTADOS = {
  0: { label: 'Por confirmar', class: 'pendiente' },
  1: { label: 'Cancelado', class: 'red' },
  2: { label: 'Confirmado', class: 'entregado' },
  3: { label: 'Modificado', class: 'purple' }
};

export default function LucidSalesPage() {
  const { usuario } = useAuthStore();
  const [pedidos, setPedidos] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [conexionStatus, setConexionStatus] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [itemsPerPage] = useState(50);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [estados, setEstados] = useState([]);
  const [asignadoAMi, setAsignadoAMi] = useState(false);
  const [vincularId, setVincularId] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [etiquetaId, setEtiquetaId] = useState('');
  const [etiquetas, setEtiquetas] = useState([]);
  const [asignadoId, setAsignadoId] = useState('');
  const [operadores, setOperadores] = useState([]);
  const [toast, setToast] = useState(null);
  const [detailIds, setDetailIds] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [productosMap, setProductosMap] = useState({});
  const [pedidosHoy, setPedidosHoy] = useState(0);
  const [alertasMap, setAlertasMap] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleRefreshAll = async () => {
    fetchPedidos();
    if (pedidos.length === 0) return;
    setSyncing(true);
    try {
      const ids = pedidos.map(p => p.id).filter(Boolean);
      const { data } = await api.post('/api/lucidsales/sync-pedidos', { ids });
      if (data.ok) {
        showToast(`Sincronizados ${data.actualizados} pedidos desde LucidSales`);
      }
    } catch (err) {
      showToast('Error al sincronizar pedidos', 'error');
    } finally {
      setSyncing(false);
      fetchPedidos();
    }
  };

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('itemsPerPage', String(itemsPerPage));
      if (search) params.set('search', search);
      if (estados.length > 0) params.set('estados', estados.join(','));
      if (asignadoAMi) params.set('asignado_a_mi', 'true');
      if (etiquetaId) params.set('etiquetaId', etiquetaId);
      if (asignadoId && !asignadoAMi) params.set('asignadoId', asignadoId);
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);
      if (filtroProducto) params.set('producto', filtroProducto);
      params.set('filters', '[]');

      const [{ data }, { data: alertasData }] = await Promise.all([
        api.get(`/api/lucidsales/vinculados?${params.toString()}`),
        api.get('/api/alertas').catch(() => ({ data: [] }))
      ]);

      const map = {};
      if (Array.isArray(alertasData)) {
        alertasData.forEach(a => { map[a.productoId] = (map[a.productoId] || 0) + 1; });
      }
      setAlertasMap(map);

      if (data.ok) {
        setPedidos(data.pedidos || []);
        setTotalRecords(data.totalRecords || 0);
        setNumPages(data.numPages || 0);
      } else {
        setError(data.error || 'Error al obtener pedidos');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [page, search, itemsPerPage, estados, asignadoAMi, etiquetaId, asignadoId, fechaDesde, fechaHasta, filtroProducto]);

  useEffect(() => {
    setConnected(isConnected());
    const unsub1 = on('__connect__', () => setConnected(true));
    const unsub2 = on('__disconnect__', () => setConnected(false));
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    verificarConexion();
    api.get('/api/etiquetas').then(({ data }) => {
      if (Array.isArray(data)) setEtiquetas(data);
    }).catch(() => {});
    api.get('/api/usuarios/operadores').then(({ data }) => {
      if (Array.isArray(data)) setOperadores(data);
    }).catch(() => {});
    api.post('/api/lucidsales/productos').then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.productos || data?.data || [];
      const map = {};
      list.forEach(p => {
        const key = p.id ?? p.Id;
        const name = p.nombre || p.name || p.Nombre || p.nombreProducto || '';
        let img = null;
        const imgKeys = Object.keys(p).filter(k => /imagen|image|img|foto|picture/i.test(k));
        for (const imgKey of imgKeys) {
          const val = p[imgKey];
          if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
            img = val.split(',')[0].trim();
            break;
          }
          if (val && Array.isArray(val) && val.length > 0) {
            const first = val[0];
            img = typeof first === 'string' ? first : (first?.image || first?.imagen || first?.src || first?.url || first?.Imagen || null);
            if (img && (img.startsWith('http://') || img.startsWith('https://'))) break;
            img = null;
          }
          if (typeof val === 'string' && val !== '[]' && val !== '') {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const first = parsed[0];
                img = typeof first === 'string' ? first : (first?.image || first?.imagen || first?.src || first?.url || first?.Imagen || null);
                if (img && (img.startsWith('http://') || img.startsWith('https://'))) break;
                img = null;
              } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                img = parsed.image || parsed.imagen || parsed.src || parsed.url || parsed.URL || parsed.link || null;
                if (img && (img.startsWith('http://') || img.startsWith('https://'))) break;
                img = null;
              }
            } catch {}
          }
        }
        if (img && !(img.startsWith('http://') || img.startsWith('https://'))) img = null;
        if (key != null) map[String(key)] = { name, image: img };
      });
      setProductosMap(map);
    }).catch(() => {});
    api.get('/api/dashboard/pedidos-subidos?periodo=hoy').then(({ data }) => {
      const yo = data?.operadores?.find(o => o.operadorId === usuario?.id);
      if (yo) setPedidosHoy(yo.pedidosSubidos || 0);
    }).catch(() => {});
  }, []);

  // Cargar vinculados al montar y cuando cambien page/search
  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // Refrescar al volver a la página (después de editar)
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        fetchPedidos();
        api.get('/api/dashboard/pedidos-subidos?periodo=hoy').then(({ data }) => {
          const yo = data?.operadores?.find(o => o.operadorId === usuario?.id);
          if (yo) setPedidosHoy(yo.pedidosSubidos || 0);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchPedidos, usuario?.id]);

  const verificarConexion = async () => {
    try {
      const { data } = await api.get('/api/lucidsales/verificar-conexion');
      setConexionStatus(data);
    } catch {
      setConexionStatus({ conectado: false, mensaje: 'Error al verificar' });
    }
  };

  const formatMoney = (val) => {
    if (!val) return '$0';
    return '$' + Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getPedidoAlertCount = (pedido) => {
    let items = [];
    try {
      items = typeof pedido.Json === 'string' ? JSON.parse(pedido.Json) : (pedido.Json || []);
    } catch { return 0; }
    return items.reduce((count, prod) => count + (alertasMap[String(prod.product_id)] || 0), 0);
  };

  const getProductoLabel = (p) => {
    try {
      const items = typeof p.Json === 'string' ? JSON.parse(p.Json) : (p.Json || []);
      if (items.length === 0) return '—';
      if (items.length === 1) {
        const id = String(items[0].product_id);
        const pi = productosMap[id];
        return pi?.name || `#${id}`;
      }
      return `${items.length} productos`;
    } catch { return '—'; }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleEstadoFilter = (estado) => {
    setEstados(prev => {
      const next = new Set(prev.map(String));
      const key = String(estado);
      if (next.has(key)) next.delete(key); else next.add(key);
      return Array.from(next).map(Number);
    });
    setPage(1);
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!vincularId) return;
    setVinculando(true);
    try {
      await api.post('/api/lucidsales/vincular', { lucidsalesPedidoId: Number(vincularId) });
      setVincularId('');
      showToast(`Pedido #${vincularId} vinculado correctamente`);
      fetchPedidos();
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al vincular', 'error');
    } finally {
      setVinculando(false);
    }
  };

  const handleSyncRow = async (pedidoId) => {
    try {
      const { data } = await api.get(`/api/lucidsales/pedidos/${pedidoId}`);
      if (data && data.id) {
        await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(pedidoId), pedido: data });
        showToast('Sincronizado desde LucidSales');
        fetchPedidos();
      }
    } catch (err) {
      showToast('Error al sincronizar', 'error');
    }
  };

  const handleDesvincular = async (pedidoId) => {
    if (!window.confirm('Desvincular este pedido? Se eliminara de la lista de Pizdo (el pedido sigue existiendo en LucidSales).')) return;
    try {
      await api.delete(`/api/lucidsales/vinculados/${pedidoId}`);
      showToast('Pedido desvinculado');
      fetchPedidos();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al desvincular', 'error');
    }
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>LucidSales · Pedidos</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{totalRecords.toLocaleString()} pedidos</span>
            {pedidosHoy > 0 && (
              <span style={{
                background: 'var(--accent2)', color: '#fff',
                padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600
              }}>
                Tú: +{pedidosHoy} hoy
              </span>
            )}
            {conexionStatus && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: conexionStatus.conectado ? 'var(--green)' : 'var(--red)',
                fontSize: 11
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: conexionStatus.conectado ? 'var(--green)' : 'var(--red)'
                }} />
                {conexionStatus.conectado ? 'Conectado' : 'Desconectado'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {conexionStatus && !conexionStatus.conectado && (
            <button onClick={verificarConexion} className="btn btn-ghost" style={{ fontSize: 12 }}>
              Reintentar conexión
            </button>
          )}
        </div>
      </div>

      {conexionStatus && !conexionStatus.conectado && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--red)', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13
        }}>
          {conexionStatus.mensaje}. Configura LucidSales en <Link href="/configuracion" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Configuración</Link>.
        </div>
      )}

      <form onSubmit={handleVincular} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="number"
          placeholder="ID de pedido LucidSales"
          value={vincularId}
          onChange={e => setVincularId(e.target.value)}
          className="topbar-search"
          style={{ width: 200 }}
        />
        <button type="submit" disabled={vinculando || !vincularId} className="btn btn-primary" style={{ fontSize: 12 }}>
          {vinculando ? 'Vinculando...' : 'Vincular pedido'}
        </button>
        <button type="button" onClick={handleRefreshAll} disabled={syncing} className="btn btn-ghost" style={{ fontSize: 12 }}>
          {syncing ? 'Sincronizando...' : '⟳ Sincronizar'}
        </button>
      </form>

      <div className="filters">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handleEstadoFilter(k)}
              className={`filter-tab ${estados.includes(Number(k)) ? 'active' : ''}`}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={() => { setAsignadoAMi(v => !v); setAsignadoId(''); setPage(1); }}
            className={`filter-tab ${asignadoAMi ? 'active' : ''}`}
          >
            👤 Asignados a mí
          </button>
          <select
            value={etiquetaId}
            onChange={e => { setEtiquetaId(e.target.value); setPage(1); }}
            className={`filter-tab ${etiquetaId ? 'active' : ''}`}
            style={{ appearance: 'auto', cursor: 'pointer', paddingRight: 26 }}
          >
            <option value="">🏷️ Etiqueta</option>
            {etiquetas.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          {usuario?.rol === 'admin' && (
            <select
              value={asignadoId}
              onChange={e => { setAsignadoId(e.target.value); setAsignadoAMi(false); setPage(1); }}
              className={`filter-tab ${asignadoId ? 'active' : ''}`}
              style={{ appearance: 'auto', cursor: 'pointer', paddingRight: 26, opacity: asignadoAMi ? 0.5 : 1 }}
              disabled={asignadoAMi}
              title={asignadoAMi ? 'Desactiva "Asignados a mí" para elegir un operador' : ''}
            >
              <option value="">👤 Asignado</option>
              {operadores.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
          <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
            style={{ background: fechaDesde ? 'var(--accent)' : 'var(--bg3)', border: `1px solid ${fechaDesde ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, color: fechaDesde ? '#fff' : 'var(--text2)', outline: 'none' }} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>→</span>
          <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
            style={{ background: fechaHasta ? 'var(--accent)' : 'var(--bg3)', border: `1px solid ${fechaHasta ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, color: fechaHasta ? '#fff' : 'var(--text2)', outline: 'none' }} />
          {(fechaDesde || fechaHasta) && (
            <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setPage(1); }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          )}
          <input type="text" className="topbar-search" placeholder="Filtrar por producto..." value={filtroProducto}
            onChange={e => { setFiltroProducto(e.target.value); setPage(1); }}
            style={{ width: 180, fontSize: 11, marginLeft: 8 }} />
        </div>
        <div className="filters-right" style={{ flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="topbar-search"
              placeholder="Buscar pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 250, maxWidth: '100%' }}
            />
            <button type="submit" className="btn btn-ghost">Buscar</button>
          </form>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--red)', marginBottom: 12, fontSize: 16 }}>{error}</div>
          <button onClick={fetchPedidos} className="btn btn-primary">Reintentar</button>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          No se encontraron pedidos
        </div>
      ) : (
        <>
          <div className="table-card">
            <div className="table-header">
              <span className="table-header-title">Pedidos ({totalRecords})</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                  <th>Cliente</th>
                  <th>Telefono</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Producto</th>
                  <th style={{ width: 50, textAlign: 'center' }}>⚠</th>
                  <th>Asignado</th>
                  <th>Subido por</th>
                  <th>Referencias</th>
                  <th>Etiquetas</th>
                  <th style={{ width: 80 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} onClick={() => { setDetailIds(pedidos.map(pe => pe.id)); setDetailId(p.id); }} style={{ cursor: 'pointer' }}>
                    <td data-label="# Pedido" className="td-mono" title={`ID LucidSales: ${p.id}`}>#{p.idPedido}</td>
                    <td data-label="Fecha" style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text3)' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td data-label="Cliente" className="td-name">{p.Nombre} {p.Apellido}</td>
                    <td data-label="Teléfono">{p.Movil}</td>
                    <td data-label="Total" className="td-mono">{formatMoney(p.Total)}</td>
                    <td data-label="Estado">
                      <span className={`badge ${(ESTADOS[p.EstadoPedido] || ESTADOS[0]).class}`}>
                        {(ESTADOS[p.EstadoPedido] || ESTADOS[0]).label}
                      </span>
                    </td>
                    <td data-label="Producto" style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getProductoLabel(p)}
                    </td>
                    <td data-label="Alertas" style={{ textAlign: 'center' }}>
                      {(() => {
                        const count = getPedidoAlertCount(p);
                        return count > 0 ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 22, height: 22, borderRadius: 11, fontSize: 11, fontWeight: 700,
                            background: 'rgba(245,158,11,0.15)', color: 'var(--amber)',
                            border: '1px solid rgba(245,158,11,0.3)'
                          }} title={`${count} alerta${count > 1 ? 's' : ''} en productos de este pedido`}>
                            {count}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td data-label="Asignado" style={{ fontSize: 12 }}>
                      {p.asignado ? (
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{p.asignado.nombre}</span>
                      ) : (
                        <span style={{ color: 'var(--text3)' }}>—</span>
                      )}
                    </td>
                    <td data-label="Subido por" style={{ fontSize: 12 }}>
                      {p.subidoPor ? (
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{p.subidoPor.nombre}</span>
                      ) : p.creador ? (
                        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{p.creador.nombre}</span>
                      ) : (
                        <span style={{ color: '#feb700', fontSize: 11, fontWeight: 600 }}>Pendiente</span>
                      )}
                    </td>
                    <td data-label="Referencias" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.Referencias || '-'}
                    </td>
                    <td data-label="Etiquetas" style={{ maxWidth: 120 }}>
                      {p._etiquetas && p._etiquetas.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {p._etiquetas.map(e => (
                            <span key={e.id} style={{
                              display: 'inline-block', padding: '1px 6px', borderRadius: 10,
                              fontSize: 10, fontWeight: 600, color: '#fff', background: e.color
                            }}>{e.nombre}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="row-actions">
                      {p.notas && (
                        <span className="action-btn" title={p.notas} style={{ fontSize: 14, cursor: 'default', color: 'var(--amber)' }}>
                          📝
                        </span>
                      )}
                      {p.conversacionLink && (
                        <a href={p.conversacionLink} target="_blank" rel="noopener noreferrer" className="action-btn" title="Abrir chat" style={{ fontSize: 14 }} onClick={e => e.stopPropagation()}>
                          💬
                        </a>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleSyncRow(p.id); }} className="action-btn" title="Sincronizar desde LucidSales" style={{ fontSize: 14 }}>⟳</button>
                      {usuario?.rol === 'admin' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDesvincular(p.id); }} className="action-btn" title="Desvincular" style={{ fontSize: 14, color: 'var(--red)' }}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {numPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ‹ Anterior
              </button>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>
                Página {page} de {numPages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= numPages}
                onClick={() => setPage(p => Math.min(numPages, p + 1))}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {toast.message}
        </div>
      )}
      {detailId && (
        <LucidsalesDetailPanel
          id={detailId}
          ids={detailIds}
          currentIndex={detailIds.indexOf(detailId)}
          onClose={() => setDetailId(null)}
          onNavigate={(newId) => setDetailId(newId)}
          onUpdate={fetchPedidos}
        />
      )}
    </div>
  );
}
