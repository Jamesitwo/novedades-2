'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCartStore } from '@/store/cartStore';

function AutocompleteInput({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filtered = options.filter(o => {
    const name = (o.name || o).toLowerCase();
    return name.includes(filter.toLowerCase()) && name !== value.toLowerCase();
  });

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input type="text" value={value} disabled={disabled}
        placeholder={placeholder}
        className="compra-input"
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150); }}
        style={{ background: disabled ? '#f3f4f6' : '#fff', color: disabled ? '#9ca3af' : '#111827' }} />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 180, overflow: 'auto'
        }}>
          {filtered.slice(0, 30).map((o, i) => (
            <div key={o.id || o.name || o || i} onClick={() => { onChange(o.name || o); setFilter(''); setOpen(false); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#111827',
                borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              {o.name || o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComprarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '', apellido: '', celular: '', direccion: '',
    departamento: '', ciudad: '',
    email: '', notas: '', cantidad: 1, metodoPago: 'contraentrega'
  });
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const { addItem, init, items: cartItems, removeItem } = useCartStore();
  const [bankConfig, setBankConfig] = useState({});

  useEffect(() => { init(); }, []);

  useEffect(() => {
    api.get('/api/configuracion/public').then(({ data }) => setBankConfig(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/tienda/${id}`)
      .then(({ data }) => setProducto(data))
      .catch(() => setError('Producto no encontrado'))
      .finally(() => setLoading(false));
    api.get('/api/tienda/departamentos')
      .then(({ data }) => setDepartamentos(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!form.departamento) { setCiudades([]); return; }
    const depto = departamentos.find(d => d.name === form.departamento);
    if (!depto) { setCiudades([]); return; }
    api.get(`/api/tienda/ciudades?deptoId=${depto.id}`)
      .then(({ data }) => setCiudades(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCiudades([]));
  }, [form.departamento, departamentos]);

  const handleChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.celular.trim() || !form.direccion.trim() || !form.departamento || !form.ciudad.trim()) {
      setError('Completa todos los campos requeridos');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true); setError('');
    try {
      const carritoFiltrado = cartItems.filter(i => i.id !== id);
      const cantidadEnCarrito = cartItems.find(i => i.id === id)?.cantidad || 0;
      await api.post('/api/tienda/comprar', {
        productoId: id, nombre: form.nombre.trim(), apellido: form.apellido.trim(),
        celular: form.celular.trim(), direccion: form.direccion.trim(),
        departamento: form.departamento, ciudad: form.ciudad.trim(),
        email: form.email.trim() || null, notas: form.notas.trim() || null, cantidad: form.cantidad || 1,
        metodoPago: form.metodoPago,
        envioTotal: envioPrincipal + envioCarrito,
        items: [
          { productoId: id, cantidad: (form.cantidad || 1) + cantidadEnCarrito },
          ...carritoFiltrado.map(i => ({ productoId: i.id, cantidad: i.cantidad }))
        ]
      });
      setEnviado(true);
      const colors = ['#ff8c00', '#feb700', '#fff', '#22c55e', '#ba1a1a'];
      setConfetti(Array.from({ length: 60 }, (_, i) => ({ id: i, left: Math.random() * 100 + '%', delay: Math.random() * 2 + 's', duration: (Math.random() * 2 + 2) + 's', color: colors[Math.floor(Math.random() * colors.length)], size: Math.floor(Math.random() * 10 + 6) + 'px' })));
    } catch (e) { setError(e.response?.data?.error || 'Error al enviar el pedido. Intenta de nuevo.'); }
    finally { setSaving(false); }
  };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto?.ofertaActiva && producto?.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const precioFinal = tieneOferta ? producto?.ofertaPrecio : producto?.precioVenta;
  const subtotalProducto = precioFinal * form.cantidad;
  const envioPrincipal = producto?.envioGratis ? 0 : (producto?.envioCosto || 0);
  const carritoFiltrado = cartItems.filter(i => i.id !== id);
  const cantidadEnCarrito = cartItems.find(i => i.id === id)?.cantidad || 0;
  const cantidadTotal = (form.cantidad || 1) + cantidadEnCarrito;
  const envioCarrito = carritoFiltrado.reduce((sum, item) => sum + (item.envioGratis ? 0 : (item.envioCosto || 0)), 0);
  const total = subtotalProducto + (cantidadEnCarrito * precioFinal) + carritoFiltrado.reduce((sum, item) => sum + item.precio * item.cantidad, 0) + envioPrincipal + envioCarrito;
  const envioTotalMostrar = envioPrincipal + envioCarrito;

  if (loading) return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: '#6b7280' }}>Cargando...</div>;
  if (error && !producto) return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: '#dc2626' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1f2937', fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        .compra-label { display: block; font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .compra-input { margin-top: 4px; width: 100%; padding: 10px 12px; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; color: #111827; outline: none; font-family: 'Inter', sans-serif; box-sizing: border-box; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: border-color 0.15s, box-shadow 0.15s; }
        .compra-input:focus { border-color: #ff8c00; box-shadow: 0 0 0 3px rgba(255,140,0,0.2); }
        .compra-input::placeholder { color: #9ca3af; }
        .compra-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .compra-form-row { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .compra-select-wrap { position: relative; }
        .compra-select-wrap .compra-input { appearance: none; padding-left: 44px; padding-right: 36px; }
        .compra-select-ico { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 18px; pointer-events: none; }
        .compra-select-arrow { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; font-size: 12px; }
        @media (min-width: 640px) {
          .compra-form-row { grid-template-columns: 1fr 1fr; }
          .compra-input { font-size: 14px; }
        }
      `}} />

      <div style={{ background: '#213145', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 16px', display: 'flex', alignItems: 'center', height: 52 }}>
        <a href={`/producto/${id}`} style={{ color: '#ffb77d', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Volver al producto</a>
        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: '#ffb77d', textTransform: 'uppercase', letterSpacing: 1 }}>Pizdo</span>
      </div>

      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 16px 48px' }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', position: 'relative', overflow: 'hidden' }}>
            {confetti.map(p => <div key={p.id} style={{ position: 'absolute', top: -20, left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: '50%', animation: `confetti-fall ${p.duration} ${p.delay} linear`, pointerEvents: 'none' }} />)}
            <div style={{ width: 88, height: 88, background: '#22c55e', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderRadius: 16, boxShadow: '0 8px 32px rgba(34,197,94,0.25)', fontSize: 36, fontWeight: 700 }}>✓</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, color: '#111827' }}>¡Pedido registrado!</h1>
            <p style={{ fontSize: 16, color: '#4b5563', marginBottom: 32, lineHeight: 1.6 }}>Gracias {form.nombre}. Te contactaremos al <strong>{form.celular}</strong> para coordinar la entrega en <strong>{form.ciudad}</strong>.</p>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ff8c00', color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 16px rgba(255,140,0,0.3)' }}>🛒 Seguir comprando</a>
          </div>
        ) : (
          <div>
            <header style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: '#111827', marginBottom: 8, letterSpacing: '-0.02em' }}>Finalizar compra</h1>
              <p style={{ fontSize: 14, color: '#4b5563' }}>Completa tus datos y te contactaremos para coordinar el envío.</p>
            </header>

            {/* RESUMEN DEL PEDIDO */}
            <section aria-labelledby="order-summary-title" className="compra-card">
              <h2 id="order-summary-title" style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Resumen del pedido</h2>
              {producto.imagen && (
                <div style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: 'auto', maxHeight: 192, objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{producto.nombre}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#4b5563', marginBottom: 10 }}>
                <span>Precio unitario</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{formatPrice(precioFinal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#4b5563', paddingBottom: 16, borderBottom: '1px solid #f3f4f6', marginBottom: 16 }}>
                <span>Cantidad</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>x{cantidadTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: tieneOferta ? '#dc2626' : '#111827' }}>{formatPrice(total)}</span>
              </div>
              {tieneOferta && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Precio normal: <span style={{ textDecoration: 'line-through', fontWeight: 600 }}>{formatPrice(producto.precioVenta)}</span></div>}

              {carritoFiltrado.length > 0 && (
                <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    🛒 Productos del carrito
                  </div>
                  {carritoFiltrado.map(item => (
                    <div key={item.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 2 }}>
                        <button onClick={() => removeItem(item.id)} aria-label="Quitar del carrito" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '0 6px 0 0', flexShrink: 0 }}>✕</button>
                        <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</span>
                        <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>x{item.cantidad}</span>
                        <span style={{ marginLeft: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(item.precio * item.cantidad)}</span>
                      </div>
                      {!item.envioGratis && item.envioCosto > 0 && (
                        <div style={{ fontSize: 11, color: '#4b5563', paddingLeft: 24 }}>+ Envío: {formatPrice(item.envioCosto)}</div>
                      )}
                      {item.envioGratis && (
                        <div style={{ fontSize: 11, color: '#16a34a', paddingLeft: 24 }}>+ Envío gratis</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 14, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #dbeafe', fontWeight: 500 }}>
                <span style={{ fontSize: 18 }}>🚚</span>
                {envioTotalMostrar > 0 ? `Envío: ${formatPrice(envioTotalMostrar)}` : '¡Envío gratis!'}
              </div>
            </section>

            {/* UPSELL */}
            {producto?.relacionados?.length > 0 && (
              <section aria-labelledby="upsell-title" className="compra-card">
                <h2 id="upsell-title" style={{ fontSize: 12, fontWeight: 700, color: '#ff8c00', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                  + Agregar a tu pedido
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {producto.relacionados.map(rp => {
                    const rpPrecio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                    return (
                      <div key={rp.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 8, flexShrink: 0, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                          {rp.imagen ? (
                            <img src={rp.imagen} alt={rp.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; }} />
                          ) : null}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{rp.nombre}</h4>
                          <p style={{ fontSize: 14, fontWeight: 700, color: rp.ofertaActiva && rp.ofertaPrecio ? '#dc2626' : '#111827', margin: 0 }}>{formatPrice(rpPrecio)}</p>
                        </div>
                        <button type="button" onClick={() => addItem(rp)} style={{ background: '#ff8c00', color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0, border: 'none', cursor: 'pointer', minHeight: 38 }}>
                          + Agregar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* FORMULARIO */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: '1px solid #fecaca' }}>{error}</div>}

              <div className="compra-form-row">
                {[{ key: 'nombre', label: 'Nombre', ph: 'Tu nombre' }, { key: 'apellido', label: 'Apellido', ph: 'Tu apellido' }].map(f => (
                  <div key={f.key}>
                    <label className="compra-label" htmlFor={`f-${f.key}`}>{f.label} *</label>
                    <input id={`f-${f.key}`} className="compra-input" value={form[f.key]} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.ph} required />
                  </div>
                ))}
              </div>

              <div>
                <label className="compra-label" htmlFor="f-celular">Celular / WhatsApp *</label>
                <input id="f-celular" className="compra-input" type="tel" value={form.celular} onChange={e => handleChange('celular', e.target.value)} placeholder="3001234567" required />
              </div>

              <div className="compra-form-row">
                <div>
                  <label className="compra-label">Departamento *</label>
                  <AutocompleteInput value={form.departamento} onChange={v => { handleChange('departamento', v); handleChange('ciudad', ''); }}
                    options={departamentos} placeholder="Buscar departamento..." />
                </div>
                <div>
                  <label className="compra-label">Ciudad *</label>
                  <AutocompleteInput value={form.ciudad} onChange={v => handleChange('ciudad', v)}
                    options={ciudades} placeholder={!form.departamento ? 'Elige departamento primero' : 'Buscar ciudad...'}
                    disabled={!form.departamento} />
                </div>
              </div>

              <div>
                <label className="compra-label" htmlFor="f-direccion">Dirección *</label>
                <input id="f-direccion" className="compra-input" value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} placeholder="Calle 123 #45-67, Barrio" required />
              </div>

              <div className="compra-form-row">
                <div>
                  <label className="compra-label" htmlFor="f-cantidad">Cantidad</label>
                  <input id="f-cantidad" className="compra-input" type="number" min="1" value={form.cantidad} onChange={e => handleChange('cantidad', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="compra-label" htmlFor="f-email">Email <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(Opcional)</span></label>
                  <input id="f-email" className="compra-input" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="tu@email.com" />
                </div>
              </div>

              <div>
                <label className="compra-label" htmlFor="f-notas">Notas <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(Opcional)</span></label>
                <textarea id="f-notas" className="compra-input" value={form.notas} onChange={e => handleChange('notas', e.target.value)} rows={3} placeholder="Color, talla, alguna indicación especial..." style={{ resize: 'vertical', minHeight: 76 }} />
              </div>

              <div>
                <label className="compra-label" htmlFor="f-pago">Método de pago</label>
                <div className="compra-select-wrap">
                  <span className="compra-select-ico">💵</span>
                  <select id="f-pago" className="compra-input" value={form.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)} style={{ cursor: 'pointer' }}>
                    <option value="contraentrega">Contra entrega</option>
                    <option value="transferencia">Transferencia bancaria</option>
                  </select>
                  <span className="compra-select-arrow">▼</span>
                </div>
              </div>

              {form.metodoPago === 'transferencia' && bankConfig.empresa_banco && (
                <div style={{ background: '#eef2ff', borderRadius: 10, padding: 14, fontSize: 13 }}>
                  <div style={{ fontWeight: 800, color: '#3730a3', marginBottom: 8, fontSize: 14 }}>🏦 Datos para transferencia</div>
                  <div style={{ color: '#111827', lineHeight: 1.8 }}>
                    <div><strong>Banco:</strong> {bankConfig.empresa_banco}</div>
                    <div><strong>Tipo:</strong> {bankConfig.empresa_tipo_cuenta || '—'}</div>
                    <div><strong>Cuenta:</strong> {bankConfig.empresa_numero_cuenta}</div>
                    <div><strong>Titular:</strong> {bankConfig.empresa_titular_cuenta}</div>
                  </div>
                </div>
              )}

              <div style={{ paddingTop: 8, paddingBottom: 32 }}>
                <button type="submit" disabled={saving} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  minHeight: 56, background: saving ? '#9ca3af' : '#ff8c00', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                  fontFamily: '"Inter", sans-serif', opacity: saving ? 0.7 : 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)', transition: 'background 0.15s'
                }}>
                  <span style={{ fontSize: 22 }}>🛒</span>
                  {saving ? 'Enviando pedido...' : 'Confirmar pedido'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
