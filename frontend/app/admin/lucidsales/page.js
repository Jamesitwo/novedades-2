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
  2: { label: 'Confirmado', class: 'confirmado' },
  3: { label: 'Modificado', class: 'purple' },
  4: { label: 'En Tránsito', class: 'transito' },
  5: { label: 'En Reparto', class: 'transito' },
  6: { label: 'Entregado', class: 'entregado' },
  7: { label: 'Devuelto', class: 'red' },
  8: { label: 'En Novedad', class: 'pendiente' },
  9: { label: 'Novedad Solucionada', class: 'confirmado' }
};

const haceCuanto = (fecha) => {
  if (!fecha) return '—';
  const pasada = new Date(fecha).getTime();
  if (Number.isNaN(pasada)) return '—';
  const seg = Math.round((pasada - Date.now()) / 1000);
  const abs = Math.abs(seg);
  if (abs < 60) return 'ahora';
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  // Intl.RelativeTimeFormat exige claves de unidad en inglés; con locale 'es' se localiza el texto.
  // El valor debe ir DIVIDIDO entre los segundos de la unidad (format espera el valor en esa unidad).
  const unidades = [
    ['year', 31536000], ['month', 2592000],
    ['day', 86400], ['hour', 3600], ['minute', 60]
  ];
  for (const [unidad, segs] of unidades) {
    if (abs >= segs) return rtf.format(Math.round(seg / segs), unidad);
  }
  return 'ahora';
};

const telefono = (movil) => {
  if (!movil) return null;
  const digitos = String(movil).replace(/\D/g, '');
  if (!digitos) return null;
  const con57 = digitos.startsWith('57') && digitos.length >= 12 ? digitos : `57${digitos}`;
  const nacional = con57.slice(2);
  const visible = nacional.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  return { visible, tel: `tel:+${con57}`, wa: `https://wa.me/${con57}` };
};

const estadoSelectStyle = {
  fontSize: 12, padding: '3px 6px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--bg3)',
  color: 'var(--text)', cursor: 'pointer', maxWidth: 150
};

export default function LucidSalesPage() {
  const { usuario } = useAuthStore();
  const [pedidos, setPedidos] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [numPages, setNumPages] = useState(0);
  // con filtros que se revisan en vivo (asignado + estado/busqueda) el total es aproximado
  const [totalAprox, setTotalAprox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [conexionStatus, setConexionStatus] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [estados, setEstados] = useState([]);
  const [asignadoAMi, setAsignadoAMi] = useState(false);
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
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');

  // Cambio de estado (estilo Zunto)
  const [cambio, setCambio] = useState(null); // { pedido, nuevo, motivo }
  const [guardandoId, setGuardandoId] = useState(null);
  // Asignación inline
  const [asignando, setAsignando] = useState(null); // { pedido, operadorId }
  // Selección masiva
  const [seleccion, setSeleccion] = useState([]);
  const [bulkAbierto, setBulkAbierto] = useState(false);
  const [bulkOperadorId, setBulkOperadorId] = useState('');
  const [repartiendo, setRepartiendo] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleRefreshAll = async () => {
    fetchPedidos();
    showToast('Pedidos actualizados');
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
        setTotalAprox(Boolean(data.totalAproximado));
      } else {
        setError(data.error || 'Error al obtener pedidos');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [page, search, itemsPerPage, estados, asignadoAMi, etiquetaId, asignadoId, fechaDesde, fechaHasta, filtroProducto]);

  // Búsqueda con debounce (estilo Zunto)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(prev => (prev === searchInput.trim() ? prev : searchInput.trim()));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  // Cargar vinculados al montar y cuando cambien page/search/filtros
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
    if (p.producto) return p.producto;
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

  const handleEstadoSelect = (p, nuevo) => {
    const actual = Number(p.EstadoPedido ?? 0);
    if (nuevo === actual) return;
    setCambio({ pedido: p, nuevo, motivo: '' });
  };

  const confirmarCambio = async () => {
    if (!cambio) return;
    const { pedido, nuevo, motivo } = cambio;
    if (nuevo === 1 && !motivo.trim()) return;
    setGuardandoId(pedido.id);
    try {
      await api.patch(`/api/lucidsales/pedidos/${pedido.id}/estado`, {
        estado: nuevo,
        ...(nuevo === 1 ? { motivo: motivo.trim() } : {})
      });
      setPedidos(arr => arr.map(row => row.id === pedido.id ? { ...row, EstadoPedido: nuevo } : row));
      showToast(`#${pedido.idPedido}: ${ESTADOS[nuevo]?.label || nuevo}`);
      setCambio(null);
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al cambiar el estado', 'error');
    } finally {
      setGuardandoId(null);
    }
  };

  const abrirAsignacion = (p) => {
    const inicial = p.asignado?.id || (operadores[0]?.id ?? '');
    setAsignando({ pedido: p, operadorId: inicial });
  };

  const confirmarAsignacion = async () => {
    if (!asignando) return;
    const { pedido, operadorId } = asignando;
    setGuardandoId(pedido.id);
    try {
      const { data } = await api.patch(`/api/lucidsales/pedidos/${pedido.id}/asignar`, { asignadoId: operadorId || null });
      setPedidos(arr => arr.map(row => row.id === pedido.id ? { ...row, asignado: data.asignado || null } : row));
      showToast(data.asignado ? `Asignado a ${data.asignado.nombre}` : 'Pedido desasignado');
      setAsignando(null);
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al asignar', 'error');
    } finally {
      setGuardandoId(null);
    }
  };

  const asignarDirecto = async (p, operadorId) => {
    setGuardandoId(p.id);
    try {
      const { data } = await api.patch(`/api/lucidsales/pedidos/${p.id}/asignar`, { asignadoId: operadorId || null });
      setPedidos(arr => arr.map(row => row.id === p.id ? { ...row, asignado: data.asignado || null } : row));
      showToast(data.asignado ? `Asignado a ${data.asignado.nombre}` : 'Pedido desasignado');
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al asignar', 'error');
    } finally {
      setGuardandoId(null);
    }
  };

  const toggleSel = (id) => {
    setSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const seleccionarPagina = () => {
    const idsPagina = pedidos.map(p => p.id);
    const todosSel = idsPagina.length > 0 && idsPagina.every(id => seleccion.includes(id));
    if (todosSel) setSeleccion(prev => prev.filter(id => !idsPagina.includes(id)));
    else setSeleccion(prev => Array.from(new Set([...prev, ...idsPagina])));
  };

  const bulkAsignar = async () => {
    if (seleccion.length === 0) return;
    setRepartiendo(true);
    try {
      const { data } = await api.patch('/api/lucidsales/bulk-asignar', { ids: seleccion, asignadoId: bulkOperadorId || null });
      showToast(data.message || `${seleccion.length} pedidos asignados`);
      setSeleccion([]);
      setBulkAbierto(false);
      fetchPedidos();
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al asignar', 'error');
    } finally {
      setRepartiendo(false);
    }
  };

  const todosSelPagina = pedidos.length > 0 && pedidos.every(p => seleccion.includes(p.id));

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>LucidSales · Pedidos</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span title={totalAprox ? 'Aproximado: se revisan en vivo en LucidSales a medida que pasas de página' : undefined}>{totalAprox ? '≈ ' : ''}{totalRecords.toLocaleString()} pedidos</span>
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button type="button" onClick={handleRefreshAll} className="btn btn-ghost" style={{ fontSize: 12 }}>
          ⟳ Actualizar
        </button>
      </div>

      {usuario?.rol === 'admin' && seleccion.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{seleccion.length} seleccionado(s)</span>
          <button
            onClick={() => { setBulkOperadorId(operadores[0]?.id || ''); setBulkAbierto(true); }}
            className="btn btn-primary" style={{ fontSize: 12 }}
          >
            👤 Asignar →
          </button>
          <button onClick={() => setSeleccion([])} className="btn btn-ghost" style={{ fontSize: 12 }}>Limpiar</button>
        </div>
      )}

      <div className="filters">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={estados.length === 1 ? String(estados[0]) : ''}
            onChange={e => { const v = e.target.value; setEstados(v === '' ? [] : [Number(v)]); setPage(1); }}
            className={`filter-tab ${estados.length ? 'active' : ''}`}
            style={{ appearance: 'auto', cursor: 'pointer', paddingRight: 26 }}
          >
            <option value="">📅 Estado: todos</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
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
              <option value="__sin__">🚫 Sin asignar</option>
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
          <input
            type="text"
            className="topbar-search"
            placeholder="Buscar pedido..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ width: 250, maxWidth: '100%' }}
          />
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
              <span className="table-header-title">Pedidos ({totalAprox ? '≈' : ''}{totalRecords})</span>
            </div>
            <table>
              <thead>
                <tr>
                  {usuario?.rol === 'admin' && (
                    <th style={{ width: 30 }}>
                      <input type="checkbox" checked={todosSelPagina} onChange={seleccionarPagina} style={{ accentColor: 'var(--accent)' }} />
                    </th>
                  )}
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Producto</th>
                  <th style={{ width: 50, textAlign: 'center' }}>⚠</th>
                  <th>Asignado</th>
                  <th>Envío</th>
                  <th>Total</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                  <th>Etiquetas</th>
                  <th style={{ width: 80 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} onClick={() => { setDetailIds(pedidos.map(pe => pe.id)); setDetailId(p.id); }} style={{ cursor: 'pointer' }}>
                    {usuario?.rol === 'admin' && (
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={seleccion.includes(p.id)}
                          onChange={() => toggleSel(p.id)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                      </td>
                    )}
                    <td data-label="# Pedido" className="td-mono" title={`ID LucidSales: ${p.id}`}>#{p.idPedido}</td>
                    <td data-label="Cliente" className="td-name">{p.Nombre} {p.Apellido}</td>
                    <td data-label="Teléfono">
                      {(() => {
                        const t = telefono(p.Movil);
                        if (!t) return <span style={{ color: 'var(--text3)' }}>—</span>;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                            <a href={t.tel} style={{ color: 'var(--text)' }} onClick={e => e.stopPropagation()}>{t.visible}</a>
                            <a href={t.wa} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', fontSize: 11 }} onClick={e => e.stopPropagation()}>WhatsApp</a>
                          </div>
                        );
                      })()}
                    </td>
                    <td data-label="Estado" onClick={e => e.stopPropagation()}>
                      <select
                        className="estado-select"
                        style={estadoSelectStyle}
                        value={String(p.EstadoPedido ?? 0)}
                        disabled={guardandoId === p.id}
                        onChange={e => handleEstadoSelect(p, Number(e.target.value))}
                      >
                        {Object.entries(ESTADOS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
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
                    <td data-label="Asignado" onClick={e => e.stopPropagation()} style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {p.asignado ? (
                          <span className="badge transito" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`Asignado a ${p.asignado.nombre}`}>
                            {p.asignado.nombre}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)' }}>—</span>
                        )}
                        <button className="action-btn" title={p.asignado ? 'Cambiar asignación' : 'Asignar'} onClick={() => abrirAsignacion(p)} style={{ fontSize: 11 }}>
                          {p.asignado ? 'Cambiar' : 'Asignar'}
                        </button>
                        {p.asignado && (
                          <button className="action-btn danger" title="Desasignar" disabled={guardandoId === p.id} onClick={() => asignarDirecto(p, '')} style={{ fontSize: 12 }}>×</button>
                        )}
                      </div>
                    </td>
                    <td data-label="Envío" style={{ fontSize: 11 }}>
                      {p.EstadoFullfilment ? (
                        <span
                          className={`badge ${/entregado/i.test(p.EstadoFullfilment) ? 'confirmado' : /cancel|devuel/i.test(p.EstadoFullfilment) ? 'red' : /camino|enviado|transito/i.test(p.EstadoFullfilment) ? 'novedad' : ''}`}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {p.EstadoFullfilment}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text3)' }}>—</span>
                      )}
                    </td>
                    <td data-label="Total" className="td-mono">{formatMoney(p.Total)}</td>
                    <td data-label="Fecha" style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text3)' }} title={p.createdAt ? new Date(p.createdAt).toLocaleString('es-CO') : ''}>
                      {haceCuanto(p.createdAt)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>Por página</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
                style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)' }}
              >
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ‹ Anterior
              </button>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>
                Página {page} de {Math.max(numPages, 1)}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= numPages}
                onClick={() => setPage(p => Math.min(numPages, p + 1))}
              >
                Siguiente ›
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: cambio de estado (con motivo obligatorio al cancelar) */}
      {cambio && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setCambio(null)}
        >
          <div
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: 'min(440px, 92vw)', padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Cambiar estado</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.5 }}>
              Cambiar <strong>#{cambio.pedido.idPedido}</strong> de <em>{ESTADOS[Number(cambio.pedido.EstadoPedido ?? 0)]?.label}</em> a <strong>{ESTADOS[cambio.nuevo]?.label}</strong>.
            </p>
            {cambio.nuevo === 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Motivo de la cancelación *</label>
                <input
                  autoFocus
                  value={cambio.motivo}
                  onChange={e => setCambio(c => ({ ...c, motivo: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13 }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCambio(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={guardandoId === cambio.pedido.id || (cambio.nuevo === 1 && !cambio.motivo.trim())}
                onClick={confirmarCambio}
              >
                {guardandoId === cambio.pedido.id ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: asignar operador */}
      {asignando && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setAsignando(null)}
        >
          <div
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: 'min(400px, 92vw)', padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Asignar pedido</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Pedido <strong>#{asignando.pedido.idPedido}</strong> · {asignando.pedido.Nombre} {asignando.pedido.Apellido}
            </p>
            <select
              value={asignando.operadorId}
              onChange={e => setAsignando(a => ({ ...a, operadorId: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13 }}
            >
              <option value="">Sin asignar</option>
              {operadores.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setAsignando(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={guardandoId === asignando.pedido.id}
                onClick={confirmarAsignacion}
              >
                {guardandoId === asignando.pedido.id ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: asignación masiva */}
      {bulkAbierto && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setBulkAbierto(false)}
        >
          <div
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: 'min(400px, 92vw)', padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Asignar {seleccion.length} pedido(s)</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Se asignarán los pedidos seleccionados al operador elegido.
            </p>
            <select
              value={bulkOperadorId}
              onChange={e => setBulkOperadorId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13 }}
            >
              <option value="">Sin asignar</option>
              {operadores.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setBulkAbierto(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={repartiendo}
                onClick={bulkAsignar}
              >
                {repartiendo ? 'Asignando...' : `Asignar ${seleccion.length}`}
              </button>
            </div>
          </div>
        </div>
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
