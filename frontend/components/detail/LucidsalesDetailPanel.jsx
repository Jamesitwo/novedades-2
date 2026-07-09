'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

const ESTADOS = [
  { value: 0, label: 'Por confirmar' },
  { value: 1, label: 'Cancelado' },
  { value: 2, label: 'Confirmado' },
  { value: 3, label: 'Modificado' }
];

const ESTADOS_BADGE = { 0: 'pendiente', 1: 'red', 2: 'entregado', 3: 'purple' };

const GEOFIX_BADGE = {
  exact: { label: 'Direccion exacta', bg: 'rgba(34,200,122,0.12)', color: '#22c87a', border: 'rgba(34,200,122,0.3)' },
  houseNumber: { label: 'Numero encontrado', bg: 'rgba(34,200,122,0.08)', color: '#22c87a', border: 'rgba(34,200,122,0.2)' },
  street: { label: 'Calle encontrada', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  intersection: { label: 'Interseccion', bg: 'rgba(245,158,11,0.07)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
  locality: { label: 'Ciudad/Barrio', bg: 'rgba(139,139,155,0.1)', color: '#8b8b9b', border: 'rgba(139,139,155,0.2)' },
  area: { label: 'Zona aproximada', bg: 'rgba(139,139,155,0.07)', color: '#8b8b9b', border: 'rgba(139,139,155,0.12)' }
};

export default function LucidsalesDetailPanel({ id, ids, currentIndex, onClose, onNavigate, onUpdate }) {
  const [pedido, setPedido] = useState(null);
  const [originalPedido, setOriginalPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deptos, setDeptos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [productosMap, setProductosMap] = useState({});
  const [productosStock, setProductosStock] = useState({});
  const [quotes, setQuotes] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState(null);
  const [editProdPrice, setEditProdPrice] = useState(null);
  const [editProdMode, setEditProdMode] = useState(null);
  const [stockErrors, setStockErrors] = useState({});
  const [refreshingStock, setRefreshingStock] = useState({});
  const [etiquetas, setEtiquetas] = useState([]);
  const [todasEtiquetas, setTodasEtiquetas] = useState([]);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState('');
  const [oficinasIR, setOficinasIR] = useState([]);
  const [buscandoIR, setBuscandoIR] = useState(false);
  const [errorIR, setErrorIR] = useState('');
  const [operadores, setOperadores] = useState([]);

  const [validando, setValidando] = useState(false);
  const [validacion, setValidacion] = useState(null);
  const [showValidacion, setShowValidacion] = useState(false);

  const [showCotizador, setShowCotizador] = useState(false);
  const [showIR, setShowIR] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [camposModificados, setCamposModificados] = useState(new Set());
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitResults, setSplitResults] = useState(null);

  const [openSections, setOpenSections] = useState({
    direccion: true, pedido: true, productos: true, observaciones: false, etiquetas: false
  });

  const direccionRef = useRef(null);
  const panelRef = useRef(null);

  const currentId = id;
  const idIndex = ids.indexOf(currentId);
  const hasPrev = idIndex > 0;
  const hasNext = idIndex >= 0 && idIndex < ids.length - 1;

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (camposModificados.size === 0) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [camposModificados.size]);

  const parseJson = (json) => {
    try { return typeof json === 'string' ? JSON.parse(json) : json || []; }
    catch { return []; }
  };

  const recalcTotalsFromProducts = (jsonStr) => {
    const items = parseJson(jsonStr);
    const subTotal = items.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);
    const costoEnvio = Number(pedido?.CostoEnvio || 0);
    return { SubTotal: String(subTotal), CostoEnvio: String(costoEnvio), Total: String(subTotal + costoEnvio) };
  };

  const handleProductPriceChange = (i, newPrice) => {
    const items = parseJson(pedido.Json);
    items[i] = { ...items[i], price: Number(newPrice) };
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    markModified('Json');
  };

  const handleProductChange = (i, newProductId) => {
    const items = parseJson(pedido.Json);
    items[i] = { ...items[i], product_id: newProductId };
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    markModified('Json');
  };

  const handleQuantityChange = (i, newQty) => {
    const items = parseJson(pedido.Json);
    items[i] = { ...items[i], quantity: Number(newQty) || 1 };
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    markModified('Json');
  };

  const handleRemoveProduct = (i) => {
    let items = parseJson(pedido.Json);
    items = items.filter((_, idx) => idx !== i);
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    setEditProdMode(null);
    markModified('Json');
  };

  const handleAddProduct = () => {
    const items = parseJson(pedido.Json);
    const firstEntry = Object.keys(productosMap)[0];
    items.push({ product_id: firstEntry || '0', price: 0, quantity: 1, variations: [] });
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    setEditProdMode(items.length - 1);
    markModified('Json');
    setOpenSections(prev => ({ ...prev, productos: true }));
  };

  const markModified = (field) => {
    setCamposModificados(prev => { const next = new Set(prev); next.add(field); return next; });
  };

  const loadCiudades = async (deptoId) => {
    setLoadingGeo(true);
    try {
      const { data } = await api.get(`/api/lucidsales/ciudades-locales?deptoId=${deptoId}`);
      setCiudades(data || []);
    } catch { setCiudades([]); }
    finally { setLoadingGeo(false); }
  };

  // data loading
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      setOpenSections({ direccion: true, pedido: true, productos: true, observaciones: false, etiquetas: false });
      setCamposModificados(new Set());
      setUploaded(false);
      setQuotes(null);
      setShowCotizador(false);
      setSelectedQuoteIdx(null);
      setEditProdMode(null);
      setEditProdPrice(null);
      setShowValidacion(false);
      setShowIR(false);
      setOficinasIR([]);

      try {
        const [pedidoRes, deptosRes, prodRes, etiquetasRes] = await Promise.all([
          api.get(`/api/lucidsales/pedidos/${currentId}`),
          api.get('/api/lucidsales/departamentos-locales'),
          api.post('/api/lucidsales/productos').catch(() => ({ data: [] })),
          api.get(`/api/lucidsales/vinculados/${currentId}/etiquetas`).catch(() => ({ data: [] }))
        ]);

        if (cancelled) return;
        const pedidoData = pedidoRes.data;
        if (pedidoData && pedidoData.id) {
          setPedido(pedidoData);
          setOriginalPedido(JSON.parse(JSON.stringify(pedidoData)));
          const yaSubido = pedidoData.idPedidoDropi && String(pedidoData.idPedidoDropi) !== '0' && pedidoData.idPedidoDropi !== 0;
          if (yaSubido) setUploaded(true);
          setEtiquetas(Array.isArray(etiquetasRes.data) ? etiquetasRes.data : []);
          if (Array.isArray(deptosRes.data)) setDeptos(deptosRes.data.sort((a, b) => a.id - b.id));
          if (pedidoData.Departamento != null && pedidoData.Departamento !== 0) await loadCiudades(Number(pedidoData.Departamento));

          try {
            const localRes = await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(currentId), pedido: pedidoData });
            if (localRes.data?.pedido?.conversacionLink) {
              setPedido(prev => ({ ...prev, conversacionLink: localRes.data.pedido.conversacionLink }));
            }
            if (localRes.data?.pedido?.asignadoId) {
              setPedido(prev => ({ ...prev, _asignadoId: localRes.data.pedido.asignadoId }));
            }
          } catch {}

          const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.productos || prodRes.data?.data || [];
          if (prodList.length > 0) {
            const map = {};
            prodList.forEach(p => { const key = p.id ?? p.Id; const name = p.nombre || p.name || p.Nombre || p.nombreProducto || ''; if (key != null) map[String(key)] = name; });
            setProductosMap(map);

            const productIds = [...new Set(parseJson(pedidoData.Json).map(p => String(p.product_id)).filter(Boolean))];
            if (productIds.length > 0) {
              try {
                const stockRes = await api.post('/api/lucidsales/productos-stock', { productIds });
                if (stockRes.data?.ok && stockRes.data.stock) {
                  setProductosStock(stockRes.data.stock);
                  if (stockRes.data.errors) setStockErrors(stockRes.data.errors);
                }
              } catch {}
            }
          }
        } else if (pedidoData && pedidoData.error) {
          setError(pedidoData.error);
        } else {
          setError('Pedido no encontrado');
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Error al cargar el pedido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [currentId]);

  useEffect(() => {
    api.get('/api/etiquetas').then(({ data }) => { if (Array.isArray(data)) setTodasEtiquetas(data); }).catch(() => {});
    api.get('/api/usuarios/operadores').then(({ data }) => { if (Array.isArray(data)) setOperadores(data); }).catch(() => {});
  }, []);

  // handlers
  const handleChange = (field, value) => {
    setPedido(prev => ({ ...prev, [field]: value }));
    markModified(field);
  };

  const handleDepartamentoChange = (deptoId) => {
    handleChange('Departamento', Number(deptoId));
    handleChange('Ciudad', 0);
    setCiudades([]);
    setOficinasIR([]);
    setErrorIR('');
    if (deptoId) loadCiudades(Number(deptoId));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: updateResult } = await api.post(`/api/lucidsales/pedidos/${currentId}`, pedido);
      if (updateResult && updateResult.ok === false) return showToast(updateResult.msg || updateResult.error || 'Error al actualizar', 'error');
      await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(currentId), pedido, asignadoId: pedido._asignadoId || undefined });
      setOriginalPedido(JSON.parse(JSON.stringify(pedido)));
      setCamposModificados(new Set());
      showToast('Pedido actualizado correctamente');
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuote = async () => {
    setQuoting(true); setQuotes(null); setSelectedQuoteIdx(null); setShowCotizador(true);
    try {
      const { data } = await api.post('/api/lucidsales/pedidos/cotizar', { pedidoId: Number(currentId), carrier: 'dropi' });
      setQuotes(data);
    } catch (err) {
      setQuotes({ error: err.response?.data?.error || err.message });
    } finally { setQuoting(false); }
  };

  const handleUpload = async () => {
    if (selectedQuoteIdx == null) return;
    const productos = parseJson(pedido.Json);
    if (productos.length >= 2) { setShowSplitModal(true); return; }
    if (pedido.TipoPago === 2) {
      if (!window.confirm('Este pedido es por TRANSFERENCIA.\n\nYa verificaste que el cliente realizo la transferencia?\n\nPresiona Aceptar solo si el pago ya fue recibido.')) return;
    }
    setUploading(true);
    try {
      const q = quotes.quotes[selectedQuoteIdx];
      await api.post(`/api/lucidsales/pedidos/${currentId}`, pedido);
      await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(currentId), pedido, asignadoId: pedido._asignadoId || undefined });
      setCamposModificados(new Set());
      const { data } = await api.post('/api/lucidsales/pedidos/confirmar-envio', { pedidoId: Number(currentId), transportadora_id: q.transportadora_id });
      if (data.ok) { setUploaded(true); showToast(`Pedido subido a ${q.transportadora} correctamente`); }
      else showToast(data.msg || data.error || 'Error al subir', 'error');
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al subir', 'error');
    } finally { setUploading(false); }
  };

  const handleDuplicate = async () => {
    if (!window.confirm('Crear una copia de este pedido para volver a subirlo?')) return;
    setUploading(true);
    try {
      const { data } = await api.post(`/api/lucidsales/pedidos/${currentId}/duplicar`);
      if (data.ok && data.nuevoId) { showToast(`Pedido duplicado como #${data.nuevoId}`); onClose(); }
      else showToast(data.error || 'Error al duplicar', 'error');
    } catch (err) { showToast(err.response?.data?.error || 'Error al duplicar', 'error'); }
    finally { setUploading(false); }
  };

  const handleSplitUpload = async () => {
    setShowSplitModal(false); setUploading(true);
    const productos = parseJson(pedido.Json);
    setSplitResults({ total: productos.length, exitos: 0, fallos: 0, items: productos.map(p => ({ ...p, status: 'subiendo' })) });
    try {
      await api.post(`/api/lucidsales/pedidos/${currentId}`, pedido);
      await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(currentId), pedido, asignadoId: pedido._asignadoId || undefined });
      setCamposModificados(new Set());
      const q = quotes.quotes[selectedQuoteIdx];
      const { data } = await api.post(`/api/lucidsales/pedidos/${currentId}/subir-dividido`, { transportadora_id: q.transportadora_id });
      const updated = productos.map((p, i) => {
        const res = data.resultados?.find(r => String(r.producto) === String(p.product_id));
        return { ...p, status: res?.exito ? 'ok' : 'error', error: res?.error };
      });
      setSplitResults({ total: data.total, exitos: data.exitos, fallos: data.fallos, items: updated });
      if (data.fallos === 0) setUploaded(true);
    } catch (err) {
      setSplitResults(prev => ({ ...prev, error: err.response?.data?.error || err.message, items: prev.items.map(p => ({ ...p, status: 'error' })) }));
    } finally { setUploading(false); }
  };

  const handleBuscarIR = async () => {
    if (!pedido?.Ciudad) return;
    setBuscandoIR(true); setErrorIR(''); setOficinasIR([]);
    try {
      const { data } = await api.post('/api/lucidsales/interrapidisimo/oficinas', { ciudadId: pedido.Ciudad });
      if (data.ok) setOficinasIR(data.oficinas || []);
      else setErrorIR(data.error || 'Error al buscar oficinas');
    } catch (err) { setErrorIR(err.response?.data?.error || err.message || 'Error de conexion'); }
    finally { setBuscandoIR(false); }
  };

  const handleValidarDireccion = async () => {
    setValidando(true); setValidacion(null); setShowValidacion(true);
    try {
      const ciudadNombre = ciudades.find(c => c.id === Number(pedido.Ciudad))?.name || '';
      const deptoNombre = deptos.find(d => d.id === Number(pedido.Departamento))?.name || '';
      const { data } = await api.post('/api/lucidsales/pedidos/validar-direccion', { direccion: pedido.Direccion || '', ciudad: ciudadNombre, departamento: deptoNombre });
      setValidacion(data);
    } catch (err) {
      setValidacion({ valida: false, errores: [{ codigo: 'ERROR', mensaje: err.response?.data?.error || err.message }], advertencias: [], sugerencias: [], puntuacion: 0 });
    } finally { setValidando(false); }
  };

  const handleAplicarDireccion = (nuevaDireccion) => {
    if (!nuevaDireccion) return;
    handleChange('Direccion', nuevaDireccion);
    setShowValidacion(false); setValidacion(null);
  };

  const handleRefreshStock = async (productId, e) => {
    e.stopPropagation();
    setRefreshingStock(prev => ({ ...prev, [productId]: true }));
    try {
      const { data } = await api.post('/api/lucidsales/productos-stock', { productIds: [productId] });
      if (data?.ok && data.stock) {
        setProductosStock(prev => ({ ...prev, ...data.stock }));
        if (data.errors) setStockErrors(prev => ({ ...prev, ...data.errors }));
        else setStockErrors(prev => { const next = { ...prev }; delete next[productId]; return next; });
      }
    } catch {} 
    finally {
      setRefreshingStock(prev => { const next = { ...prev }; delete next[productId]; return next; });
    }
  };

  const handleSeleccionarOficinaIR = (ofi) => {
    handleChange('Direccion', `Reclamar Oficina Interrapidisimos ${ofi.Direccion || ''}`);
    setShowIR(false); setOficinasIR([]);
  };

  const parseObservaciones = (obs) => {
    try { return typeof obs === 'string' ? JSON.parse(obs) : obs || []; } catch { return []; }
  };

  const formatMoney = (val) => {
    if (val == null || isNaN(Number(val))) return '$0';
    return '$' + Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatMoneyShort = (val) => {
    if (!val) return '$0';
    const n = Number(val);
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return '$' + n.toLocaleString('es-CO');
  };

  const getOverlayPos = () => {
    const rect = direccionRef.current?.getBoundingClientRect();
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    return { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, transform: 'none' };
  };

  const fieldStyle = (fieldName) => ({
    background: 'var(--bg3)',
    border: camposModificados.has(fieldName) ? '2px solid var(--green)' : '1px solid var(--border)',
    borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12,
    width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  });

  // ----- RENDER -----
  if (loading) {
    return (
      <>
        <div className="detail-panel-overlay" onClick={onClose} />
        <div className="detail-panel" ref={panelRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Cargando...</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Cargando pedido...</div>
        </div>
      </>
    );
  }

  if (error && !pedido) {
    return (
      <>
        <div className="detail-panel-overlay" onClick={onClose} />
        <div className="detail-panel" ref={panelRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Pedido</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>{error}</div>
        </div>
      </>
    );
  }

  if (!pedido) return null;

  const estadoActual = ESTADOS.find(e => e.value === pedido.EstadoPedido) || ESTADOS[0];
  const obs = parseObservaciones(pedido.Observaciones);
  const productos = parseJson(pedido.Json);

  const bajoStock = productos.filter(prod => {
    const stock = productosStock[String(prod.product_id)];
    return stock !== undefined && stock !== null && stock <= 20;
  }).map(prod => ({ ...prod, _stock: productosStock[String(prod.product_id)] }));

  return (
    <>
      <div className="detail-panel-overlay" onClick={onClose} />
      <div className="detail-panel" ref={panelRef} style={{ overflowY: 'auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => hasPrev && onNavigate(ids[idIndex - 1])} disabled={!hasPrev}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasPrev ? 'pointer' : 'default', color: 'var(--text)', opacity: hasPrev ? 1 : 0.3, fontSize: 14 }}
              title="Pedido anterior">←</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                Pedido #{pedido.idPedido}
                <span className={`badge ${ESTADOS_BADGE[estadoActual.value] || 'pendiente'}`} style={{ marginLeft: 8, verticalAlign: 'middle', fontSize: 10 }}>
                  {estadoActual.label}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                {idIndex + 1} de {ids.length}
              </div>
            </div>
            <button onClick={() => hasNext && onNavigate(ids[idIndex + 1])} disabled={!hasNext}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasNext ? 'pointer' : 'default', color: 'var(--text)', opacity: hasNext ? 1 : 0.3, fontSize: 14 }}
              title="Pedido siguiente">→</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {uploaded && (
              <button onClick={handleDuplicate} disabled={uploading} className="btn btn-ghost" style={{ fontSize: 11 }}>🔄 Duplicar</button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ fontSize: 11 }}>
              {saving ? 'Guardando...' : camposModificados.size > 0 ? `💾 Guardar (${camposModificados.size})` : '💾 Guardar'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '12px 16px' }}>
          {/* STOCK ALERT */}
          {bajoStock.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 6, marginBottom: 10, background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.3)', fontSize: 11 }}>
              <span style={{ fontWeight: 600 }}>⚠ Stock bajo:</span>
              {bajoStock.map((p, i) => (
                <span key={i} style={{ fontWeight: 500, color: p._stock === 0 ? '#e53e3e' : '#f59e0b', whiteSpace: 'nowrap' }}>
                  {productosMap[String(p.product_id)] || `#${p.product_id}`}
                  {p._stock === 0 ? ' — AGOTADO' : ` — ${p._stock}`}{i < bajoStock.length - 1 ? ' ·' : ''}
                </span>
              ))}
            </div>
          )}

          {/* COTIZADOR */}
          <div style={{ padding: '8px 12px', marginBottom: 10, cursor: uploaded ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', opacity: uploaded ? 0.7 : 1, fontSize: 12 }}
            onClick={() => { if (uploaded) return; if (!quotes) handleQuote(); else setShowCotizador(!showCotizador); }}>
            <span style={{ fontWeight: 600 }}>
              {uploaded ? '✓ Pedido subido' : `Cotizar envio Dropi ${showCotizador ? '▲' : '▼'}`}
              {!uploaded && !showCotizador && quotes?.quotes?.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--text2)', fontSize: 10, marginLeft: 6 }}>· {quotes.quotes.length} cot.</span>
              )}
            </span>
            {!uploaded && (
              <button onClick={e => { e.stopPropagation(); handleQuote(); }} disabled={quoting} className="btn btn-primary" style={{ fontSize: 10 }}>{quoting ? '...' : quotes?.quotes ? 'Re-cotizar' : 'Cotizar'}</button>
            )}
          </div>

          {!uploaded && showCotizador && quotes && (
            <div style={{ padding: 10, marginBottom: 10, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              {quotes?.error && <div style={{ color: 'var(--red)', fontSize: 12, padding: 8 }}>{quotes.error}</div>}
              {quotes?.quotes && quotes.quotes.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {quotes.quotes.map((q, i) => {
                      const hasError = !!q.error; const selected = selectedQuoteIdx === i;
                      return (
                        <div key={i} onClick={() => !hasError && setSelectedQuoteIdx(i)} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: hasError ? 'default' : 'pointer',
                          border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: selected ? 'var(--accent-bg)' : 'var(--bg2)', opacity: hasError ? 0.5 : 1
                        }}>
                          <div style={{ width: 16 }}>{selected && <span style={{ color: 'var(--accent)' }}>✓</span>}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{q.transportadora}</div>
                            {q.objects && (
                              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                                {q.objects.precioEnvio != null && <span style={{ fontWeight: 500, color: 'var(--accent2)', marginRight: 8 }}>{formatMoney(q.objects.precioEnvio)}</span>}
                                {q.objects.trayecto && <span style={{ marginRight: 6 }}>{q.objects.trayecto}</span>}
                                {q.objects.seguroEnvio != null && <span>Seguro: {formatMoney(q.objects.seguroEnvio)}</span>}
                              </div>
                            )}
                            {hasError && <div style={{ fontSize: 10, color: 'var(--red)' }}>{q.error}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedQuoteIdx != null && (
                    <button onClick={handleUpload} disabled={uploading} className="btn btn-success" style={{ fontSize: 11 }}>
                      {uploading ? 'Subiendo...' : `↑ Subir con ${quotes.quotes[selectedQuoteIdx].transportadora}`}
                    </button>
                  )}
                </>
              )}
              {quotes && !quotes.error && (!quotes.quotes || quotes.quotes.length === 0) && (
                <div style={{ color: 'var(--text3)', fontSize: 12 }}>No hay cotizaciones</div>
              )}
            </div>
          )}

          {/* CLIENT DATA */}
          <div className="table-card" style={{ padding: 12, marginBottom: 10 }}>
            <div onClick={() => toggleSection('direccion')} style={{ fontWeight: 600, fontSize: 13, marginBottom: openSections.direccion ? 10 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
              {openSections.direccion ? '▼' : '▶'} Datos del cliente
            </div>
            {openSections.direccion && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Nombre</label>
                    <input type="text" value={pedido.Nombre || ''} onChange={e => handleChange('Nombre', e.target.value)} style={fieldStyle('Nombre')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Apellido</label>
                    <input type="text" value={pedido.Apellido || ''} onChange={e => handleChange('Apellido', e.target.value)} style={fieldStyle('Apellido')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Telefono</label>
                    <input type="text" value={pedido.Movil || ''} onChange={e => handleChange('Movil', e.target.value)} style={fieldStyle('Movil')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Correo</label>
                    <input type="text" value={pedido.Correo || ''} onChange={e => handleChange('Correo', e.target.value)} style={fieldStyle('Correo')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>NIT / Documento</label>
                    <input type="text" value={pedido.NIT || ''} onChange={e => handleChange('NIT', e.target.value)} style={fieldStyle('NIT')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Referencias</label>
                    <input type="text" value={pedido.Referencias || ''} onChange={e => handleChange('Referencias', e.target.value)} style={fieldStyle('Referencias')} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Chat / Conversacion</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="text" value={pedido.conversacionLink || ''} onChange={e => handleChange('conversacionLink', e.target.value)} style={{ ...fieldStyle('conversacionLink'), flex: 1 }} placeholder="https://wa.me/..." />
                    {pedido.conversacionLink && (
                      <a href={pedido.conversacionLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 11, whiteSpace: 'nowrap', textDecoration: 'none' }}>💬</a>
                    )}
                  </div>
                </div>

                {/* DIRECCION */}
                <div ref={direccionRef}>
                  <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Direccion</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="text" value={pedido.Direccion || ''} onChange={e => { handleChange('Direccion', e.target.value); if (validacion) setValidacion(null); }}
                      style={{ ...fieldStyle('Direccion'), flex: 1 }} placeholder="Cra 12 # 45-67, Barrio..." />
                    <button onClick={handleValidarDireccion} disabled={validando || !pedido.Direccion} className="btn btn-ghost" style={{ fontSize: 10, whiteSpace: 'nowrap', padding: '0 8px' }} title="Validar direccion">
                      {validando ? '...' : '✓ Validar'}
                    </button>
                    <button onClick={() => { setShowIR(!showIR); if (!showIR && !oficinasIR.length && pedido?.Ciudad) handleBuscarIR(); }}
                      className="btn btn-ghost" style={{ fontSize: 10, whiteSpace: 'nowrap', padding: '0 8px' }} title="Inter Rapidismo">🏢 IR</button>
                  </div>

                  {/* VALIDACION OVERLAY */}
                  {showValidacion && validacion && (
                    <>
                      <div onClick={() => setShowValidacion(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                      <div style={{ ...getOverlayPos(), zIndex: 1000, padding: 10, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '55vh', overflowY: 'auto', maxWidth: 480 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>Validacion</span>
                            <span style={{ fontWeight: 600, color: validacion.puntuacion >= 80 ? 'var(--green)' : validacion.puntuacion >= 50 ? '#f59e0b' : 'var(--red)' }}>
                              {validacion.puntuacion != null ? `${validacion.puntuacion}/100` : '-'}
                            </span>
                            {validacion.here?.exito && validacion.here?.geoLevel && (
                              <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: GEOFIX_BADGE[validacion.here.geoLevel]?.bg, color: GEOFIX_BADGE[validacion.here.geoLevel]?.color, border: `1px solid ${GEOFIX_BADGE[validacion.here.geoLevel]?.border}` }}>
                                {GEOFIX_BADGE[validacion.here.geoLevel]?.label}
                              </span>
                            )}
                            {validacion.provider && validacion.provider !== 'none' && (
                              <span style={{ fontSize: 9, color: 'var(--text3)' }}>{validacion.provider === 'google' ? '🌍 Google' : '🗺️ HERE'}</span>
                            )}
                          </div>
                          <button onClick={() => setShowValidacion(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                        {validacion.errores?.map((e, i) => (
                          <div key={i} style={{ display: 'flex', gap: 4, padding: '2px 0', color: 'var(--red)', fontSize: 10 }}>
                            <span>✕</span><div>{e.mensaje}{e.sugerencia && <button onClick={() => handleAplicarDireccion(e.sugerencia)} style={{ fontSize: 9, marginLeft: 4, padding: '1px 4px', background: 'none', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text)' }}>Usar</button>}</div>
                          </div>
                        ))}
                        {validacion.advertencias?.map((a, i) => {
                          const isCityConflict = a.codigo === 'CIUDAD_NO_COINCIDE';
                          return (
                            <div key={i} style={{ padding: isCityConflict ? '4px 8px' : '2px 0', color: isCityConflict ? '#e53e3e' : '#f59e0b', fontSize: 10, fontWeight: isCityConflict ? 500 : 400, background: isCityConflict ? 'rgba(229,62,62,0.08)' : 'transparent', borderRadius: isCityConflict ? 4 : 0 }}>
                              {isCityConflict ? '🔴 ' : '⚠ '}{a.mensaje}
                            </div>
                          );
                        })}
                        {validacion.here?.exito && validacion.here.lat && validacion.here.lng && (
                          <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', background: '#e5e3df' }}>
                            <iframe
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${validacion.here.lng - 0.005},${validacion.here.lat - 0.0025},${validacion.here.lng + 0.005},${validacion.here.lat + 0.0025}&layer=mapnik&marker=${validacion.here.lat},${validacion.here.lng}`}
                              width="100%"
                              height="200"
                              style={{ border: 'none', display: 'block' }}
                              title="Mapa de la direccion"
                            />
                            <a href={`https://www.google.com/maps?q=${validacion.here.lat},${validacion.here.lng}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ display: 'block', textAlign: 'center', padding: '6px 0', fontSize: 10, color: 'var(--accent)', textDecoration: 'none', background: 'var(--bg3)' }}>
                              📍 Abrir en Google Maps ↗
                            </a>
                          </div>
                        )}
                        {validacion.sugerencias?.map((s, i) => {
                          const isHere = s.tipo === 'here_verified';
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 4, marginTop: 4, background: isHere ? 'rgba(34,200,122,0.06)' : 'var(--bg3)', border: `1px solid ${isHere ? 'rgba(34,200,122,0.25)' : 'var(--border)'}` }}>
                              <div>
                                <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{s.direccion}</div>
                                <div style={{ fontSize: 9, color: isHere ? 'var(--green)' : 'var(--text3)', fontWeight: isHere ? 600 : 400 }}>{isHere ? '✓ ' : ''}{s.label}</div>
                              </div>
                              <button onClick={() => handleAplicarDireccion(s.direccion)} className="btn btn-primary" style={{ fontSize: 9, padding: '2px 8px' }}>Aplicar</button>
                            </div>
                          );
                        })}
                        {validacion.valida && validacion.puntuacion >= 90 && (
                          <div style={{ color: 'var(--green)', fontSize: 11, fontWeight: 500, marginTop: 4 }}>✓ Direccion correcta</div>
                        )}
                      </div>
                    </>
                  )}

                  {/* IR OVERLAY */}
                  {showIR && (
                    <>
                      <div onClick={() => { setShowIR(false); setOficinasIR([]); }} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                      <div style={{ ...getOverlayPos(), zIndex: 1000, padding: 10, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '55vh', overflowY: 'auto', maxWidth: 480 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>🏢 Inter Rapidismo</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={handleBuscarIR} disabled={!pedido?.Ciudad || buscandoIR} className="btn btn-primary" style={{ fontSize: 10 }}>{buscandoIR ? '...' : 'Buscar'}</button>
                            <button onClick={() => { setShowIR(false); setOficinasIR([]); }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                          </div>
                        </div>
                        {!pedido?.Ciudad && <div style={{ color: 'var(--text3)', fontSize: 11 }}>Selecciona un departamento y ciudad</div>}
                        {errorIR && <div style={{ color: 'var(--red)', fontSize: 11 }}>{errorIR}</div>}
                        {oficinasIR.map((ofi, i) => (
                          <div key={ofi.IdCentroServicio || i} style={{ padding: '6px 10px', background: 'var(--bg3)', borderRadius: 4, border: '1px solid var(--border)', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{ofi.Nombre || 'Oficina'}</div>
                              <div style={{ color: 'var(--text2)', fontSize: 10 }}>{ofi.Direccion}{ofi.Telefono1 && ` · ${ofi.Telefono1}`}</div>
                            </div>
                            <button onClick={() => handleSeleccionarOficinaIR(ofi)} className="btn btn-primary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Usar</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Departamento</label>
                    <select value={pedido.Departamento ?? ''} onChange={e => handleDepartamentoChange(e.target.value)} style={{ ...fieldStyle('Departamento'), appearance: 'auto', cursor: 'pointer' }}>
                      <option value="">Seleccionar...</option>
                      {deptos.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Ciudad</label>
                    <select value={pedido.Ciudad ?? ''} onChange={e => handleChange('Ciudad', Number(e.target.value))} style={{ ...fieldStyle('Ciudad'), appearance: 'auto', cursor: 'pointer' }} disabled={!pedido.Departamento}>
                      <option value="">{loadingGeo ? 'Cargando...' : 'Seleccionar...'}</option>
                      {ciudades.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Notas</label>
                  <textarea value={pedido.notas || ''} onChange={e => handleChange('notas', e.target.value)} rows={2} style={{ ...fieldStyle('notas'), resize: 'vertical' }} />
                </div>
              </div>
            )}
          </div>

          {/* ORDER DATA */}
          <div className="table-card" style={{ padding: 12, marginBottom: 10 }}>
            <div onClick={() => toggleSection('pedido')} style={{ fontWeight: 600, fontSize: 13, marginBottom: openSections.pedido ? 10 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
              {openSections.pedido ? '▼' : '▶'} Datos del pedido
            </div>
            {openSections.pedido && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pedido.TipoPago === 2 && (
                  <div style={{ padding: '6px 10px', borderRadius: 4, fontSize: 11, background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.3)', color: '#e53e3e', fontWeight: 500 }}>
                    ⚠ Transferencia: verifica el pago antes de subir el envio
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Estado</label>
                    <select value={pedido.EstadoPedido ?? 0} onChange={e => handleChange('EstadoPedido', Number(e.target.value))} style={{ ...fieldStyle('EstadoPedido'), appearance: 'auto', cursor: 'pointer' }}>
                      {ESTADOS.map(e => (<option key={e.value} value={e.value}>{e.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Asignado a</label>
                    <select value={pedido._asignadoId || ''} onChange={e => handleChange('_asignadoId', e.target.value)} style={{ ...fieldStyle('_asignadoId'), appearance: 'auto', cursor: 'pointer' }}>
                      <option value="">Sin asignar</option>
                      {operadores.map(op => (<option key={op.id} value={op.id}>{op.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Tipo de pago</label>
                    <select value={pedido.TipoPago ?? 1} onChange={e => handleChange('TipoPago', Number(e.target.value))} style={{ ...fieldStyle('TipoPago'), appearance: 'auto', cursor: 'pointer' }}>
                      <option value={1}>Contra entrega</option>
                      <option value={2}>Transferencia</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Estado pago</label>
                    <select value={pedido.EstadoPago ?? 0} onChange={e => handleChange('EstadoPago', Number(e.target.value))} style={{ ...fieldStyle('EstadoPago'), appearance: 'auto', cursor: 'pointer' }}>
                      <option value={0}>Pendiente</option>
                      <option value={1}>Pagado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, display: 'block' }}>Total</label>
                  <input type="text" value={pedido.Total || '0'} onChange={e => handleChange('Total', e.target.value)}
                    style={{ ...fieldStyle('Total'), fontWeight: 600, color: 'var(--accent2)', fontSize: 16 }} />
                </div>
              </div>
            )}
          </div>

          {/* PRODUCTOS */}
          <div className="table-card" style={{ padding: 12, marginBottom: 10 }}>
            <div onClick={() => toggleSection('productos')} style={{ fontWeight: 600, fontSize: 13, marginBottom: openSections.productos ? 10 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
              {openSections.productos ? '▼' : '▶'} Productos ({productos.length})
            </div>
            {openSections.productos && (
              <>
                {productos.length === 0 ? (
                  <div style={{ color: 'var(--text3)', fontSize: 12 }}>Sin productos</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {productos.map((prod, i) => {
                      const stock = productosStock[String(prod.product_id)];
                      const stockErr = stockErrors[String(prod.product_id)];
                      const stockBadge = stockErr ? (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 600, background: 'rgba(229,62,62,0.1)', color: '#e53e3e', border: '1px solid rgba(229,62,62,0.2)' }} title={stockErr}>
                          ⚠ Stock no disponible
                        </span>
                      ) : stock !== undefined && stock !== null ? (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 600, background: stock === 0 ? 'rgba(229,62,62,0.15)' : stock <= 20 ? 'rgba(245,158,11,0.15)' : 'rgba(34,200,122,0.1)', color: stock === 0 ? '#e53e3e' : stock <= 20 ? '#f59e0b' : '#22c87a', border: `1px solid ${stock === 0 ? 'rgba(229,62,62,0.3)' : stock <= 20 ? 'rgba(245,158,11,0.3)' : 'rgba(34,200,122,0.2)'}` }}>
                          {stock === 0 ? 'AGOTADO' : `Stock: ${stock}`}
                        </span>
                      ) : null;

                      return editProdMode === i ? (
                        <div key={i} style={{ padding: '6px 10px', background: 'var(--bg3)', borderRadius: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <select value={prod.product_id || ''} onChange={e => handleProductChange(i, e.target.value)} style={{ ...fieldStyle(`prod-${i}`), flex: 1, fontSize: 11, appearance: 'auto', cursor: 'pointer' }}>
                              <option value="">Seleccionar producto</option>
                              {Object.entries(productosMap).map(([id, name]) => (<option key={id} value={id}>{name || `#${id}`}</option>))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>Cant:</span>
                            <input type="number" min="1" value={prod.quantity || 1} onChange={e => handleQuantityChange(i, e.target.value)} style={{ width: 50, ...fieldStyle(`qty-${i}`), fontSize: 11, textAlign: 'center' }} />
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>Precio:</span>
                            <input type="number" value={prod.price} onChange={e => handleProductPriceChange(i, e.target.value)} style={{ width: 90, ...fieldStyle(`price-${i}`), fontSize: 11, textAlign: 'right', fontFamily: 'var(--mono)' }} />
                            <button onClick={() => setEditProdMode(null)} className="btn btn-primary" style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}>✓ Listo</button>
                            <button onClick={() => handleRemoveProduct(i)} className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 4px', color: 'var(--red)', flexShrink: 0 }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div key={i} style={{ padding: '6px 10px', background: 'var(--bg3)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}
                          onClick={() => setEditProdMode(i)}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 12 }}>{productosMap[String(prod.product_id)] || `#${prod.product_id}`}</span>
                              <span style={{ color: 'var(--text)', fontSize: 11 }}>x{prod.quantity || 1}</span>
                              {prod.variations?.length > 0 && <span style={{ color: 'var(--text3)', fontSize: 10 }}>({prod.variations.join(', ')})</span>}
                              {stockBadge}
                              <button
                                onClick={(e) => handleRefreshStock(prod.product_id, e)}
                                disabled={refreshingStock[prod.product_id]}
                                style={{
                                  background: 'none', border: '1px solid var(--border)', borderRadius: 3,
                                  cursor: refreshingStock[prod.product_id] ? 'default' : 'pointer',
                                  fontSize: 10, padding: '1px 4px', color: 'var(--text3)',
                                  opacity: refreshingStock[prod.product_id] ? 0.5 : 0.6
                                }}
                                title="Actualizar stock de Dropi"
                              >
                                {refreshingStock[prod.product_id] ? '⏳' : '↻'}
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {editProdPrice === i ? (
                              <input type="number" autoFocus value={prod.price} onChange={e => handleProductPriceChange(i, e.target.value)}
                                onClick={e => e.stopPropagation()} onBlur={() => setEditProdPrice(null)} onKeyDown={e => e.key === 'Enter' && setEditProdPrice(null)}
                                style={{ width: 90, ...fieldStyle(`inline-price-${i}`), textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11 }} />
                            ) : (
                              <div onClick={e => { e.stopPropagation(); setEditProdPrice(i); }} style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)', fontWeight: 500, padding: '1px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>
                                {formatMoneyShort(prod.price)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={handleAddProduct} className="btn btn-ghost" style={{ marginTop: 6, fontSize: 11, width: '100%', justifyContent: 'center' }}>+ Agregar producto</button>
              </>
            )}
          </div>

          {/* OBSERVACIONES */}
          <div className="table-card" style={{ padding: 12, marginBottom: 10 }}>
            <div onClick={() => toggleSection('observaciones')} style={{ fontWeight: 600, fontSize: 13, marginBottom: openSections.observaciones ? 8 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
              {openSections.observaciones ? '▼' : '▶'} Observaciones ({obs.length})
            </div>
            {openSections.observaciones && (
              obs.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>Sin observaciones</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {obs.map((o, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: 'var(--bg3)', borderRadius: 4, fontSize: 12, borderLeft: '3px solid var(--accent)' }}>
                      <div style={{ color: 'var(--text)' }}>{o.desc}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 1 }}>{o.update || ''}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* ETIQUETAS */}
          <div className="table-card" style={{ padding: 12, marginBottom: 10 }}>
            <div onClick={() => toggleSection('etiquetas')} style={{ fontWeight: 600, fontSize: 13, marginBottom: openSections.etiquetas ? 8 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
              {openSections.etiquetas ? '▼' : '▶'} Etiquetas ({etiquetas.length})
            </div>
            {openSections.etiquetas && (
              <>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {etiquetas.length > 0 ? etiquetas.map(e => (
                    <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#fff', background: e.color }}>
                      {e.nombre}
                      <button onClick={async () => {
                        try { await api.delete(`/api/lucidsales/vinculados/${currentId}/etiquetas/${e.id}`); const { data } = await api.get(`/api/lucidsales/vinculados/${currentId}/etiquetas`); setEtiquetas(Array.isArray(data) ? data : []); } catch {}
                      }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                    </span>
                  )) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>Sin etiquetas</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={selectedEtiqueta} onChange={e => setSelectedEtiqueta(e.target.value)} style={{ ...fieldStyle('etiqueta'), flex: 1, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="">Agregar etiqueta...</option>
                    {todasEtiquetas.filter(e => !etiquetas.some(ne => ne.id === e.id)).map(e => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
                  </select>
                  <button disabled={!selectedEtiqueta} onClick={async () => {
                    try { await api.post(`/api/lucidsales/vinculados/${currentId}/etiquetas`, { etiquetaId: selectedEtiqueta }); const { data } = await api.get(`/api/lucidsales/vinculados/${currentId}/etiquetas`); setEtiquetas(Array.isArray(data) ? data : []); setSelectedEtiqueta(''); }
                    catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
                  }} className="btn btn-primary" style={{ fontSize: 11 }}>Agregar</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
          {toast.message}
        </div>
      )}

      {/* SPLIT MODAL */}
      {showSplitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 14, width: 'min(450px, 92vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 15 }}>Dividir pedido en ordenes separadas</div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                Este pedido tiene <strong>{productos.length} productos</strong>. Dropi no permite subir productos de diferentes proveedores en una sola orden.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {productos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg3)', borderRadius: 4, fontSize: 12 }}>
                    <span>{productosMap[String(p.product_id)] || `#${p.product_id}`} x{p.quantity || 1}</span>
                    <span style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>{formatMoneyShort(p.price * (p.quantity || 1))}</span>
                  </div>
                ))}
              </div>
              {splitResults ? (
                <div style={{ marginBottom: 14 }}>
                  {splitResults.error && <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 6 }}>{splitResults.error}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {splitResults.items.map((p, i) => (
                      <div key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{p.status === 'ok' ? '✅' : p.status === 'error' ? '❌' : '⏳'}</span>
                        <span>{productosMap[String(p.product_id)] || `#${p.product_id}`}</span>
                        {p.error && <span style={{ color: 'var(--red)', fontSize: 9 }}>{p.error}</span>}
                      </div>
                    ))}
                  </div>
                  {splitResults.fallos === 0 && splitResults.exitos > 0 && (
                    <div style={{ marginTop: 10, color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>¡{splitResults.exitos}/{splitResults.total} pedidos subidos!</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 14 }}>⚠ Se crearan {productos.length} pedidos y se subiran a Dropi automaticamente.</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {!splitResults && (
                  <>
                    <button onClick={() => setShowSplitModal(false)} className="btn btn-ghost">Cancelar</button>
                    <button onClick={handleSplitUpload} className="btn btn-primary" style={{ fontSize: 12 }}>Dividir y subir</button>
                  </>
                )}
                {splitResults && <button onClick={() => { setShowSplitModal(false); setSplitResults(null); }} className="btn btn-primary">Cerrar</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
