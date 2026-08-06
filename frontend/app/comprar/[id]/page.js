'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
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
      <input type="text" className="cko-field" value={value} disabled={disabled}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{ marginTop: 4 }}
        />
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
  const envioPrincipal = producto?.envioGratis ? 0 : (producto?.envioCosto || 0);
  const envioCarrito = cartItems.reduce((sum, item) => sum + (item.envioGratis ? 0 : (item.envioCosto || 0)), 0);
  const total = subtotalProducto + (cartItems.length > 0 ? cartTotal : 0) + envioPrincipal + envioCarrito;
  const C = { primary: '#ff8c00', primaryDark: '#904d00', text: '#0b1c30', subtext: '#564334', muted: '#897362', bg: '#f8f9ff', surface: '#fff', border: '#E2E8F0', red: '#ba1a1a', amber: '#feb700', green: '#22c55e', navy: '#213145' };

  if (loading) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: C.muted }}>Cargando...</div>;
  if (error && !producto) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: C.red }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        .cko-wrap { padding-bottom: 0; }
        .cko-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px; align-items: start; padding-bottom: 0; }
        .cko-mobile-bar { display: none; }
        .cko-field { width: 100%; padding: 14px 16px; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 16px; font-weight: 500; color: #0b1c30; outline: none; font-family: 'Inter', sans-serif; box-sizing: border-box; transition: border-color 0.15s; margin-top: 4px; }
        .cko-field:focus { border-color: #ff8c00; box-shadow: 0 0 0 3px rgba(255,140,0,0.12); }
        .cko-label { font-size: 11px; font-weight: 800; color: #564334; text-transform: uppercase; letter-spacing: 0.5px; }
        .cko-btn { width: 100%; min-height: 54px; background: #ff8c00; color: #fff; border: none; border-radius: 14px; font-size: 17px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 4px 16px rgba(255,140,0,0.3); transition: all 0.15s; }
        .cko-btn:active { transform: scale(0.98); }
        .cko-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; }
        .cko-scroll > * { min-width: 200px; scroll-snap-align: start; flex-shrink: 0; }
        @media (max-width: 768px) {
          .cko-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .cko-grid > form { order: 2; padding: 0 12px 100px 12px !important; }
          .cko-grid > div { order: 1; }
          .cko-desktop-only { display: none !important; }
          .cko-mobile-bar { display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; z-index: 200; background: #fff; border-top: 1px solid #E2E8F0; padding: 12px 16px; box-shadow: 0 -4px 20px rgba(0,0,0,0.08); align-items: center; gap: 12px; }
          .cko-mobile-bar .cko-total-label { font-size: 11px; color: #897362; font-weight: 600; }
          .cko-mobile-bar .cko-total-amount { font-size: 18px; font-weight: 800; color: #0b1c30; }
          .cko-mobile-bar .cko-btn { min-height: 48px; font-size: 15px; border-radius: 12px; flex: 1; }
          .cko-summary-card { border-radius: 0 0 16px 16px !important; margin: 0 0 16px 0 !important; }
          .cko-summary-card img { height: 160px !important; object-fit: contain !important; padding: 12px !important; }
          .cko-nav-title { font-size: 15px !important; }
          .cko-section-title { font-size: 20px !important; padding: 0 12px !important; margin-bottom: 12px !important; }
          .cko-field { padding: 12px 14px !important; font-size: 15px !important; border-radius: 10px !important; }
          .cko-row { grid-template-columns: 1fr !important; gap: 10px !important; }
          .cko-related { padding: 12px !important; margin: 0 12px 16px 12px !important; }
        }
        @media (max-width: 480px) {
          .cko-summary-card img { height: 130px !important; }
          .cko-section-title { font-size: 18px !important; }
          .cko-field { padding: 10px 12px !important; font-size: 14px !important; border-radius: 8px !important; }
          .cko-mobile-bar { padding: 8px 12px !important; }
          .cko-mobile-bar .cko-total-amount { font-size: 16px !important; }
          .cko-mobile-bar .cko-btn { min-height: 44px !important; font-size: 14px !important; }
        }
      `}} />

      <div style={{ background: C.navy, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 16px', display: 'flex', alignItems: 'center', height: 48 }}>
        <a href={`/producto/${id}`} style={{ color: '#ffb77d', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Volver</a>
        <span className="cko-nav-title" style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 800, color: '#ffb77d', textTransform: 'uppercase', letterSpacing: 1 }}>Pizdo</span>
      </div>

      <div className="cko-wrap" style={{ maxWidth: 1000, margin: '0 auto', padding: 0 }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: 'clamp(32px, 8vw, 80px) 24px', position: 'relative', overflow: 'hidden', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {confetti.map(p => <div key={p.id} style={{ position: 'absolute', top: -20, left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: '50%', animation: `confetti-fall ${p.duration} ${p.delay} linear`, pointerEvents: 'none' }} />)}
            <div style={{ width: 80, height: 80, background: C.green, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderRadius: 20, boxShadow: '0 8px 32px rgba(34,197,94,0.25)', fontSize: 32, fontWeight: 700 }}>✓</div>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, marginBottom: 12, color: C.text }}>¡Pedido registrado!</h1>
            <p style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', color: C.subtext, marginBottom: 24, lineHeight: 1.6, maxWidth: 360 }}>Gracias {form.nombre}. Te contactaremos al <strong>{form.celular}</strong> para coordinar la entrega en <strong>{form.ciudad}</strong>.</p>
            {form.metodoPago === 'transferencia' && bankConfig.empresa_banco && (
              <div style={{ background: '#e5eeff', borderRadius: 12, padding: 16, marginBottom: 24, maxWidth: 340, width: '100%', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#904d00', marginBottom: 8, fontSize: 13 }}>🏦 Realiza tu transferencia a:</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: '#0b1c30' }}>
                  <div><strong>Banco:</strong> {bankConfig.empresa_banco}</div>
                  <div><strong>Cuenta:</strong> {bankConfig.empresa_numero_cuenta}</div>
                  <div><strong>Titular:</strong> {bankConfig.empresa_titular_cuenta}</div>
                </div>
              </div>
            )}
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff', padding: '14px 32px', borderRadius: 14, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 16px rgba(255,140,0,0.3)' }}>🛒 Seguir comprando</a>
          </div>
        ) : (
          <>
            <h1 className="cko-section-title" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, padding: 'clamp(16px, 4vw, 32px) 24px 0', margin: 0, color: C.text }}>Finalizar compra</h1>

            <div className="cko-grid" style={{ padding: 'clamp(12px, 3vw, 24px) 24px 40px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div style={{ background: '#ffdad6', color: C.red, padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>{error}</div>}

                <div className="cko-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="cko-label">Nombre *<input className="cko-field" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Tu nombre" required /></label>
                  <label className="cko-label">Apellido *<input className="cko-field" value={form.apellido} onChange={e => handleChange('apellido', e.target.value)} placeholder="Tu apellido" required /></label>
                </div>

                <label className="cko-label">Celular / WhatsApp *<input className="cko-field" type="tel" value={form.celular} onChange={e => handleChange('celular', e.target.value)} placeholder="3001234567" required /></label>

                <div className="cko-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="cko-label">Departamento *<AutocompleteInput value={form.departamento} onChange={v => { handleChange('departamento', v); handleChange('ciudad', ''); }} options={departamentos} placeholder="Buscar departamento..." /></label>
                  <label className="cko-label">Ciudad *<AutocompleteInput value={form.ciudad} onChange={v => handleChange('ciudad', v)} options={ciudades} placeholder={!form.departamento ? 'Elige departamento primero' : 'Buscar ciudad...'} disabled={!form.departamento} /></label>
                </div>

                <label className="cko-label">Dirección *<input className="cko-field" value={form.direccion} onChange={e => handleChange('direccion', e.target.value)} placeholder="Calle 123 #45-67, Barrio" required /></label>

                <div className="cko-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="cko-label">Cantidad<input className="cko-field" type="number" min="1" value={form.cantidad} onChange={e => handleChange('cantidad', parseInt(e.target.value) || 1)} /></label>
                  <label className="cko-label">Email <span style={{ color: C.muted, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span><input className="cko-field" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="tu@email.com" /></label>
                </div>

                <label className="cko-label">Notas <span style={{ color: C.muted, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span><textarea className="cko-field" value={form.notas} onChange={e => handleChange('notas', e.target.value)} rows={2} placeholder="Color, talla, alguna indicación especial..." style={{ resize: 'vertical' }} /></label>

                <label className="cko-label">Método de pago
                  <select className="cko-field" value={form.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)} style={{ cursor: 'pointer', appearance: 'auto' }}>
                    <option value="contraentrega">💵 Contra entrega</option>
                    <option value="transferencia">🏦 Transferencia bancaria</option>
                  </select>
                </label>

                {form.metodoPago === 'transferencia' && bankConfig.empresa_banco && (
                  <div style={{ background: '#e5eeff', borderRadius: 12, padding: 14, fontSize: 13 }}>
                    <div style={{ fontWeight: 800, color: '#904d00', marginBottom: 8 }}>🏦 Datos para transferencia</div>
                    <div style={{ color: '#0b1c30', lineHeight: 1.8 }}>
                      <div><strong>Banco:</strong> {bankConfig.empresa_banco}</div>
                      <div><strong>Cuenta:</strong> {bankConfig.empresa_numero_cuenta}</div>
                      <div><strong>Titular:</strong> {bankConfig.empresa_titular_cuenta}</div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={saving} className="cko-desktop-only cko-btn" style={{ marginTop: 8 }}>
                  {saving ? 'Enviando...' : '🛒 Confirmar pedido'}
                </button>
              </form>

              <div className="cko-summary-card" style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 16, padding: 24, position: 'sticky', top: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📋 Resumen</div>
                {producto.imagen && (
                  <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: 160, objectFit: 'contain', borderRadius: 10, marginBottom: 14, background: '#F8F9FA', border: '1px solid ' + C.border }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.text }}>{producto.nombre}</div>
                {tieneOferta && <span style={{ display: 'inline-block', background: '#ffdad6', color: C.red, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, marginBottom: 12 }}>-{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}%</span>}
                
                <div style={{ padding: '12px 0', borderTop: '1px solid ' + C.border, borderBottom: '1px solid ' + C.border, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.subtext }}><span>Precio unitario</span><span>{formatPrice(precioFinal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.subtext }}><span>Cantidad</span><span>x{form.cantidad}</span></div>
                  {envioPrincipal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.subtext }}><span>Envío</span><span>{formatPrice(envioPrincipal)}</span></div>}
                  {producto.envioGratis && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#22c55e' }}><span>Envío</span><span>Gratis</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + C.border }}><span>Total</span><span style={{ color: tieneOferta ? C.red : C.text }}>{formatPrice(total)}</span></div>
                </div>

                {cartItems.length > 0 && (
                  <div style={{ marginTop: 14, padding: '10px 0', borderTop: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.subtext, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🛒 Carrito</div>
                    {cartItems.map(item => (
                      <div key={item.id} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', fontSize: 12, padding: 0, marginRight: 6, flexShrink: 0 }}>✕</button>
                          <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</span>
                          <span style={{ marginLeft: 6 }}>x{item.cantidad}</span>
                          <span style={{ marginLeft: 8, fontWeight: 700 }}>{formatPrice(item.precio * item.cantidad)}</span>
                        </div>
                        {!item.envioGratis && item.envioCosto > 0 && <div style={{ fontSize: 10, color: C.muted, paddingLeft: 22 }}>+ Envío: {formatPrice(item.envioCosto)}</div>}
                        {item.envioGratis && <div style={{ fontSize: 10, color: '#22c55e', paddingLeft: 22 }}>+ Envío gratis</div>}
                      </div>
                    ))}
                  </div>
                )}

                {producto?.relacionados?.length > 0 && (
                  <div className="cko-related" style={{ marginTop: 16, padding: 14, background: '#f8f9ff', borderRadius: 12, border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#904d00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>+ Agregar a tu pedido</div>
                    <div className="cko-scroll">
                      {producto.relacionados.map(rp => {
                        const rpPrecio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                        return (
                          <div key={rp.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid ' + C.border, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            {rp.imagen ? <img src={rp.imagen} alt={rp.nombre} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#F8F9FA' }} onError={e => { e.target.style.display = 'none'; }} /> : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#F8F9FA' }} />}
                            <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{rp.nombre}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: rp.ofertaActiva && rp.ofertaPrecio ? C.red : C.text }}>{formatPrice(rpPrecio)}</div>
                            <button type="button" onClick={() => addItem(rp)} style={{ background: C.primary, color: '#fff', fontWeight: 700, fontSize: 11, padding: '5px 14px', borderRadius: 8, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', width: '100%' }}>+ Agregar</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {!enviado && (
        <div className="cko-mobile-bar">
          <div style={{ flex: 1 }}>
            <div className="cko-total-label">Total</div>
            <div className="cko-total-amount">{formatPrice(total)}</div>
          </div>
          <button type="button" onClick={() => handleSubmit({ preventDefault: () => {} })} disabled={saving} className="cko-btn">
            {saving ? 'Enviando...' : '🛒 Confirmar pedido'}
          </button>
        </div>
      )}
    </div>
  );
}
