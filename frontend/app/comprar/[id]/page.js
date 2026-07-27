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
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{
          marginTop: 6, width: '100%', padding: '14px 16px', background: disabled ? '#f8f9ff' : '#fff',
          border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 16, fontWeight: 500,
          color: disabled ? '#897362' : '#0b1c30', outline: 'none', fontFamily: '"Inter", sans-serif',
          transition: 'border-color 0.15s', boxSizing: 'border-box'
        }}
        onFocus2={e => { e.target.style.borderColor = '#ff8c00'; e.target.style.boxShadow = '0 0 0 3px rgba(255,140,0,0.1)'; }}
        onBlur2={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 180, overflow: 'auto'
        }}>
          {filtered.slice(0, 30).map((o, i) => (
            <div key={o.id || o.name || o || i} onClick={() => { onChange(o.name || o); setFilter(''); setOpen(false); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#0b1c30',
                borderBottom: i < filtered.length - 1 ? '1px solid #E2E8F0' : 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff4ff'}
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
  const { addItem, init, items: cartItems, getTotal, removeItem } = useCartStore();
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
      return;
    }
    setSaving(true); setError('');
    try {
      await api.post('/api/tienda/comprar', {
        productoId: id, nombre: form.nombre.trim(), apellido: form.apellido.trim(),
        celular: form.celular.trim(), direccion: form.direccion.trim(),
        departamento: form.departamento, ciudad: form.ciudad.trim(),
        email: form.email.trim() || null, notas: form.notas.trim() || null, cantidad: form.cantidad || 1,
        metodoPago: form.metodoPago
      });
      setEnviado(true);
      const colors = ['#ff8c00', '#feb700', '#fff', '#22c55e', '#ba1a1a'];
      setConfetti(Array.from({ length: 60 }, (_, i) => ({ id: i, left: Math.random() * 100 + '%', delay: Math.random() * 2 + 's', duration: (Math.random() * 2 + 2) + 's', color: colors[Math.floor(Math.random() * colors.length)], size: Math.floor(Math.random() * 10 + 6) + 'px' })));
    } catch (e) { setError(e.response?.data?.error || 'Error al enviar el pedido. Intenta de nuevo.'); }
    finally { setSaving(false); }
  };

  const cartTotal = getTotal();
  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto?.ofertaActiva && producto?.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const precioFinal = tieneOferta ? producto?.ofertaPrecio : producto?.precioVenta;
  const subtotalProducto = precioFinal * form.cantidad;
  const total = subtotalProducto + (cartItems.length > 0 ? cartTotal : 0);
  const C = { primary: '#ff8c00', primaryDark: '#904d00', text: '#0b1c30', subtext: '#564334', muted: '#897362', bg: '#f8f9ff', surface: '#fff', border: '#E2E8F0', red: '#ba1a1a', amber: '#feb700', green: '#22c55e', navy: '#213145' };

  if (loading) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: C.muted }}>Cargando...</div>;
  if (error && !producto) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: C.red }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        @media (max-width: 768px) { .compra-grid { grid-template-columns: 1fr !important; } }
      `}} />

      <div style={{ background: C.navy, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 52 }}>
        <a href={`/producto/${id}`} style={{ color: '#ffb77d', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Volver al producto</a>
        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: '#ffb77d', textTransform: 'uppercase', letterSpacing: 1 }}>Pizdo</span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) 24px' }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: 'clamp(32px, 8vw, 80px) 24px', position: 'relative', overflow: 'hidden' }}>
            {confetti.map(p => <div key={p.id} style={{ position: 'absolute', top: -20, left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: '50%', animation: `confetti-fall ${p.duration} ${p.delay} linear`, pointerEvents: 'none' }} />)}
            <div style={{ width: 88, height: 88, background: C.green, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderRadius: 16, boxShadow: '0 8px 32px rgba(34,197,94,0.25)', fontSize: 36, fontWeight: 700 }}>✓</div>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, marginBottom: 16, color: C.text }}>¡Pedido registrado!</h1>
            <p style={{ fontSize: 'clamp(16px, 2.5vw, 18px)', color: C.subtext, marginBottom: 32, lineHeight: 1.6 }}>Gracias {form.nombre}. Te contactaremos al <strong>{form.celular}</strong> para coordinar la entrega en <strong>{form.ciudad}</strong>.</p>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 16px rgba(255,140,0,0.3)' }}>🛒 Seguir comprando</a>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 48 }}>
              <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, marginBottom: 8, color: C.text }}>Finalizar compra</h1>
              <p style={{ fontSize: 16, color: C.subtext, lineHeight: 1.5 }}>Completa tus datos y te contactaremos para coordinar el envío.</p>
            </div>

            <div className="compra-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 48, alignItems: 'start' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {error && <div style={{ background: '#ffdad6', color: C.red, padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: '1px solid rgba(186,26,26,0.2)' }}>{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[{ key: 'nombre', label: 'Nombre', ph: 'Tu nombre' }, { key: 'apellido', label: 'Apellido', ph: 'Tu apellido' }].map(f => (
                    <label key={f.key} style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {f.label} *
                      <input value={form[f.key]} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.ph} required
                        style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                        onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = '0 0 0 3px rgba(255,140,0,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
                    </label>
                  ))}
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Celular / WhatsApp *
                  <input type="tel" value={form.celular} onChange={e => handleChange('celular', e.target.value)} placeholder="3001234567" required
                    style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = '0 0 0 3px rgba(255,140,0,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Departamento *
                    <AutocompleteInput value={form.departamento} onChange={v => { handleChange('departamento', v); handleChange('ciudad', ''); }}
                      options={departamentos} placeholder="Buscar departamento..." />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Ciudad *
                    <AutocompleteInput value={form.ciudad} onChange={v => handleChange('ciudad', v)}
                      options={ciudades} placeholder={!form.departamento ? 'Elige departamento primero' : 'Buscar ciudad...'}
                      disabled={!form.departamento} />
                  </label>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Dirección *
                  <input value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} placeholder="Calle 123 #45-67, Barrio" required
                    style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = '0 0 0 3px rgba(255,140,0,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Cantidad
                    <input type="number" min="1" value={form.cantidad} onChange={e => handleChange('cantidad', parseInt(e.target.value) || 1)}
                      style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Email <span style={{ color: C.muted, fontWeight: 500 }}>(opcional)</span>
                    <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="tu@email.com"
                      style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', boxSizing: 'border-box' }} />
                  </label>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Notas <span style={{ color: C.muted, fontWeight: 500 }}>(opcional)</span>
                  <textarea value={form.notas} onChange={e => handleChange('notas', e.target.value)} rows={2} placeholder="Color, talla, alguna indicación especial..."
                    style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
                </label>

                <label style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Método de pago
                  <select value={form.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)}
                    style={{ marginTop: 6, width: '100%', padding: '14px 16px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none', fontFamily: '"Inter", sans-serif', cursor: 'pointer', appearance: 'auto', boxSizing: 'border-box' }}>
                    <option value="contraentrega">💵 Contra entrega</option>
                    <option value="transferencia">🏦 Transferencia bancaria</option>
                  </select>
                </label>

                {form.metodoPago === 'transferencia' && bankConfig.empresa_banco && (
                  <div style={{ background: '#e5eeff', borderRadius: 10, padding: 14, fontSize: 13 }}>
                    <div style={{ fontWeight: 800, color: '#904d00', marginBottom: 8, fontSize: 14 }}>🏦 Datos para transferencia</div>
                    <div style={{ color: '#0b1c30', lineHeight: 1.8 }}>
                      <div><strong>Banco:</strong> {bankConfig.empresa_banco}</div>
                      <div><strong>Tipo:</strong> {bankConfig.empresa_tipo_cuenta || '—'}</div>
                      <div><strong>Cuenta:</strong> {bankConfig.empresa_numero_cuenta}</div>
                      <div><strong>Titular:</strong> {bankConfig.empresa_titular_cuenta}</div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={saving} style={{
                  width: '100%', minHeight: 56, background: saving ? C.muted : C.primary, color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                  fontFamily: '"Inter", sans-serif', opacity: saving ? 0.7 : 1,
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(255,140,0,0.3)', transition: 'all 0.15s', marginTop: 4
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.transform = 'none'; }}>
                  {saving ? '🔄 Enviando pedido...' : '🛒 Confirmar pedido'}
                </button>
              </form>

              <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 16, padding: 28, position: 'sticky', top: 80, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Resumen del pedido</div>
                {producto.imagen && (
                  <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 16, background: '#F8F9FA', border: '1px solid ' + C.border }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: C.text }}>{producto.nombre}</div>
                {tieneOferta && (
                  <span style={{ display: 'inline-block', background: '#ffdad6', color: C.red, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 16 }}>
                    -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </span>
                )}
                <div style={{ padding: '16px 0', borderTop: '1px solid ' + C.border, borderBottom: '1px solid ' + C.border, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: C.subtext }}><span>Precio unitario</span><span style={{ fontWeight: 600 }}>{formatPrice(precioFinal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: C.subtext }}><span>Cantidad</span><span style={{ fontWeight: 600 }}>x{form.cantidad}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + C.border }}><span>Total</span><span style={{ color: tieneOferta ? C.red : C.text }}>{formatPrice(total)}</span></div>
                </div>
                {tieneOferta && <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>Precio normal: <span style={{ textDecoration: 'line-through', fontWeight: 600 }}>{formatPrice(producto.precioVenta)}</span></div>}

                {cartItems.length > 0 && (
                  <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                      🛒 Productos del carrito
                    </div>
                    {cartItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '0 6px 0 0', flexShrink: 0 }}>✕</button>
                        <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</span>
                        <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>x{item.cantidad}</span>
                        <span style={{ marginLeft: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(item.precio * item.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  {total >= 100000 ? (
                    <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#166534', border: '1px solid rgba(34,197,94,0.2)' }}>🚚 ¡Envío gratis! Tu pedido supera los $100,000</div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.subtext, marginBottom: 6 }}>🚚 Agrega <strong>{formatPrice(100000 - total)}</strong> más para envío gratis</div>
                      <div style={{ height: 8, background: '#eff4ff', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: C.primary, borderRadius: 4, width: `${Math.min(100, (total / 100000) * 100)}%`, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )}
                </div>

                {producto?.relacionados?.length > 0 && (
                  <div style={{ marginTop: 24, padding: 16, background: '#f8f9ff', borderRadius: 12, border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>+ Agregar a tu pedido</div>
                    {producto.relacionados.map(rp => {
                      const rpPrecio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                      return (
                        <div key={rp.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                          borderBottom: '1px solid ' + C.border, transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {rp.imagen ? (
                            <img src={rp.imagen} alt={rp.nombre} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#F8F9FA', border: '1px solid ' + C.border }}
                              onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: '#F8F9FA', border: '1px solid ' + C.border }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{rp.nombre}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: rp.ofertaActiva && rp.ofertaPrecio ? C.red : C.text }}>{formatPrice(rpPrecio)}</div>
                          </div>
                          <button type="button" onClick={() => addItem(rp)} style={{ background: C.primary, color: '#fff', fontWeight: 700, fontSize: 11, padding: '5px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0, border: 'none', cursor: 'pointer' }}>+ Agregar</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
