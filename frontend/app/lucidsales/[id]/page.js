'use client';

import { useState, useEffect } from 'react';
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
        const [pedidoRes, deptosRes, prodRes] = await Promise.all([
          api.get(`/api/lucidsales/pedidos/${id}`),
          api.get('/api/lucidsales/departamentos-locales'),
          api.post('/api/lucidsales/productos').catch(() => ({ data: [] }))
        ]);

        const pedidoData = pedidoRes.data;

        if (pedidoData && pedidoData.id) {
          setPedido(pedidoData);
          if (Array.isArray(deptosRes.data)) {
            setDeptos(deptosRes.data.sort((a, b) => a.id - b.id));
          }
          if (pedidoData.Departamento != null && pedidoData.Departamento !== 0) {
            await loadCiudades(Number(pedidoData.Departamento));
          }

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

  const handleChange = (field, value) => {
    setPedido(prev => ({ ...prev, [field]: value }));
  };

  const handleDepartamentoChange = (deptoId) => {
    handleChange('Departamento', Number(deptoId));
    handleChange('Ciudad', 0);
    setCiudades([]);
    if (deptoId) loadCiudades(Number(deptoId));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/api/lucidsales/pedidos/${id}`, pedido);
      if (data.ok) {
        showToast('Pedido actualizado correctamente');
      } else {
        showToast(data.msg || data.error || 'Error al actualizar', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuote = async () => {
    setQuoting(true);
    setQuotes(null);
    setSelectedQuoteIdx(null);
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
    setUploading(true);
    try {
      const { data } = await api.post('/api/lucidsales/pedidos/confirmar-envio', { pedidoId: Number(id), carrier: 'dropi' });
      if (data.ok) {
        showToast('Pedido subido a Dropi correctamente');
      } else {
        showToast(data.msg || data.error || 'Error al subir', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al subir', 'error');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: 12 }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="table-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
            Cotizar envío con Dropi
          </div>
          <button onClick={handleQuote} disabled={quoting} className="btn btn-primary" style={{ fontSize: 12 }}>
            {quoting ? 'Cotizando...' : 'Cotizar'}
          </button>
        </div>

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
                    padding: '12px 16px', borderRadius: 8, cursor: hasError ? 'default' : 'pointer',
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
            <div className="form-group span2">
              <label className="form-field-label">Dirección</label>
              <input type="text" value={pedido.Direccion || ''} onChange={e => handleChange('Direccion', e.target.value)} style={inputStyle} />
            </div>
            <div className="form-group">
              <label className="form-field-label">País</label>
              <input type="number" value={pedido.Pais ?? 47} onChange={e => handleChange('Pais', Number(e.target.value))} style={inputStyle} />
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
            <div className="form-group">
              <label className="form-field-label">Código postal</label>
              <input type="text" value={pedido.codigoPostal || ''} onChange={e => handleChange('codigoPostal', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text)' }}>
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
              <div className="form-group">
                <label className="form-field-label">Tipo de pago</label>
                <select value={pedido.TipoPago ?? 1} onChange={e => handleChange('TipoPago', Number(e.target.value))} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }}>
                  <option value={1}>Contra entrega</option>
                  <option value={2}>Transferencia</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-field-label">Estado pago</label>
                <select value={pedido.EstadoPago ?? 0} onChange={e => handleChange('EstadoPago', Number(e.target.value))} style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }}>
                  <option value={0}>Pendiente</option>
                  <option value={1}>Pagado</option>
                </select>
              </div>
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
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6, fontSize: 13
                  }}>
                    <div>
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
                    <div style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)', fontWeight: 500 }}>
                      {formatMoneyShort(prod.price)}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </div>
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
