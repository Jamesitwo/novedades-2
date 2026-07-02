'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';

const ESTADOS = [
  { value: 0, label: 'Por confirmar' },
  { value: 1, label: 'Cancelado' },
  { value: 2, label: 'Confirmado' },
  { value: 3, label: 'Modificado' }
];

const CSS_BADGE = {
  0: 'pendiente',
  1: 'red',
  2: 'entregado',
  3: 'purple'
};

const GEOFIX_BADGE = {
  exact: { label: 'Dirección exacta', bg: 'rgba(34,200,122,0.12)', color: '#22c87a', border: 'rgba(34,200,122,0.3)' },
  houseNumber: { label: 'Número encontrado', bg: 'rgba(34,200,122,0.08)', color: '#22c87a', border: 'rgba(34,200,122,0.2)' },
  street: { label: 'Calle encontrada', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  intersection: { label: 'Intersección', bg: 'rgba(245,158,11,0.07)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
  locality: { label: 'Ciudad/Barrio', bg: 'rgba(139,139,155,0.1)', color: '#8b8b9b', border: 'rgba(139,139,155,0.2)' },
  area: { label: 'Zona aproximada', bg: 'rgba(139,139,155,0.07)', color: '#8b8b9b', border: 'rgba(139,139,155,0.12)' }
};

export default function LucidSalesEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deptos, setDeptos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [productosMap, setProductosMap] = useState({});
  const [quotes, setQuotes] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState(null);
  const [editProdPrice, setEditProdPrice] = useState(null);
  const [editProdMode, setEditProdMode] = useState(null);
  const [etiquetas, setEtiquetas] = useState([]);
  const [todasEtiquetas, setTodasEtiquetas] = useState([]);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState('');
  const [oficinasIR, setOficinasIR] = useState([]);
  const [buscandoIR, setBuscandoIR] = useState(false);
  const [errorIR, setErrorIR] = useState('');

  const [validando, setValidando] = useState(false);
  const [validacion, setValidacion] = useState(null);
  const [showValidacion, setShowValidacion] = useState(false);

  const [showCotizador, setShowCotizador] = useState(false);
  const [showIR, setShowIR] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [camposModificados, setCamposModificados] = useState(new Set());
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitResults, setSplitResults] = useState(null);

  const direccionRef = useRef(null);

  const getOverlayPos = () => {
    const rect = direccionRef.current?.getBoundingClientRect();
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    return { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, transform: 'none' };
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const recalcTotalsFromProducts = (jsonStr) => {
    const items = parseJson(jsonStr);
    const subTotal = items.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);
    const costoEnvio = Number(pedido?.CostoEnvio || 0);
    return {
      SubTotal: String(subTotal),
      CostoEnvio: String(costoEnvio),
      Total: String(subTotal + costoEnvio)
    };
  };

  const handleProductPriceChange = (index, newPrice) => {
    const items = parseJson(pedido.Json);
    items[index] = { ...items[index], price: Number(newPrice) };
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
  };

  const handleProductChange = (index, newProductId) => {
    const items = parseJson(pedido.Json);
    items[index] = { ...items[index], product_id: newProductId };
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
  };

  const handleQuantityChange = (index, newQty) => {
    const items = parseJson(pedido.Json);
    items[index] = { ...items[index], quantity: Number(newQty) || 1 };
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
  };

  const handleRemoveProduct = (index) => {
    let items = parseJson(pedido.Json);
    items = items.filter((_, i) => i !== index);
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    setEditProdMode(null);
  };

  const handleAddProduct = () => {
    const items = parseJson(pedido.Json);
    const firstEntry = Object.keys(productosMap)[0];
    items.push({ product_id: firstEntry || '0', price: 0, quantity: 1, variations: [] });
    const newJson = JSON.stringify(items);
    const totals = recalcTotalsFromProducts(newJson);
    setPedido(prev => ({ ...prev, Json: newJson, ...totals }));
    setEditProdMode(items.length - 1);
  };

  const loadCiudades = async (deptoId) => {
    setLoadingGeo(true);
    try {
      const { data } = await api.get(`/api/lucidsales/ciudades-locales?deptoId=${deptoId}`);
      setCiudades(data || []);
    } catch (err) {
      console.error('[LucidSales] Error loading cities:', err);
      setCiudades([]);
    } finally {
      setLoadingGeo(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [pedidoRes, deptosRes, prodRes, etiquetasRes] = await Promise.all([
          api.get(`/api/lucidsales/pedidos/${id}`),
          api.get('/api/lucidsales/departamentos-locales'),
          api.post('/api/lucidsales/productos').catch(() => ({ data: [] })),
          api.get(`/api/lucidsales/vinculados/${id}/etiquetas`).catch(() => ({ data: [] }))
        ]);

        const pedidoData = pedidoRes.data;

          if (pedidoData && pedidoData.id) {
          setPedido(pedidoData);
          const yaSubido = pedidoData.idPedidoDropi && String(pedidoData.idPedidoDropi) !== '0' && pedidoData.idPedidoDropi !== 0;
          if (yaSubido) setUploaded(true);
          setEtiquetas(Array.isArray(etiquetasRes.data) ? etiquetasRes.data : []);
          if (Array.isArray(deptosRes.data)) {
            setDeptos(deptosRes.data.sort((a, b) => a.id - b.id));
          }
          if (pedidoData.Departamento != null && pedidoData.Departamento !== 0) {
            await loadCiudades(Number(pedidoData.Departamento));
          }

          try {
            const localRes = await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(id), pedido: pedidoData });
            if (localRes.data?.pedido?.conversacionLink) {
              setPedido(prev => ({ ...prev, conversacionLink: localRes.data.pedido.conversacionLink }));
            }
          } catch {}

          const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.productos || prodRes.data?.data || [];
          if (prodList.length > 0) {
            const map = {};
            prodList.forEach(p => {
              const key = p.id ?? p.Id;
              const name = p.nombre || p.name || p.Nombre || p.nombreProducto || '';
              if (key != null) map[String(key)] = name;
            });
            setProductosMap(map);
          }
        } else if (pedidoData && pedidoData.error) {
          setError(pedidoData.error);
        } else {
          setError('Pedido no encontrado');
        }
      } catch (err) {
        console.error('[LucidSales] Error:', err);
        setError(err.response?.data?.error || err.message || 'Error al cargar el pedido');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    api.get('/api/etiquetas').then(({ data }) => {
      if (Array.isArray(data)) setTodasEtiquetas(data);
    }).catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    if (field === 'SubTotal' || field === 'Total' || field === 'CostoEnvio') {
      handleMoneyChange(field, value);
    } else {
      setPedido(prev => ({ ...prev, [field]: value }));
    }
    setCamposModificados(prev => { const next = new Set(prev); next.add(field); return next; });
  };
  
  const handleMoneyChange = (field, value) => {
    const numVal = Number(value);
    if (isNaN(numVal)) return;
    const items = parseJson(pedido.Json);
    const currentSubTotal = items.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);
    const currentCostoEnvio = Number(pedido.CostoEnvio || 0);

    let newSubTotal, newCostoEnvio;

    if (field === 'Total') {
      newSubTotal = Math.max(0, numVal - currentCostoEnvio);
      newCostoEnvio = currentCostoEnvio;
    } else if (field === 'CostoEnvio') {
      newSubTotal = currentSubTotal;
      newCostoEnvio = numVal;
    } else {
      newSubTotal = numVal;
      newCostoEnvio = currentCostoEnvio;
    }

    const update = {
      SubTotal: String(newSubTotal),
      CostoEnvio: String(newCostoEnvio),
      Total: String(newSubTotal + newCostoEnvio)
    };

    if (currentSubTotal > 0 && newSubTotal !== currentSubTotal && items.length > 0) {
      const ratio = newSubTotal / currentSubTotal;
      items.forEach(p => {
        p.price = Math.round(p.price * ratio);
      });
      update.Json = JSON.stringify(items);
    }

    setPedido(prev => ({ ...prev, ...update }));
  };

  const handleDepartamentoChange = (deptoId) => {
    handleChange('Departamento', Number(deptoId));
    handleChange('Ciudad', 0);
    setCiudades([]);
    setOficinasIR([]);
    setErrorIR('');
    if (deptoId) loadCiudades(Number(deptoId));
  };

  const handleBuscarIR = async () => {
    if (!pedido?.Ciudad) return;
    setBuscandoIR(true);
    setErrorIR('');
    setOficinasIR([]);
    try {
      const { data } = await api.post('/api/lucidsales/interrapidisimo/oficinas', { ciudadId: pedido.Ciudad });
      if (data.ok) {
        setOficinasIR(data.oficinas || []);
      } else {
        setErrorIR(data.error || 'Error al buscar oficinas');
      }
    } catch (err) {
      setErrorIR(err.response?.data?.error || err.message || 'Error de conexión');
    } finally {
      setBuscandoIR(false);
    }
  };

  const handleValidarDireccion = async () => {
    setValidando(true);
    setValidacion(null);
    setShowValidacion(true);
    try {
      const ciudadNombre = ciudades.find(c => c.id === Number(pedido.Ciudad))?.name || '';
      const deptoNombre = deptos.find(d => d.id === Number(pedido.Departamento))?.name || '';

      const { data } = await api.post('/api/lucidsales/pedidos/validar-direccion', {
        direccion: pedido.Direccion || '',
        ciudad: ciudadNombre,
        departamento: deptoNombre
      });
      setValidacion(data);
    } catch (err) {
      setValidacion({ valida: false, errores: [{ codigo: 'ERROR', mensaje: err.response?.data?.error || err.message }], advertencias: [], sugerencias: [], puntuacion: 0 });
    } finally {
      setValidando(false);
    }
  };

  const handleAplicarDireccion = (nuevaDireccion) => {
    if (!nuevaDireccion) return;
    setPedido(prev => ({ ...prev, Direccion: nuevaDireccion }));
    setShowValidacion(false);
    setValidacion(null);
  };

  const handleSeleccionarOficinaIR = (ofi) => {
    handleChange('Direccion', `Reclamar Oficina Interrapidisimos ${ofi.Direccion || ''}`);
    setShowIR(false);
    setOficinasIR([]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: updateResult } = await api.post(`/api/lucidsales/pedidos/${id}`, pedido);
      if (updateResult && updateResult.ok === false) {
        return showToast(updateResult.msg || updateResult.error || 'Error al actualizar en LucidSales', 'error');
      }
      await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(id), pedido });
      setCamposModificados(new Set());
      showToast('Pedido actualizado correctamente');
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuote = async () => {
    setQuoting(true);
    setQuotes(null);
    setSelectedQuoteIdx(null);
    setShowCotizador(true);
    try {
      const { data } = await api.post('/api/lucidsales/pedidos/cotizar', { pedidoId: Number(id), carrier: 'dropi' });
      setQuotes(data);
    } catch (err) {
      setQuotes({ error: err.response?.data?.error || err.message });
    } finally {
      setQuoting(false);
    }
  };

  const handleUpload = async () => {
    if (selectedQuoteIdx == null) return;

    const productos = parseJson(pedido.Json);
    if (productos.length >= 2) {
      setShowSplitModal(true);
      return;
    }

    if (pedido.TipoPago === 2) {
      const confirmado = window.confirm(
        '⚠ Este pedido es por TRANSFERENCIA.\n\n' +
        '¿Ya verificaste que el cliente realizó la transferencia?\n\n' +
        'Presiona Aceptar solo si el pago ya fue recibido.'
      );
      if (!confirmado) return;
    }

    setUploading(true);
    try {
      const selectedQuote = quotes.quotes[selectedQuoteIdx];

      await api.post(`/api/lucidsales/pedidos/${id}`, pedido);
      await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(id), pedido });
      setCamposModificados(new Set());

      const { data } = await api.post('/api/lucidsales/pedidos/confirmar-envio', {
        pedidoId: Number(id),
        transportadora_id: selectedQuote.transportadora_id
      });
      if (data.ok) {
        setUploaded(true);
        showToast(`Pedido subido a ${selectedQuote.transportadora} correctamente`);
      } else {
        showToast(data.msg || data.error || 'Error al subir', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Error al subir', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!window.confirm('¿Crear una copia de este pedido para volver a subirlo?')) return;
    setUploading(true);
    try {
      const { data } = await api.post(`/api/lucidsales/pedidos/${id}/duplicar`);
      if (data.ok && data.nuevoId) {
        showToast(`Pedido duplicado como #${data.nuevoId}`);
        router.push(`/lucidsales/${data.nuevoId}`);
      } else {
        showToast(data.error || 'Error al duplicar', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al duplicar', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSplitUpload = async () => {
    setShowSplitModal(false);
    setUploading(true);
    const productos = parseJson(pedido.Json);

    setSplitResults({ total: productos.length, exitos: 0, fallos: 0, items: productos.map(p => ({ ...p, status: 'subiendo' })) });

    try {
      await api.post(`/api/lucidsales/pedidos/${id}`, pedido);
      await api.post('/api/lucidsales/guardar-local', { lucidsalesPedidoId: Number(id), pedido });
      setCamposModificados(new Set());

      const selectedQuote = quotes.quotes[selectedQuoteIdx];
      const { data } = await api.post(`/api/lucidsales/pedidos/${id}/subir-dividido`, {
        transportadora_id: selectedQuote.transportadora_id
      });

      const updated = productos.map((p, i) => {
        const res = data.resultados?.find(r => String(r.producto) === String(p.product_id));
        return { ...p, status: res?.exito ? 'ok' : res?.error ? 'error' : 'error', error: res?.error };
      });

      setSplitResults({ total: data.total, exitos: data.exitos, fallos: data.fallos, items: updated });
      if (data.fallos === 0) setUploaded(true);
    } catch (err) {
      setSplitResults(prev => ({
        ...prev, error: err.response?.data?.error || err.message,
        items: prev.items.map(p => ({ ...p, status: 'error' }))
      }));
    } finally {
      setUploading(false);
    }
  };

  const parseObservaciones = (obs) => {
    try { return typeof obs === 'string' ? JSON.parse(obs) : obs || []; }
    catch { return []; }
  };

  const parseJson = (json) => {
    try { return typeof json === 'string' ? JSON.parse(json) : json || []; }
    catch { return []; }
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

  if (loading) return <div className="content"><TableSkeleton /></div>;

  if (error && !pedido) {
    return (
      <div className="content">
        <div className="table-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--red)', marginBottom: 12, fontSize: 16 }}>{error}</div>
          <Link href="/lucidsales" className="btn btn-primary">Volver a pedidos</Link>
        </div>
      </div>
    );
  }

  if (!pedido) return null;

  const estadoActual = ESTADOS.find(e => e.value === pedido.EstadoPedido) || ESTADOS[0];
  const obs = parseObservaciones(pedido.Observaciones);
  const productos = parseJson(pedido.Json);

  return (
    <div className="content">
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)', paddingBottom: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/lucidsales" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none' }}>
            ‹ Volver a pedidos
          </Link>
          <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700 }}>
            Pedido #{pedido.idPedido}
            <span className={`badge ${CSS_BADGE[estadoActual.value] || 'pendiente'}`} style={{ marginLeft: 10, verticalAlign: 'middle' }}>
              {estadoActual.label}
            </span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {uploaded && (
            <button onClick={handleDuplicate} className="btn btn-ghost" style={{ fontSize: 12 }}>
              🔄 Duplicar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: 12 }}
          >
            {saving ? 'Guardando...' : `Guardar cambios${camposModificados.size > 0 ? ` (${camposModificados.size})` : ''}`}
          </button>
        </div>
      </div>

      <div className="table-card" style={{ padding: '8px 14px', marginBottom: 20, cursor: uploaded ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: uploaded ? 0.7 : 1 }} onClick={() => { if (uploaded) return; if (!quotes) { handleQuote(); } else { setShowCotizador(!showCotizador); } }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
          {uploaded ? '✓ Pedido subido' : `Cotizar envío con Dropi ${showCotizador ? '▲' : '▼'}`}
          {!uploaded && !showCotizador && quotes?.quotes?.length > 0 && (
            <span style={{ fontWeight: 400, color: 'var(--text2)', fontSize: 11, marginLeft: 8 }}>
              · {quotes.quotes.length} cotización{quotes.quotes.length > 1 ? 'es' : ''}
            </span>
          )}
        </span>
        {!uploaded && (
          <button onClick={e => { e.stopPropagation(); handleQuote(); }} disabled={quoting} className="btn btn-primary" style={{ fontSize: 11 }}>
            {quoting ? 'Cotizando...' : quotes?.quotes ? '⟳ Re-cotizar' : 'Cotizar'}
          </button>
        )}
      </div>

      {!uploaded && showCotizador && quotes && (
        <div className="table-card" style={{ padding: 14, marginBottom: 20, borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>

          {quotes?.error && (
            <div style={{ color: 'var(--red)', fontSize: 13, padding: 12, background: 'var(--bg3)', borderRadius: 8 }}>
              {quotes.error}
            </div>
          )}

          {quotes?.quotes && quotes.quotes.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {quotes.quotes.map((q, i) => {
                  const hasError = !!q.error;
                  const selected = selectedQuoteIdx === i;
                  return (
                    <div key={i} onClick={() => !hasError && setSelectedQuoteIdx(i)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, cursor: hasError ? 'default' : 'pointer',
                      border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: selected ? 'var(--accent-bg)' : 'var(--bg3)',
                      opacity: hasError ? 0.5 : 1
                    }}>
                      <div style={{ width: 20 }}>
                        {selected && <span style={{ color: 'var(--accent)' }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{q.transportadora}</div>
                        {q.objects && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                            {q.objects.precioEnvio != null && (
                              <span style={{ fontWeight: 500, color: 'var(--accent2)', marginRight: 12 }}>
                                {formatMoney(q.objects.precioEnvio)}
                              </span>
                            )}
                            {q.objects.trayecto && <span style={{ marginRight: 8 }}>{q.objects.trayecto}</span>}
                            {q.objects.seguroEnvio != null && (
                              <span>Seguro: {formatMoney(q.objects.seguroEnvio)}</span>
                            )}
                          </div>
                        )}
                        {hasError && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{q.error}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedQuoteIdx != null && (
                <button onClick={handleUpload} disabled={uploading} className="btn btn-success" style={{ fontSize: 12 }}>
                  {uploading ? 'Subiendo...' : `↑ Subir pedido con ${quotes.quotes[selectedQuoteIdx].transportadora}`}
                </button>
              )}
            </>
          )}

          {quotes && !quotes.error && (!quotes.quotes || quotes.quotes.length === 0) && (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>No hay cotizaciones disponibles</div>
          )}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text)' }}>
            Datos del cliente
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-field-label">Nombre</label>
              <input type="text" value={pedido.Nombre || ''} onChange={e => handleChange('Nombre', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group">
              <label className="form-field-label">Apellido</label>
              <input type="text" value={pedido.Apellido || ''} onChange={e => handleChange('Apellido', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group">
              <label className="form-field-label">Teléfono</label>
              <input type="text" value={pedido.Movil || ''} onChange={e => handleChange('Movil', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group">
              <label className="form-field-label">Link conversación</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" value={pedido.conversacionLink || ''} onChange={e => handleChange('conversacionLink', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="https://wa.me/..." />
                {pedido.conversacionLink && (
                  <a href={pedido.conversacionLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none' }}>
                    💬 Abrir
                  </a>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-field-label">Correo</label>
              <input type="text" value={pedido.Correo || ''} onChange={e => handleChange('Correo', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group">
              <label className="form-field-label">NIT / Documento</label>
              <input type="text" value={pedido.NIT || ''} onChange={e => handleChange('NIT', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group">
              <label className="form-field-label">Referencias</label>
              <input type="text" value={pedido.Referencias || ''} onChange={e => handleChange('Referencias', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group span2" ref={direccionRef}>
              <label className="form-field-label">Dirección</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={pedido.Direccion || ''}
                  onChange={e => {
                    handleChange('Direccion', e.target.value);
                    if (validacion) setValidacion(null);
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Cra 12 # 45-67, Barrio..."
                />
                <button
                  onClick={handleValidarDireccion}
                  disabled={validando || !pedido.Direccion}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, whiteSpace: 'nowrap', padding: '0 12px' }}
                  title="Validar dirección"
                >
                  {validando ? '✓✓' : '✓ Validar'}
                </button>
                <button
                  onClick={() => { setShowIR(!showIR); if (!showIR && !oficinasIR.length && pedido?.Ciudad) handleBuscarIR(); }}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, whiteSpace: 'nowrap', padding: '0 12px' }}
                  title="Buscar oficina Inter Rapidísimo"
                >
                  🏢 IR
                </button>
              </div>
              {showValidacion && validacion && (
                <>
                  <div onClick={() => setShowValidacion(false)} style={{
                    position: 'fixed', inset: 0, zIndex: 99
                  }} />
                  <div style={{
                    ...getOverlayPos(), zIndex: 100,
                    marginTop: 0, padding: 12, borderRadius: 8,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    fontSize: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    maxHeight: '65vh', overflowY: 'auto'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>Resultado</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontWeight: 600,
                        color: validacion.puntuacion >= 80 ? 'var(--green)' :
                               validacion.puntuacion >= 50 ? 'var(--yellow, #f59e0b)' : 'var(--red)'
                      }}>
                        {validacion.puntuacion != null ? `${validacion.puntuacion}/100` : '-'}
                      </span>
                      {validacion.here && validacion.here.exito && validacion.here.geoLevel && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: GEOFIX_BADGE[validacion.here.geoLevel]?.bg || 'var(--bg2)',
                          color: GEOFIX_BADGE[validacion.here.geoLevel]?.color || 'var(--text3)',
                          border: `1px solid ${GEOFIX_BADGE[validacion.here.geoLevel]?.border || 'var(--border)'}`
                        }}>
                          {validacion.here.houseNumberType === 'PA' ? '📍' : ''}
                          {GEOFIX_BADGE[validacion.here.geoLevel]?.label || validacion.here.geoLevel}
                        </span>
                      )}
                      {validacion.provider && validacion.provider !== 'none' && (
                        <span style={{
                          fontSize: 9, color: 'var(--text3)', background: 'var(--bg2)',
                          padding: '1px 5px', borderRadius: 4, fontWeight: 500
                        }}>
                          {validacion.provider === 'google' ? '🌍 Google' : '🗺️ HERE'}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setShowValidacion(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>
                      ✕
                    </button>
                  </div>

                  {validacion.here && validacion.here.exito && validacion.here.ciudad && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 11, color: 'var(--text2)', flexWrap: 'wrap' }}>
                      <span>
                        📍 {[validacion.here.ciudad, validacion.here.departamento].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {validacion.viaDetectada && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8, color: 'var(--text2)' }}>
                      <span>Vía: <strong style={{ color: 'var(--text)' }}>{validacion.viaDetectada.nombre}</strong> ({validacion.viaDetectada.abreviacion})</span>
                    </div>
                  )}

                  {validacion.errores && validacion.errores.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {validacion.errores.map((e, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 6,
                          padding: '4px 0', color: 'var(--red)', fontSize: 11, lineHeight: 1.5
                        }}>
                          <span style={{ flexShrink: 0, marginTop: 1 }}>✕</span>
                          <div>
                            <div>{e.mensaje}</div>
                            {e.sugerencia && (
                              <div style={{ color: 'var(--text3)', marginTop: 1 }}>
                                {e.sugerencia}
                                <button
                                  onClick={() => handleAplicarDireccion(e.sugerencia)}
                                  className="btn btn-ghost"
                                  style={{ fontSize: 10, marginLeft: 6, padding: '1px 8px' }}
                                >
                                  Usar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {validacion.advertencias && validacion.advertencias.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {validacion.advertencias.map((a, i) => {
                        const isCityConflict = a.codigo === 'CIUDAD_NO_COINCIDE';
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 6,
                            padding: isCityConflict ? '6px 10px' : '3px 0',
                            color: isCityConflict ? '#e53e3e' : '#f59e0b',
                            fontSize: isCityConflict ? 12 : 11,
                            fontWeight: isCityConflict ? 500 : 400,
                            lineHeight: 1.5,
                            background: isCityConflict ? 'rgba(229,62,62,0.08)' : 'transparent',
                            borderRadius: isCityConflict ? 6 : 0,
                            border: isCityConflict ? '1px solid rgba(229,62,62,0.2)' : 'none',
                          }}>
                            <span style={{ flexShrink: 0, marginTop: 1 }}>
                              {isCityConflict ? '🔴' : '⚠'}
                            </span>
                            <div>
                              <div>{a.mensaje}</div>
                              {a.sugerencia && (
                                <div style={{ color: 'var(--text3)', marginTop: 1 }}>
                                  {a.sugerencia}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {validacion.sugerencias && validacion.sugerencias.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600 }}>
                        Sugerencias:
                      </div>
                      {validacion.sugerencias.map((s, i) => {
                        const isHere = s.tipo === 'here_verified';
                        return (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 10px', borderRadius: 6, marginBottom: 4,
                            background: isHere ? 'rgba(34,200,122,0.06)' : 'var(--bg2, rgba(255,255,255,0.03))',
                            border: isHere ? '1px solid rgba(34,200,122,0.25)' : '1px solid var(--border)'
                          }}>
                            <div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
                                {s.direccion}
                              </div>
                              {isHere && validacion.here?.ciudad && (
                                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                                  {[validacion.here.ciudad, validacion.here.departamento].filter(Boolean).join(', ')}
                                </div>
                              )}
                              <div style={{
                                fontSize: 10, marginTop: isHere ? 3 : 1,
                                color: isHere ? 'var(--green)' : 'var(--text3)',
                                fontWeight: isHere ? 600 : 400
                              }}>
                                {isHere ? '✓ ' : ''}{s.label}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAplicarDireccion(s.direccion)}
                              className={isHere ? 'btn btn-success' : 'btn btn-primary'}
                              style={{ fontSize: 10, padding: '3px 10px', flexShrink: 0 }}
                            >
                              Aplicar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {validacion.valida && validacion.puntuacion >= 90 && (
                    <div style={{ color: 'var(--green)', fontSize: 12, fontWeight: 500, marginTop: 4 }}>
                      ✓ La dirección tiene un formato correcto
                    </div>
                  )}
                  </div>
                </>
              )}

              {showIR && (
                <>
                  <div onClick={() => { setShowIR(false); setOficinasIR([]); }} style={{
                    position: 'fixed', inset: 0, zIndex: 99
                  }} />
                  <div style={{
                    ...getOverlayPos(), zIndex: 100,
                    marginTop: 0, padding: 12, borderRadius: 8,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    fontSize: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    maxHeight: '65vh', overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>🏢 Inter Rapidísimo</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={handleBuscarIR} disabled={!pedido?.Ciudad || buscandoIR} className="btn btn-primary" style={{ fontSize: 11 }}>
                          {buscandoIR ? 'Buscando...' : 'Buscar oficina'}
                        </button>
                        <button onClick={() => { setShowIR(false); setOficinasIR([]); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>
                          ✕
                        </button>
                      </div>
                    </div>
                    {!pedido?.Ciudad && !buscandoIR && (
                      <div style={{ color: 'var(--text3)', fontSize: 12 }}>Selecciona un departamento y ciudad en el formulario</div>
                    )}
                    {buscandoIR && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Buscando oficinas...</div>}
                    {errorIR && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errorIR}</div>}
                    {oficinasIR.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {oficinasIR.map((ofi, i) => (
                          <div key={ofi.IdCentroServicio || i} style={{
                            padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6,
                            border: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 2 }}>{ofi.Nombre || 'Oficina'}</div>
                              <div style={{ color: 'var(--text2)', fontSize: 11, lineHeight: 1.4 }}>
                                {ofi.Direccion && <div>{ofi.Direccion}</div>}
                                {ofi.Telefono1 && <div>{ofi.Telefono1}</div>}
                                {ofi.Barrio && <div>{ofi.Barrio}</div>}
                              </div>
                            </div>
                            <button onClick={() => handleSeleccionarOficinaIR(ofi)} className="btn btn-primary" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                              Usar oficina
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="form-group">
              <label className="form-field-label">Departamento</label>
              <select value={pedido.Departamento ?? ''} onChange={e => handleDepartamentoChange(e.target.value)} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }}>
                <option value="">Seleccionar...</option>
                {deptos.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-field-label">Ciudad</label>
              <select value={pedido.Ciudad ?? ''} onChange={e => handleChange('Ciudad', Number(e.target.value))} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }} disabled={!pedido.Departamento}>
                <option value="">Seleccionar...</option>
                {ciudades.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group span2">
              <label className="form-field-label">Notas</label>
              <textarea value={pedido.notas || ''} onChange={e => handleChange('notas', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
              Datos del pedido
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-field-label">Estado</label>
                <select value={pedido.EstadoPedido ?? 0} onChange={e => handleChange('EstadoPedido', Number(e.target.value))} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }}>
                  {ESTADOS.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={pedido.TipoPago === 2 ? {
                padding: 8, borderRadius: 6,
                background: 'rgba(229,62,62,0.08)',
                border: '1px solid rgba(229,62,62,0.35)'
              } : {}}>
                <label className="form-field-label" style={pedido.TipoPago === 2 ? { color: '#e53e3e', fontWeight: 600 } : {}}>
                  ⚠ Tipo de pago
                </label>
                <select value={pedido.TipoPago ?? 1} onChange={e => handleChange('TipoPago', Number(e.target.value))} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer', borderColor: pedido.TipoPago === 2 ? 'rgba(229,62,62,0.5)' : undefined }}>
                  <option value={1}>Contra entrega</option>
                  <option value={2}>Transferencia</option>
                </select>
              </div>
              <div className="form-group" style={pedido.TipoPago === 2 ? {
                padding: 8, borderRadius: 6,
                background: 'rgba(229,62,62,0.08)',
                border: '1px solid rgba(229,62,62,0.35)'
              } : {}}>
                <label className="form-field-label" style={pedido.TipoPago === 2 ? { color: '#e53e3e', fontWeight: 600 } : {}}>
                  {pedido.EstadoPago === 0 ? '⚠ Validar pago' : '✓ Estado pago'}
                </label>
                <select value={pedido.EstadoPago ?? 0} onChange={e => handleChange('EstadoPago', Number(e.target.value))} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer', borderColor: pedido.TipoPago === 2 ? 'rgba(229,62,62,0.5)' : undefined }}>
                  <option value={0}>Pendiente</option>
                  <option value={1}>Pagado</option>
                </select>
              </div>
              {pedido.TipoPago === 2 && pedido.EstadoPago === 0 && (
                <div className="form-group span2" style={{ gridColumn: '1 / -1' }}>
                  <div style={{
                    padding: '8px 12px', borderRadius: 6, fontSize: 12,
                    background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.3)',
                    color: '#e53e3e', fontWeight: 500
                  }}>
                    ⚠ Este pedido es por transferencia y el pago está pendiente. Verifica que el cliente haya transferido antes de subir el envío.
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-field-label">Logística</label>
                <input type="text" value={pedido.logistic || ''} onChange={e => handleChange('logistic', e.target.value)} style={inputStyle} />
              </div>
              <div className="form-group">
                <label className="form-field-label">Subtotal</label>
                <input type="text" value={pedido.SubTotal || '0.00'} onChange={e => handleChange('SubTotal', e.target.value)} style={inputStyle} />
              </div>
              <div className="form-group">
                <label className="form-field-label">Costo envío</label>
                <input type="text" value={pedido.CostoEnvio || '0.00'} onChange={e => handleChange('CostoEnvio', e.target.value)} style={inputStyle} />
              </div>
              <div className="form-group span2">
                <label className="form-field-label">Total</label>
                <input type="text" value={pedido.Total || '0.00'} onChange={e => handleChange('Total', e.target.value)} style={{ ...inputStyle, fontWeight: 600, color: 'var(--accent2)', fontSize: 18 }} />
              </div>
            </div>
          </div>

          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
              Productos ({productos.length})
            </div>
            {productos.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin productos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {productos.map((prod, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6, fontSize: 13, gap: 8
                  }}>
                    {editProdMode === i ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <select
                            value={prod.product_id || ''}
                            onChange={e => handleProductChange(i, e.target.value)}
                            style={{ ...inputStyle, flex: 1, fontSize: 12, appearance: 'auto', cursor: 'pointer' }}
                          >
                            <option value="">Seleccionar producto</option>
                            {Object.entries(productosMap).map(([id, name]) => (
                              <option key={id} value={id}>{name || `#${id}`}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Cant:</span>
                          <input
                            type="number"
                            min="1"
                            value={prod.quantity || 1}
                            onChange={e => handleQuantityChange(i, e.target.value)}
                            style={{ width: 60, ...inputStyle, fontSize: 12, textAlign: 'center' }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Precio:</span>
                          <input
                            type="number"
                            value={prod.price}
                            onChange={e => handleProductPriceChange(i, e.target.value)}
                            style={{ width: 100, ...inputStyle, fontSize: 12, textAlign: 'right', fontFamily: 'var(--mono)' }}
                          />
                          <button
                            onClick={() => setEditProdMode(null)}
                            className="btn btn-primary"
                            style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                          >
                            ✓ Listo
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(i)}
                            className="btn btn-ghost"
                            style={{ fontSize: 10, padding: '3px 6px', color: 'var(--red)', flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setEditProdMode(i)}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            {productosMap[String(prod.product_id)] || `Producto #${prod.product_id}`}
                          </span>
                          <span style={{ color: 'var(--text)', marginLeft: 12 }}>
                            x{prod.quantity || 1}
                          </span>
                          {prod.variations && prod.variations.length > 0 && (
                            <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 8 }}>
                              ({prod.variations.join(', ')})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {editProdPrice === i ? (
                            <input
                              type="number"
                              autoFocus
                              value={prod.price}
                              onChange={e => handleProductPriceChange(i, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onBlur={() => setEditProdPrice(null)}
                              onKeyDown={e => e.key === 'Enter' && setEditProdPrice(null)}
                              style={{ width: 110, ...inputStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}
                            />
                          ) : (
                            <div
                              onClick={e => { e.stopPropagation(); setEditProdPrice(i); }}
                              style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)', fontWeight: 500, padding: '2px 6px', borderRadius: 4, border: '1px solid transparent' }}
                              title="Click para editar precio"
                            >
                              {formatMoneyShort(prod.price)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleAddProduct} className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, width: '100%', justifyContent: 'center' }}>
              + Agregar producto
            </button>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ padding: 20, marginTop: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
          Observaciones ({obs.length})
        </div>
        {obs.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin observaciones</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {obs.map((o, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6,
                fontSize: 13, borderLeft: '3px solid var(--accent)'
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text)' }}>{o.desc}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>{o.update || ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="table-card" style={{ padding: 20, marginTop: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
          Etiquetas
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {etiquetas.length > 0 ? etiquetas.map(e => (
            <span key={e.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              color: '#fff', background: e.color
            }}>
              {e.nombre}
              <button onClick={async () => {
                try {
                  await api.delete(`/api/lucidsales/vinculados/${id}/etiquetas/${e.id}`);
                  const { data } = await api.get(`/api/lucidsales/vinculados/${id}/etiquetas`);
                  setEtiquetas(Array.isArray(data) ? data : []);
                } catch {}
              }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          )) : (
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>Sin etiquetas</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={selectedEtiqueta} onChange={e => setSelectedEtiqueta(e.target.value)}
            style={{ ...inputStyle, flex: 1, appearance: 'auto', cursor: 'pointer' }}>
            <option value="">Agregar etiqueta...</option>
            {todasEtiquetas.filter(e => !etiquetas.some(ne => ne.id === e.id)).map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          <button disabled={!selectedEtiqueta} onClick={async () => {
            try {
              await api.post(`/api/lucidsales/vinculados/${id}/etiquetas`, { etiquetaId: selectedEtiqueta });
              const { data } = await api.get(`/api/lucidsales/vinculados/${id}/etiquetas`);
              setEtiquetas(Array.isArray(data) ? data : []);
              setSelectedEtiqueta('');
            } catch (err) {
              showToast(err.response?.data?.error || 'Error al asignar etiqueta', 'error');
            }
          }} className="btn btn-primary" style={{ fontSize: 12 }}>
            Agregar
          </button>
        </div>
      </div>
    </div>

    {showSplitModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
        <div style={{ background: 'var(--bg2)', borderRadius: 14, width: 'min(480px, 92vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16 }}>
            Dividir pedido en órdenes separadas
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              Este pedido tiene <strong>{productos.length} productos</strong>. Dropi no permite subir productos de diferentes proveedores en una sola orden.
              Se crearán órdenes independientes con los mismos datos del cliente.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {productos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text)' }}>{productosMap[String(p.product_id)] || `Producto #${p.product_id}`} ×{p.quantity || 1}</span>
                  <span style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>{formatMoneyShort(p.price * (p.quantity || 1))}</span>
                </div>
              ))}
            </div>
            {splitResults ? (
              <div style={{ marginBottom: 16 }}>
                {splitResults.error && (
                  <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{splitResults.error}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {splitResults.items.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{p.status === 'ok' ? '✅' : p.status === 'error' ? '❌' : '⏳'}</span>
                      <span style={{ color: 'var(--text)' }}>{productosMap[String(p.product_id)] || `Producto #${p.product_id}`}</span>
                      {p.error && <span style={{ color: 'var(--red)', fontSize: 10 }}>{p.error}</span>}
                    </div>
                  ))}
                </div>
                {splitResults.fallos === 0 && splitResults.exitos > 0 && (
                  <div style={{ marginTop: 12, color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>
                    ¡{splitResults.exitos}/{splitResults.total} pedidos subidos correctamente!
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--amber)', marginBottom: 16 }}>
                ⚠ Se crearán {productos.length} pedidos y se subirán a Dropi automáticamente.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {!splitResults && (
                <>
                  <button onClick={() => setShowSplitModal(false)} className="btn btn-ghost">Cancelar</button>
                  <button onClick={handleSplitUpload} className="btn btn-primary" style={{ fontSize: 12 }}>
                    Dividir y subir
                  </button>
                </>
              )}
              {splitResults && (
                <button onClick={() => { setShowSplitModal(false); setSplitResults(null); }} className="btn btn-primary">
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  );
}

const inputStyle = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  color: 'var(--text)',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit'
};
