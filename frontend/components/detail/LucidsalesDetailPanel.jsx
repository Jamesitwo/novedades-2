'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Autocomplete from '@/components/ui/Autocomplete';

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

const TRANSPORTADORA_COLORS = [
  { match: /interrapidisimo|inter\s*rapid/i, bg: '#1a1a1a', border: '#f97316', text: '#fff' },
  { match: /coordinadora/i, bg: '#1e3a5f', border: '#3b82f6', text: '#3b82f6' },
  { match: /envia/i, bg: '#7f1d1d', border: '#ef4444', text: '#ef4444' },
  { match: /tcc/i, bg: '#451a03', border: '#eab308', text: '#eab308' },
  { match: /veloces/i, bg: '#4c0519', border: '#f43f5e', text: '#f43f5e' },
  { match: /domina/i, bg: '#172554', border: '#eab308', text: '#3b82f6' },
];

function getTransportadoraColors(name) {
  const cfg = TRANSPORTADORA_COLORS.find(c => c.match.test(name || ''));
  return cfg || { bg: 'var(--bg2)', border: 'var(--border)', text: 'var(--text)' };
}

function DetalleTecnico({ detalle }) {
  const [abierto, setAbierto] = useState(false);
  if (!detalle) return null;
  let texto;
  try { texto = typeof detalle === 'string' ? detalle : JSON.stringify(detalle, null, 2); }
  catch { texto = String(detalle); }
  return (
    <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--bg)' }}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 10px', background: 'var(--bg2)', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
      >
        <span>Detalle tecnico</span>
        <Icon name={abierto ? 'expand_less' : 'expand_more'} size={14} />
      </button>
      {abierto && (
        <pre style={{ margin: 0, padding: '8px 10px', fontSize: 10, fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text2)', maxHeight: 220, overflow: 'auto', borderTop: '1px solid var(--border)' }}>
          {texto.slice(0, 4000)}
        </pre>
      )}
    </div>
  );
}

function ErrorCard({ mensaje, detalle }) {
  if (!mensaje) return null;
  return (
    <div style={{ margin: '8px 0', padding: '10px 12px', borderRadius: 8, background: 'color-mix(in srgb, var(--red) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Icon name="error" size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word' }}>{mensaje}</div>
          <DetalleTecnico detalle={detalle} />
        </div>
      </div>
    </div>
  );
}

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
  const [uploadError, setUploadError] = useState(null);

  const [toast, setToast] = useState(null);
  const [editProdPrice, setEditProdPrice] = useState(null);
  const [irConfirm, setIrConfirm] = useState(null);
  const [editProdMode, setEditProdMode] = useState(null);
  const [stockErrors, setStockErrors] = useState({});
  const [refreshingStock, setRefreshingStock] = useState({});
  const [etiquetas, setEtiquetas] = useState([]);
  const [todasEtiquetas, setTodasEtiquetas] = useState([]);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState('');
  const [oficinasIR, setOficinasIR] = useState([]);
  const [alertasPedido, setAlertasPedido] = useState([]);
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
      setAlertasPedido([]);

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
          const yaSubido = (pedidoData.idPedidoDropi && String(pedidoData.idPedidoDropi) !== '0' && pedidoData.idPedidoDropi !== 0) || !!pedidoData._subidoPorId;
          if (yaSubido) setUploaded(true);
          setEtiquetas(Array.isArray(etiquetasRes.data) ? etiquetasRes.data : []);
          if (Array.isArray(deptosRes.data)) setDeptos(deptosRes.data.sort((a, b) => a.id - b.id));
          if (pedidoData.Departamento != null && pedidoData.Departamento !== 0) await loadCiudades(Number(pedidoData.Departamento));

          try {
            const localRes = await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(currentId), pedido: pedidoData });
            if (localRes.data?.pedido?.asignadoId) {
              setPedido(prev => ({ ...prev, _asignadoId: localRes.data.pedido.asignadoId }));
            }
          } catch {}

          try {
            const aRes = await api.get(`/api/alertas/pedido/${currentId}`);
            if (!cancelled) setAlertasPedido(Array.isArray(aRes.data) ? aRes.data : []);
          } catch { if (!cancelled) setAlertasPedido([]); }

          const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.productos || prodRes.data?.data || [];
          if (prodList.length > 0) {
            const map = {};
            prodList.forEach(p => {
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
    if (!pedido) return;
    const productIds = [...new Set(parseJson(pedido.Json).map(p => String(p.product_id)).filter(Boolean))];
    if (productIds.length === 0) return;
    (async () => {
      try {
        const stockRes = await api.post('/api/lucidsales/productos-stock', { productIds });
        if (stockRes.data?.ok && stockRes.data.stock) {
          setProductosStock(stockRes.data.stock);
          if (stockRes.data.errors) setStockErrors(stockRes.data.errors);
        }
      } catch {}
    })();
  }, [pedido?.id]);

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
    setQuoting(true); setQuotes(null); setSelectedQuoteIdx(null); setShowCotizador(true); setUploadError(null);
    try {
      const { data } = await api.post('/api/lucidsales/pedidos/cotizar', { pedidoId: Number(currentId), carrier: 'dropi' });
      setQuotes(data);
    } catch (err) {
      setQuotes({ error: err.response?.data?.error || err.message, detalle: err.response?.data?.detalle || null });
    } finally { setQuoting(false); }
  };

  const handleUpload = async () => {
    if (selectedQuoteIdx == null) return;
    const productos = parseJson(pedido.Json);
    if (productos.length >= 2) { setShowSplitModal(true); return; }
    if (pedido.TipoPago === 2) {
      if (!window.confirm('Este pedido es por TRANSFERENCIA.\n\nYa verificaste que el cliente realizo la transferencia?\n\nPresiona Aceptar solo si el pago ya fue recibido.')) return;
    }
    if (selectedQuoteIdx == null || !quotes?.quotes?.[selectedQuoteIdx]) return;
    const q = quotes.quotes[selectedQuoteIdx];
    const direccion = (pedido.Direccion || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const esInter = direccion.includes('interrapidisimo');
    if (esInter && !q.transportadora?.toLowerCase().includes('interrapidisimo')) {
      setIrConfirm({ transportadora: q.transportadora, onProceed: () => {
        setIrConfirm(null);
        doUpload(q);
      }, onCancel: () => setIrConfirm(null) });
      return;
    }
    doUpload(q);
  };

  const doUpload = async (q) => {
    setUploading(true);
    setUploadError(null);
    try {
      await api.post(`/api/lucidsales/pedidos/${currentId}`, pedido);
      setCamposModificados(new Set());
      const { data } = await api.post('/api/lucidsales/pedidos/confirmar-envio', { pedidoId: Number(currentId), transportadora_id: q.transportadora_id });
      if (data.ok) {
        setUploaded(true);
        try {
          const { data: fresh } = await api.get(`/api/lucidsales/pedidos/${currentId}`);
          if (fresh && fresh.id) {
            setPedido(fresh);
            setOriginalPedido(JSON.parse(JSON.stringify(fresh)));
          }
        } catch {}
        showToast(`Pedido subido y confirmado a ${q.transportadora}`);
        if (onUpdate) onUpdate();
      } else showToast(data.msg || data.error || 'Error al subir', 'error');
    } catch (err) {
      const mensaje = err.response?.data?.error || err.message || 'Error al subir';
      setUploadError({ mensaje, detalle: err.response?.data?.detalle || null });
      showToast(mensaje, 'error');
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
        return { ...p, status: res?.exito ? 'ok' : 'error', error: res?.error, detalle: res?.detalle || null };
      });
      setSplitResults({ total: data.total, exitos: data.exitos, fallos: data.fallos, items: updated });
      if (data.fallos === 0) {
        setUploaded(true);
        setPedido(prev => ({ ...prev, EstadoPedido: 2 }));
      }
    } catch (err) {
      setSplitResults(prev => ({ ...prev, error: err.response?.data?.error || err.message, detalle: err.response?.data?.detalle || null, items: prev.items.map(p => ({ ...p, status: 'error' })) }));
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
    background: 'var(--bg)',
    border: camposModificados.has(fieldName) ? '2px solid var(--green)' : '1px solid var(--border)',
    borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
    width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s'
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

  const estadoColor = { 0: 'var(--amber)', 1: 'var(--red)', 2: 'var(--green)', 3: 'var(--purple)' }[pedido.EstadoPedido] || 'var(--text2)';

  const LBL = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', fontFamily: 'var(--label-font)', display: 'block', marginBottom: 4 };

  const SelectField = ({ label, value, onChange, children, disabled, fn }) => (
    <div style={{ minWidth: 0 }}>
      <label style={LBL}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={onChange} disabled={disabled} style={{ ...fieldStyle(fn), appearance: 'none', paddingRight: 32, height: 40, cursor: 'pointer' }}>
          {children}
        </select>
        <Icon name="expand_more" size={18} style={{ position: 'absolute', right: 8, top: 11, color: 'var(--text3)', pointerEvents: 'none' }} />
      </div>
    </div>
  );

  const AccordionHeader = ({ title, count, open, onToggle }) => (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', cursor: 'pointer', userSelect: 'none', fontWeight: 700, fontSize: 13, color: 'var(--text)', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
      <Icon name={open ? 'expand_more' : 'play_arrow'} size={18} style={{ color: 'var(--text3)' }} />
      {title}
      {count != null && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({count})</span>}
    </div>
  );

  return (
    <>
      <div className="detail-panel-overlay" onClick={onClose} />

      <div className="detail-panel" ref={panelRef} style={{ overflowY: 'auto', background: 'var(--bg2)' }}>

        {/* HEADER */}
        <div className="lsd-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
            <button onClick={() => hasPrev && onNavigate(ids[idIndex - 1])} disabled={!hasPrev} className="lsd-nav-btn" title="Pedido anterior" aria-label="Pedido anterior">
              <Icon name="arrow_back" size={20} />
            </button>
            <div style={{ minWidth: 0, padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', margin: 0, whiteSpace: 'nowrap' }}>Pedido #{pedido.idPedido}</h1>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `color-mix(in srgb, ${estadoColor} 15%, transparent)`, color: estadoColor, border: `1px solid color-mix(in srgb, ${estadoColor} 35%, transparent)` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: estadoColor }} />
                  {estadoActual.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                {idIndex + 1} de {ids.length}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {etiquetas.map(e => (
                  <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: e.color, border: '1px solid transparent' }}>
                    {e.nombre}
                  </span>
                ))}
                <button onClick={() => { setOpenSections(prev => ({ ...prev, etiquetas: true })); }} className="lsd-nav-btn" style={{ width: 26, height: 26, border: '1px dashed var(--border)' }} title="Agregar etiqueta">
                  <Icon name="add" size={14} />
                </button>
              </div>
            </div>
            <button onClick={() => hasNext && onNavigate(ids[idIndex + 1])} disabled={!hasNext} className="lsd-nav-btn" title="Pedido siguiente" aria-label="Pedido siguiente">
              <Icon name="arrow_forward" size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Button variant="ghost" size="sm" icon="content_copy" onClick={handleDuplicate} disabled={uploading}>Duplicar</Button>
            <Button size="sm" icon="save" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : camposModificados.size > 0 ? `Guardar (${camposModificados.size})` : 'Guardar'}
            </Button>
            <button onClick={onClose} className="lsd-nav-btn" aria-label="Cerrar">
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* STOCK ALERT */}
          {bajoStock.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--red) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)', color: 'var(--red)', fontSize: 12 }}>
              <Icon name="warning" size={18} />
              <span style={{ fontWeight: 700 }}>Stock bajo:</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {bajoStock.map((p, i) => (
                  <span key={i} style={{ fontWeight: 500 }}>
                    {productosMap[String(p.product_id)]?.name || `#${p.product_id}`}
                    {p._stock === 0 ? ' — AGOTADO' : ` — ${p._stock}`}{i < bajoStock.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* PRODUCT ALERTS */}
          {alertasPedido.length > 0 && alertasPedido.map((a, i) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10,
              background: a.tipo === 'danger' ? 'rgba(239,68,68,0.08)' : a.tipo === 'info' ? 'rgba(59,130,246,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${a.tipo === 'danger' ? 'rgba(239,68,68,0.25)' : a.tipo === 'info' ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
              fontSize: 11
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {a.tipo === 'danger' ? '🔴' : a.tipo === 'info' ? 'ℹ️' : '⚠️'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--accent2)', display: 'block' }}>{a.productoNombre}</span>
                <span style={{ color: 'var(--text)' }}>{a.mensaje}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginTop: 2 }}>
                  Por {a.createdBy?.nombre || '...'} · {new Date(a.createdAt).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
          ))}

          {/* SUMMARY CARD */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...LBL, marginBottom: 2 }}>Total</div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'var(--mono)', color: 'var(--accent2)', lineHeight: 1.1 }}>{formatMoney(pedido.Total)}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Flete</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{formatMoney(pedido.fleteDropi)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Ganancia</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{formatMoney(pedido.gananciaEsperadaDropi)}</span>
              </div>
            </div>
          </div>

          {/* COTIZADOR */}
          <div
            style={{
              background: 'var(--bg3)', borderRadius: 12,
              border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))',
              boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--accent) 25%, transparent)',
              opacity: uploaded ? 0.75 : 1,
              overflow: 'hidden', transition: 'all 0.15s'
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, cursor: uploaded ? 'default' : 'pointer' }}
              onClick={() => { if (uploaded) return; if (!quotes) handleQuote(); else setShowCotizador(!showCotizador); }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: 'var(--accent2)', minWidth: 0 }}>
                <Icon name="local_shipping" size={20} />
                {uploaded ? '✓ Pedido subido' : 'Cotizar envío Dropi'}
                {!uploaded && (
                  <>
                    <Icon name={showCotizador ? 'expand_less' : 'expand_more'} size={18} style={{ color: 'var(--text3)' }} />
                    {!showCotizador && quotes?.quotes?.length > 0 && (
                      <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 11 }}>· {quotes.quotes.length} cot.</span>
                    )}
                  </>
                )}
              </span>
              {!uploaded && (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleQuote(); }} disabled={quoting}>
                  {quoting ? '...' : quotes?.quotes ? 'Re-cotizar' : 'Cotizar ahora'}
                </Button>
              )}
            </div>

            {!uploaded && showCotizador && quotes && (
              <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ padding: '10px 0' }}>
                  {quotes?.error && <ErrorCard mensaje={quotes.error} detalle={quotes.detalle} />}
                  {quotes?.quotes && quotes.quotes.length > 0 && (
                    <>
                      <div className="lsd-quotes">
                        {quotes.quotes.map((q, i) => {
                          const hasError = !!q.error; const selected = selectedQuoteIdx === i;
                          const tColors = getTransportadoraColors(q.transportadora);
                          return (
                            <div key={i} onClick={() => !hasError && setSelectedQuoteIdx(i)} style={{
                              display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: 8, cursor: hasError ? 'default' : 'pointer',
                              border: selected ? `2px solid ${tColors.border}` : `1px solid ${tColors.border}`,
                              background: selected ? tColors.bg : 'var(--bg2)', opacity: hasError ? 0.5 : 1,
                              transition: 'all 0.15s'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: 12, color: tColors.text }}>{q.transportadora}</span>
                                {selected && <span style={{ color: tColors.border, fontSize: 12 }}>✓</span>}
                              </div>
                              {q.objects && (
                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                  {q.objects.precioEnvio != null && <div style={{ fontWeight: 700, color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>{formatMoney(q.objects.precioEnvio)}</div>}
                                  {q.objects.trayecto && <div style={{ fontSize: 10 }}>{q.objects.trayecto}</div>}
                                  {q.objects.seguroEnvio != null && <div style={{ fontSize: 10 }}>Seguro: {formatMoney(q.objects.seguroEnvio)}</div>}
                                </div>
                              )}
                              {hasError && <div style={{ fontSize: 10, color: 'var(--red)' }}>{q.error}</div>}
                            </div>
                          );
                        })}
                      </div>
                      {selectedQuoteIdx != null && (
                        <Button variant="success" size="sm" icon="upload" onClick={handleUpload} disabled={uploading} style={{ marginTop: 10 }}>
                          {uploading ? 'Subiendo...' : `Subir con ${quotes.quotes[selectedQuoteIdx].transportadora}`}
                        </Button>
                      )}
                      {uploadError && <ErrorCard mensaje={uploadError.mensaje} detalle={uploadError.detalle} />}
                    </>
                  )}
                  {quotes && !quotes.error && (!quotes.quotes || quotes.quotes.length === 0) && (
                    <div style={{ color: 'var(--text3)', fontSize: 12 }}>No hay cotizaciones</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FORM GRID */}
          <div className="lsd-grid-2" style={{ gap: 12 }}>
            <SelectField label="Estado" fn="EstadoPedido" value={pedido.EstadoPedido ?? 0} onChange={e => handleChange('EstadoPedido', Number(e.target.value))}>
              {ESTADOS.map(e => (<option key={e.value} value={e.value}>{e.label}</option>))}
            </SelectField>
            <SelectField label="Tipo de pago" fn="TipoPago" value={pedido.TipoPago ?? 1} onChange={e => handleChange('TipoPago', Number(e.target.value))}>
              <option value={1}>Contra entrega</option>
              <option value={2}>Transferencia</option>
            </SelectField>
            <SelectField label="Asignado a" fn="_asignadoId" value={pedido._asignadoId || ''} onChange={e => handleChange('_asignadoId', e.target.value)}>
              <option value="">Sin asignar</option>
              {operadores.map(op => (<option key={op.id} value={op.id}>{op.nombre}</option>))}
            </SelectField>
            <div style={{ minWidth: 0 }}>
              <label style={LBL}>Referencias</label>
              <input type="text" value={pedido.Referencias || ''} onChange={e => handleChange('Referencias', e.target.value)}
                style={{ ...fieldStyle('Referencias'), height: 40, fontFamily: 'var(--mono)' }} />
            </div>
            {pedido.TipoPago === 2 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 11, background: 'color-mix(in srgb, var(--red) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)', color: 'var(--red)', fontWeight: 500 }}>
                <Icon name="warning" size={16} />
                Transferencia: verifica el pago antes de subir el envio
              </div>
            )}
          </div>

          {/* PRODUCTOS */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader title="Productos" count={productos.length} open={openSections.productos} onToggle={() => toggleSection('productos')} />
            {openSections.productos && (
              <div style={{ padding: 14 }}>
                {productos.length === 0 ? (
                  <div style={{ color: 'var(--text3)', fontSize: 12 }}>Sin productos</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {productos.map((prod, i) => {
                      const stock = productosStock[String(prod.product_id)];
                      const stockErr = stockErrors[String(prod.product_id)];
                      const stockBadge = stockErr ? (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' }} title={stockErr}>
                          ⚠ Stock no disponible
                        </span>
                      ) : stock !== undefined && stock !== null ? (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: stock === 0 ? 'color-mix(in srgb, var(--red) 18%, transparent)' : stock <= 20 ? 'color-mix(in srgb, var(--amber) 18%, transparent)' : 'color-mix(in srgb, var(--green) 14%, transparent)', color: stock === 0 ? 'var(--red)' : stock <= 20 ? 'var(--amber)' : 'var(--green)', border: `1px solid ${stock === 0 ? 'color-mix(in srgb, var(--red) 35%, transparent)' : stock <= 20 ? 'color-mix(in srgb, var(--amber) 35%, transparent)' : 'color-mix(in srgb, var(--green) 30%, transparent)'}` }}>
                          {stock === 0 ? 'AGOTADO' : `Stock: ${stock}`}
                        </span>
                      ) : null;

                      return editProdMode === i ? (
                        <div key={i} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {(() => {
                              const pi = productosMap[String(prod.product_id)];
                              return pi?.image ? <img src={pi.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} /> : null;
                            })()}
                            <select value={prod.product_id || ''} onChange={e => handleProductChange(i, e.target.value)} style={{ ...fieldStyle(`prod-${i}`), flex: 1, fontSize: 12, appearance: 'auto', cursor: 'pointer' }}>
                              <option value="">Seleccionar producto</option>
                              {Object.entries(productosMap).map(([id, info]) => (<option key={id} value={id}>{info.name || `#${id}`}</option>))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Cant:</span>
                            <input type="number" min="1" value={prod.quantity || 1} onChange={e => handleQuantityChange(i, e.target.value)} style={{ width: 56, ...fieldStyle(`qty-${i}`), fontSize: 12, textAlign: 'center' }} />
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Precio:</span>
                            <input type="number" value={prod.price} onChange={e => handleProductPriceChange(i, e.target.value)} style={{ width: 100, ...fieldStyle(`price-${i}`), fontSize: 12, textAlign: 'right', fontFamily: 'var(--mono)' }} />
                            <Button size="sm" onClick={() => setEditProdMode(null)}>✓ Listo</Button>
                            <Button variant="dangerGhost" size="sm" onClick={() => handleRemoveProduct(i)}>✕</Button>
                          </div>
                        </div>
                      ) : (
                        <div key={i} style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          onClick={() => setEditProdMode(i)}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {(() => {
                                const pi = productosMap[String(prod.product_id)];
                                return (
                                  <>
                                    {pi?.image && <img src={pi.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', background: 'var(--bg3)' }} onError={e => { e.target.style.display = 'none'; }} />}
                                    <span style={{ color: 'var(--accent2)', fontWeight: 700, fontSize: 12 }}>{pi?.name || `#${prod.product_id}`}</span>
                                  </>
                                );
                              })()}
                              <span style={{ color: 'var(--text2)', fontSize: 11, fontFamily: 'var(--mono)' }}>x{prod.quantity || 1}</span>
                              {prod.variations?.length > 0 && <span style={{ color: 'var(--text3)', fontSize: 10 }}>({prod.variations.join(', ')})</span>}
                              {stockBadge}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {editProdPrice === i ? (
                              <input type="number" autoFocus value={prod.price} onChange={e => handleProductPriceChange(i, e.target.value)}
                                onClick={e => e.stopPropagation()} onBlur={() => setEditProdPrice(null)} onKeyDown={e => e.key === 'Enter' && setEditProdPrice(null)}
                                style={{ width: 100, ...fieldStyle(`inline-price-${i}`), textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }} />
                            ) : (
                              <div onClick={e => { e.stopPropagation(); setEditProdPrice(i); }} style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)', fontWeight: 600, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                                {formatMoneyShort(prod.price)}
                              </div>
                            )}
                            <button
                              onClick={(e) => handleRefreshStock(prod.product_id, e)}
                              disabled={refreshingStock[prod.product_id]}
                              className="lsd-nav-btn"
                              title="Actualizar stock desde Dropi"
                              aria-label="Actualizar stock"
                            >
                              <Icon name="refresh" size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={handleAddProduct} className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12, width: '100%', justifyContent: 'center', borderStyle: 'dashed', minHeight: 40 }}>
                  <Icon name="add" size={18} /> Agregar producto
                </button>
              </div>
            )}
          </div>

          {/* CLIENTE */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader title="Datos del cliente" open={openSections.direccion} onToggle={() => toggleSection('direccion')} />
            {openSections.direccion && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="lsd-grid-2" style={{ gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Nombre</label>
                    <input type="text" value={pedido.Nombre || ''} onChange={e => handleChange('Nombre', e.target.value)} style={{ ...fieldStyle('Nombre'), height: 40 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Apellido</label>
                    <input type="text" value={pedido.Apellido || ''} onChange={e => handleChange('Apellido', e.target.value)} style={{ ...fieldStyle('Apellido'), height: 40 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Telefono</label>
                    <input type="text" value={pedido.Movil || ''} onChange={e => handleChange('Movil', e.target.value)} style={{ ...fieldStyle('Movil'), height: 40, fontFamily: 'var(--mono)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Correo</label>
                    <input type="text" value={pedido.Correo || ''} onChange={e => handleChange('Correo', e.target.value)} style={{ ...fieldStyle('Correo'), height: 40 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>NIT / Documento</label>
                    <input type="text" value={pedido.NIT || ''} onChange={e => handleChange('NIT', e.target.value)} style={{ ...fieldStyle('NIT'), height: 40 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Referencias</label>
                    <input type="text" value={pedido.Referencias || ''} onChange={e => handleChange('Referencias', e.target.value)} style={{ ...fieldStyle('Referencias'), height: 40, fontFamily: 'var(--mono)' }} />
                  </div>
                </div>

                <div>
                  <label style={LBL}>Chat / Conversacion</label>
                  {(pedido.botInbox || pedido.conversacionLink) ? (
                    <a href={pedido.botInbox || pedido.conversacionLink} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        fontSize: 13, fontWeight: 700, width: '100%', boxSizing: 'border-box', minHeight: 44,
                        background: '#25D366', color: '#06281a', borderRadius: 8, textDecoration: 'none',
                        transition: 'filter 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
                      <Icon name="chat" size={18} /> Abrir conversación
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>Sin conversacion</span>
                  )}
                </div>

                {/* DIRECCION */}
                <div ref={direccionRef}>
                  <label style={LBL}>Direccion</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={pedido.Direccion || ''} onChange={e => { handleChange('Direccion', e.target.value); if (validacion) setValidacion(null); }}
                      style={{ ...fieldStyle('Direccion'), flex: 1, height: 40 }} placeholder="Cra 12 # 45-67, Barrio..." />
                    <Button size="sm" icon="check" onClick={handleValidarDireccion} disabled={validando || !pedido.Direccion}
                      style={{
                        height: 40, background: 'var(--green)', color: '#fff', border: 'none',
                        fontWeight: 700
                      }} title="Validar direccion">
                      Validar
                    </Button>
                    <Button size="sm" icon="location_on" onClick={() => { setShowIR(!showIR); if (!showIR && !oficinasIR.length && pedido?.Ciudad) handleBuscarIR(); }}
                      style={{
                        height: 40, background: '#f97316', color: '#fff', border: 'none',
                        fontWeight: 700
                      }} title="Inter Rapidismo">
                      IR
                    </Button>
                  </div>

                  {/* VALIDACION OVERLAY */}
                  {showValidacion && validacion && (
                    <>
                      <div onClick={() => setShowValidacion(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                      <div style={{ ...getOverlayPos(), zIndex: 1000, padding: 12, borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 11, boxShadow: '0 16px 30px rgba(0,0,0,0.35)', maxHeight: '55vh', overflowY: 'auto', maxWidth: 480 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>Validacion</span>
                            <span style={{ fontWeight: 600, color: validacion.puntuacion >= 80 ? 'var(--green)' : validacion.puntuacion >= 50 ? 'var(--amber)' : 'var(--red)' }}>
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
                            <div key={i} style={{ padding: isCityConflict ? '4px 8px' : '2px 0', color: isCityConflict ? 'var(--red)' : 'var(--amber)', fontSize: 10, fontWeight: isCityConflict ? 500 : 400, background: isCityConflict ? 'color-mix(in srgb, var(--red) 10%, transparent)' : 'transparent', borderRadius: isCityConflict ? 4 : 0 }}>
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
                              style={{ display: 'block', textAlign: 'center', padding: '6px 0', fontSize: 10, color: 'var(--accent2)', textDecoration: 'none', background: 'var(--bg3)' }}>
                              📍 Abrir en Google Maps ↗
                            </a>
                          </div>
                        )}
                        {validacion.sugerencias?.map((s, i) => {
                          const isHere = s.tipo === 'here_verified';
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 4, marginTop: 4, background: isHere ? 'color-mix(in srgb, var(--green) 8%, transparent)' : 'var(--bg3)', border: `1px solid ${isHere ? 'color-mix(in srgb, var(--green) 25%, transparent)' : 'var(--border)'}` }}>
                              <div>
                                <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{s.direccion}</div>
                                <div style={{ fontSize: 9, color: isHere ? 'var(--green)' : 'var(--text3)', fontWeight: isHere ? 600 : 400 }}>{isHere ? '✓ ' : ''}{s.label}</div>
                              </div>
                              <Button size="sm" onClick={() => handleAplicarDireccion(s.direccion)}>Aplicar</Button>
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
                      <div style={{ ...getOverlayPos(), zIndex: 1000, padding: 12, borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 11, boxShadow: '0 16px 30px rgba(0,0,0,0.35)', maxHeight: '55vh', overflowY: 'auto', maxWidth: 480 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>🏢 Inter Rapidismo</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Button size="sm" onClick={handleBuscarIR} disabled={!pedido?.Ciudad || buscandoIR}>{buscandoIR ? '...' : 'Buscar'}</Button>
                            <button onClick={() => { setShowIR(false); setOficinasIR([]); }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                          </div>
                        </div>
                        {!pedido?.Ciudad && <div style={{ color: 'var(--text3)', fontSize: 11 }}>Selecciona un departamento y ciudad</div>}
                        {errorIR && <div style={{ color: 'var(--red)', fontSize: 11 }}>{errorIR}</div>}
                        {oficinasIR.map((ofi, i) => (
                          <div key={ofi.IdCentroServicio || i} style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{ofi.Nombre || 'Oficina'}</div>
                              <div style={{ color: 'var(--text2)', fontSize: 10 }}>{ofi.Direccion}{ofi.Telefono1 && ` · ${ofi.Telefono1}`}</div>
                            </div>
                            <Button size="sm" onClick={() => handleSeleccionarOficinaIR(ofi)}>Usar</Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="lsd-grid-2" style={{ gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Departamento</label>
                    <Autocomplete
                      value={(() => { const d = deptos.find(d => String(d.id) === String(pedido.Departamento)); return d ? d.name : ''; })()}
                      onSelect={name => {
                        const d = deptos.find(d => d.name.toLowerCase() === String(name).toLowerCase());
                        if (d) handleDepartamentoChange(String(d.id));
                      }}
                      options={deptos}
                      placeholder="Buscar departamento..."
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={LBL}>Ciudad</label>
                    <Autocomplete
                      value={(() => { const c = ciudades.find(c => String(c.id) === String(pedido.Ciudad)); return c ? c.name : ''; })()}
                      onSelect={name => {
                        const c = ciudades.find(c => c.name.toLowerCase() === String(name).toLowerCase());
                        if (c) handleChange('Ciudad', Number(c.id));
                      }}
                      options={ciudades}
                      placeholder={!pedido.Departamento ? 'Elige departamento primero' : (loadingGeo ? 'Cargando...' : 'Buscar ciudad...')}
                      disabled={!pedido.Departamento}
                    />
                  </div>
                </div>

                <div>
                  <label style={LBL}>Notas</label>
                  <textarea value={pedido.notas || ''} onChange={e => handleChange('notas', e.target.value)} rows={2} style={{ ...fieldStyle('notas'), resize: 'vertical', minHeight: 80 }} />
                </div>
              </div>
            )}
          </div>

          {/* OBSERVACIONES */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader title="Observaciones" count={obs.length} open={openSections.observaciones} onToggle={() => toggleSection('observaciones')} />
            {openSections.observaciones && (
              <div style={{ padding: 14 }}>
                {obs.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>Sin observaciones</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {obs.map((o, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12, borderLeft: '3px solid var(--accent)', border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--text)' }}>{o.desc}</div>
                        <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2 }}>{o.update || ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ETIQUETAS */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader title="Etiquetas" count={etiquetas.length} open={openSections.etiquetas} onToggle={() => toggleSection('etiquetas')} />
            {openSections.etiquetas && (
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {etiquetas.length > 0 ? etiquetas.map(e => (
                    <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: e.color }}>
                      {e.nombre}
                      <button onClick={async () => {
                        try { await api.delete(`/api/lucidsales/vinculados/${currentId}/etiquetas/${e.id}`); const { data } = await api.get(`/api/lucidsales/vinculados/${currentId}/etiquetas`); setEtiquetas(Array.isArray(data) ? data : []); if (onUpdate) onUpdate(); } catch {}
                      }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                    </span>
                  )) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>Sin etiquetas</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={selectedEtiqueta} onChange={e => setSelectedEtiqueta(e.target.value)} style={{ ...fieldStyle('etiqueta'), flex: 1, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="">Agregar etiqueta...</option>
                    {todasEtiquetas.filter(e => !etiquetas.some(ne => ne.id === e.id)).map(e => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
                  </select>
                  <Button disabled={!selectedEtiqueta} onClick={async () => {
                    try { await api.post(`/api/lucidsales/vinculados/${currentId}/etiquetas`, { etiquetaId: selectedEtiqueta }); const { data } = await api.get(`/api/lucidsales/vinculados/${currentId}/etiquetas`); setEtiquetas(Array.isArray(data) ? data : []); setSelectedEtiqueta(''); if (onUpdate) onUpdate(); }
                    catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
                  }}>Agregar</Button>
                </div>
              </div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: 16 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 14, width: 'min(450px, 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 15 }}>Dividir pedido en ordenes separadas</div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                Este pedido tiene <strong>{productos.length} productos</strong>. Dropi no permite subir productos de diferentes proveedores en una sola orden.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {productos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg3)', borderRadius: 4, fontSize: 12 }}>
                    <span>{productosMap[String(p.product_id)]?.name || `#${p.product_id}`} x{p.quantity || 1}</span>
                    <span style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>{formatMoneyShort(p.price * (p.quantity || 1))}</span>
                  </div>
                ))}
              </div>
              {splitResults ? (
                <div style={{ marginBottom: 14 }}>
                  {splitResults.error && <ErrorCard mensaje={splitResults.error} detalle={splitResults.detalle} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {splitResults.items.map((p, i) => (
                      <div key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span>{p.status === 'ok' ? '✅' : p.status === 'error' ? '❌' : '⏳'}</span>
                        <span>{productosMap[String(p.product_id)]?.name || `#${p.product_id}`}</span>
                        {p.error && <span style={{ color: 'var(--red)', fontSize: 9 }}>{p.error}</span>}
                        {p.detalle && <div style={{ flexBasis: '100%' }}><DetalleTecnico detalle={p.detalle} /></div>}
                      </div>
                    ))}
                  </div>
                  {splitResults.fallos === 0 && splitResults.exitos > 0 && (
                    <div style={{ marginTop: 10, color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>¡{splitResults.exitos}/{splitResults.total} pedidos subidos!</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 14 }}>⚠ Se crearan {productos.length} pedidos y se subiran a Dropi automaticamente.</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {!splitResults && (
                  <>
                    <Button variant="ghost" onClick={() => setShowSplitModal(false)}>Cancelar</Button>
                    <Button onClick={handleSplitUpload}>Dividir y subir</Button>
                  </>
                )}
                {splitResults && <Button onClick={() => { setShowSplitModal(false); setSplitResults(null); }}>Cerrar</Button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {irConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={irConfirm.onCancel}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 32, maxWidth: 440, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center', fontFamily: '"Inter", sans-serif'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0b1c30', margin: '0 0 8px' }}>
              ¿Estás seguro?
            </h3>
            <p style={{ fontSize: 14, color: '#564334', lineHeight: 1.6, margin: '0 0 6px' }}>
              La dirección contiene <strong style={{ color: '#904d00' }}>Interrapidisimos</strong> pero estás por subir con
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#ba1a1a', margin: '0 0 20px', background: '#ffdad6', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
              {irConfirm.transportadora}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={irConfirm.onCancel} style={{
                padding: '12px 24px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff',
                color: '#564334', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif'
              }}>
                Cancelar
              </button>
              <button onClick={irConfirm.onProceed} style={{
                padding: '12px 24px', borderRadius: 10, border: 'none', background: '#ff8c00',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
                boxShadow: '0 4px 12px rgba(255,140,0,0.3)'
              }}>
                Subir de todos modos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
