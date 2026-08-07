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
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="compra-input"
        style={{
          width: '100%',
          padding: '14px 16px',
          background: disabled ? '#F3F4F6' : '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 500,
          color: disabled ? '#94A3B8' : '#0F172A',
          outline: 'none',
          fontFamily: '"Inter", sans-serif',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box'
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(15,23,42,0.15)', maxHeight: 220, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {filtered.slice(0, 30).map((o, i) => (
            <div
              key={o.id || o.name || o || i}
              onClick={() => { onChange(o.name || o); setFilter(''); setOpen(false); }}
              style={{
                padding: '12px 16px', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#0F172A',
                borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
            >
              <span>{o.name || o}</span>
              <span style={{ color: '#EA580C', fontSize: 13, fontWeight: 600 }}>Seleccionar ›</span>
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
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

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
    if (typeof window !== 'undefined' && window.fbq && producto) {
      window.fbq('track', 'InitiateCheckout', {
        content_name: producto.nombre,
        content_ids: [producto.id],
        content_type: 'product',
        num_items: form.cantidad,
        value: total,
        currency: 'COP'
      });
    }
  }, [producto]);

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

  const handleQuantityChange = (delta) => {
    setForm(prev => ({ ...prev, cantidad: Math.max(1, (prev.cantidad || 1) + delta) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.celular.trim() || !form.direccion.trim() || !form.departamento || !form.ciudad.trim()) {
      setError('Por favor completa todos los campos requeridos (*)');
      const firstInvalid = document.querySelector('input:invalid, input[required]:placeholder-shown');
      if (firstInvalid) firstInvalid.focus();
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const colors = ['#ea580c', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
      setConfetti(Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        delay: Math.random() * 1.5 + 's',
        duration: (Math.random() * 2 + 2) + 's',
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.floor(Math.random() * 8 + 6) + 'px'
      })));
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Purchase', {
          content_name: producto?.nombre || '',
          content_ids: [id],
          content_type: 'product',
          value: subtotalProducto + cartTotal + envioPrincipal + envioCarrito,
          currency: 'COP',
          num_items: form.cantidad + cartItems.reduce((s, i) => s + i.cantidad, 0)
        });
      }
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

  const C = {
    primary: '#ea580c',
    primaryHover: '#c2410c',
    primaryLight: '#fff7ed',
    primaryBorder: '#ffedd5',
    text: '#0f172a',
    subtext: '#475569',
    muted: '#94a3b8',
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    red: '#dc2626',
    amber: '#d97706',
    green: '#16a34a',
    greenBg: '#f0fdf4',
    navy: '#0f172a'
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', gap: 12 }}>
        <div style={{ width: 44, height: 44, border: '4px solid #E2E8F0', borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
        <div style={{ fontSize: 16, fontWeight: 600, color: C.subtext }}>Cargando datos del pedido...</div>
      </div>
    );
  }

  if (error && !producto) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>Producto no disponible</h2>
        <p style={{ fontSize: 15, color: C.subtext, marginBottom: 24 }}>{error}</p>
        <a href="/" style={{ background: C.primary, color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>Volver a la tienda</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', paddingBottom: 80 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        
        .compra-input:focus {
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.12) !important;
        }

        .compra-mobile-summary-bar {
          display: none;
        }

        .compra-form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .compra-payment-card {
          border: 2px solid ${C.border};
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #fff;
        }

        .compra-payment-card.selected {
          border-color: ${C.primary};
          background: ${C.primaryLight};
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.1);
        }

        @media (max-width: 768px) {
          .compra-mobile-summary-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #FFFFFF;
            border-bottom: 1px solid ${C.border};
            padding: 14px 16px;
            position: sticky;
            top: 52px;
            z-index: 40;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          }

          .compra-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }

          .compra-main-container {
            padding: 16px 12px !important;
          }

          .compra-desktop-summary {
            display: none !important;
          }

          .compra-mobile-summary-expanded {
            display: block !important;
          }

          .compra-sticky-mobile-cta {
            display: flex !important;
          }
        }

        @media (max-width: 600px) {
          .compra-form-grid-2 {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
        }

        @media (min-width: 769px) {
          .compra-mobile-summary-expanded {
            display: none !important;
          }
          .compra-sticky-mobile-cta {
            display: none !important;
          }
        }
      `}} />

      {/* Header Superior */}
      <header style={{ background: C.navy, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', display: 'flex', alignItems: 'center', height: 52, position: 'sticky', top: 0, zIndex: 50 }}>
        <a href={`/producto/${id}`} style={{ color: '#ffedd5', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>←</span> <span>Volver al producto</span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>🔒</span> Checkout Seguro
          </span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#ea580c', letterSpacing: 0.5, marginLeft: 8 }}>PIZDO</span>
        </div>
      </header>

      {/* Mobile Top Order Summary Accordion Bar */}
      {!enviado && (
        <div className="compra-mobile-summary-bar" onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            {producto.imagen && (
              <img src={producto.imagen} alt={producto.nombre} style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid ' + C.border, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🛒 Resumen ({form.cantidad} {form.cantidad === 1 ? 'unidad' : 'unidades'})
              </div>
              <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>
                {mobileSummaryOpen ? 'Ocultar detalles ▲' : 'Ver detalles 🔻'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: tieneOferta ? C.red : C.text }}>{formatPrice(total)}</div>
            {producto.envioGratis && <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>Envío gratis</div>}
          </div>
        </div>
      )}

      {/* Mobile Order Summary Expanded Content */}
      {!enviado && mobileSummaryOpen && (
        <div className="compra-mobile-summary-expanded" style={{ background: '#FFFFFF', borderBottom: '1px solid ' + C.border, padding: 16 }}>
          <div style={{ background: C.bg, borderRadius: 12, padding: 14, border: '1px solid ' + C.border }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {producto.imagen && (
                <img src={producto.imagen} alt={producto.nombre} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid ' + C.border, background: '#fff' }} onError={e => e.target.style.display = 'none'} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{producto.nombre}</div>
                {tieneOferta && (
                  <span style={{ background: '#fee2e2', color: C.red, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, display: 'inline-block', marginBottom: 6 }}>
                    -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </span>
                )}
                <div style={{ fontSize: 15, fontWeight: 800, color: tieneOferta ? C.red : C.text }}>{formatPrice(precioFinal)} c/u</div>
              </div>
            </div>

            {/* Stepper de cantidad para Mobile */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid ' + C.border, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.subtext }}>Cantidad:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={() => handleQuantityChange(-1)} disabled={form.cantidad <= 1} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid ' + C.border, background: form.cantidad <= 1 ? '#f1f5f9' : '#fff', color: C.text, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.text, minWidth: 20, textAlign: 'center' }}>{form.cantidad}</span>
                <button type="button" onClick={() => handleQuantityChange(1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid ' + C.border, background: '#fff', color: C.text, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>

            {/* Carrito extra items */}
            {cartItems.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + C.border }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', marginBottom: 8 }}>Otros items en el carrito:</div>
                {cartItems.map(item => (
                  <div key={item.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{item.nombre} (x{item.cantidad})</span>
                      <span style={{ fontWeight: 700 }}>{formatPrice(item.precio * item.cantidad)}</span>
                    </div>
                    {item.envioCosto > 0 && !item.envioGratis && (
                      <div style={{ fontSize: 10, color: C.muted, paddingLeft: 6 }}>+ Envío: {formatPrice(item.envioCosto)}</div>
                    )}
                    {item.envioGratis && (
                      <div style={{ fontSize: 10, color: C.green, paddingLeft: 6 }}>+ Envío gratis</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Desglose total */}
            <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 10, marginTop: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: C.subtext }}>
                <span>Subtotal ({form.cantidad} uds)</span>
                <span>{formatPrice(subtotalProducto)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: C.subtext }}>
                <span>Envío</span>
                <span style={{ color: producto.envioGratis ? C.green : C.text, fontWeight: 600 }}>{producto.envioGratis ? 'GRATIS 🚚' : formatPrice(envioPrincipal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: C.text, marginTop: 8, paddingTop: 8, borderTop: '1px dashed ' + C.border }}>
                <span>Total a Pagar</span>
                <span style={{ color: C.primary }}>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="compra-main-container" style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(20px, 4vw, 40px) 20px' }}>
        {enviado ? (
          <div style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid ' + C.border, padding: 'clamp(28px, 6vw, 60px) 24px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
            {confetti.map(p => <div key={p.id} style={{ position: 'absolute', top: -20, left: p.left, width: p.size, height: p.size, background: p.color, borderRadius: '50%', animation: `confetti-fall ${p.duration} ${p.delay} linear`, pointerEvents: 'none' }} />)}
            <div style={{ width: 80, height: 80, background: '#dcfce7', color: C.green, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderRadius: '50%', fontSize: 40, fontWeight: 800, border: '3px solid #bbf7d0' }}>✓</div>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: 12, color: C.text, letterSpacing: '-0.5px' }}>¡Pedido Registrado con Éxito!</h1>
            <p style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: C.subtext, marginBottom: 28, lineHeight: 1.6, maxWidth: 580, margin: '0 auto 28px' }}>
              Gracias <strong>{form.nombre}</strong>. Nos comunicaremos contigo al WhatsApp <strong>{form.celular}</strong> para confirmar el despacho hacia <strong>{form.ciudad}, {form.departamento}</strong>.
            </p>

            {/* Tarjeta Resumen Pos-compra */}
            <div style={{ background: C.bg, borderRadius: 16, border: '1px solid ' + C.border, padding: 20, maxWidth: 440, margin: '0 auto 32px', textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, borderBottom: '1px solid ' + C.border, paddingBottom: 8 }}>Detalles del envío</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                <div><strong>Producto:</strong> {producto.nombre} (x{form.cantidad})</div>
                <div><strong>Total a pagar:</strong> <span style={{ color: C.primary, fontWeight: 800 }}>{formatPrice(total)}</span></div>
                <div><strong>Método de Pago:</strong> {form.metodoPago === 'contraentrega' ? '💵 Pago Contra Entrega (Pagas al recibir)' : '🏦 Transferencia Bancaria'}</div>
                <div><strong>Dirección:</strong> {form.direccion}</div>
              </div>
            </div>

            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', justifyCenter: 'center', gap: 8, background: C.primary, color: '#fff', padding: '16px 36px', borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(234,88,12,0.3)', transition: 'all 0.2s ease' }}>
              🛒 Volver a la Tienda
            </a>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primaryLight, color: C.primary, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10, border: '1px solid ' + C.primaryBorder }}>
                ⚡ PROCESO DE COMPRA RÁPIDA
              </div>
              <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, marginBottom: 8, color: C.text, letterSpacing: '-0.5px' }}>Finalizar tu Pedido</h1>
              <p style={{ fontSize: 15, color: C.subtext, lineHeight: 1.5 }}>
                Ingresa los datos para realizar la entrega. <strong style={{ color: C.green }}>¡Pagas en efectivo al recibir tu paquete!</strong>
              </p>
            </div>

            {/* Grid Principal */}
            <div className="compra-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 36, alignItems: 'start' }}>
              {/* Formulario */}
              <form id="comprar-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {error && (
                  <div style={{ background: '#fef2f2', color: C.red, padding: '14px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: '1.5px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span> <span>{error}</span>
                  </div>
                )}

                {/* Sección 1: Datos Personales */}
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid ' + C.border, padding: 'clamp(16px, 3vw, 24px)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>Datos de Contacto</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="compra-form-grid-2">
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Nombre *
                        <input
                          value={form.nombre}
                          onChange={e => handleChange('nombre', e.target.value)}
                          placeholder="Tu nombre"
                          required
                          className="compra-input"
                          style={{
                            width: '100%', padding: '14px 16px', background: '#FFFFFF', border: '1.5px solid ' + C.border,
                            borderRadius: 12, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none',
                            fontFamily: '"Inter", sans-serif', boxSizing: 'border-box'
                          }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Apellido *
                        <input
                          value={form.apellido}
                          onChange={e => handleChange('apellido', e.target.value)}
                          placeholder="Tu apellido"
                          required
                          className="compra-input"
                          style={{
                            width: '100%', padding: '14px 16px', background: '#FFFFFF', border: '1.5px solid ' + C.border,
                            borderRadius: 12, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none',
                            fontFamily: '"Inter", sans-serif', boxSizing: 'border-box'
                          }}
                        />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Celular / WhatsApp *
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          value={form.celular}
                          onChange={e => handleChange('celular', e.target.value)}
                          placeholder="Ej: 300 123 4567"
                          required
                          className="compra-input"
                          style={{
                            width: '100%', padding: '14px 16px 14px 44px', background: '#FFFFFF', border: '1.5px solid ' + C.border,
                            borderRadius: 12, fontSize: 16, fontWeight: 600, color: C.text, outline: 'none',
                            fontFamily: '"Inter", sans-serif', boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>📱</span>
                      </div>
                      <span style={{ fontSize: 11, color: C.muted, textTransform: 'none', fontWeight: 500 }}>Te contactaremos por WhatsApp para coordinar el despacho.</span>
                    </label>
                  </div>
                </div>

                {/* Sección 2: Dirección de Entrega */}
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid ' + C.border, padding: 'clamp(16px, 3vw, 24px)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>Dirección de Entrega</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="compra-form-grid-2">
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Departamento *
                        <AutocompleteInput
                          value={form.departamento}
                          onChange={v => { handleChange('departamento', v); handleChange('ciudad', ''); }}
                          options={departamentos}
                          placeholder="Buscar departamento..."
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Ciudad *
                        <AutocompleteInput
                          value={form.ciudad}
                          onChange={v => handleChange('ciudad', v)}
                          options={ciudades}
                          placeholder={!form.departamento ? 'Elige depto primero' : 'Buscar ciudad...'}
                          disabled={!form.departamento}
                        />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Dirección Completa *
                      <input
                        value={form.direccion}
                        onChange={e => handleChange('direccion', e.target.value)}
                        placeholder="Ej: Calle 12 # 34 - 56, Barrio..."
                        required
                        className="compra-input"
                        style={{
                          width: '100%', padding: '14px 16px', background: '#FFFFFF', border: '1.5px solid ' + C.border,
                          borderRadius: 12, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none',
                          fontFamily: '"Inter", sans-serif', boxSizing: 'border-box'
                        }}
                      />
                    </label>

                    <div className="compra-form-grid-2">
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Email <span style={{ color: C.muted, fontWeight: 500 }}>(opcional)</span>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => handleChange('email', e.target.value)}
                          placeholder="tu@email.com"
                          className="compra-input"
                          style={{
                            width: '100%', padding: '14px 16px', background: '#FFFFFF', border: '1.5px solid ' + C.border,
                            borderRadius: 12, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none',
                            fontFamily: '"Inter", sans-serif', boxSizing: 'border-box'
                          }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Notas de envío <span style={{ color: C.muted, fontWeight: 500 }}>(opcional)</span>
                        <input
                          value={form.notas}
                          onChange={e => handleChange('notas', e.target.value)}
                          placeholder="Ej: Dejar en portería..."
                          className="compra-input"
                          style={{
                            width: '100%', padding: '14px 16px', background: '#FFFFFF', border: '1.5px solid ' + C.border,
                            borderRadius: 12, fontSize: 16, fontWeight: 500, color: C.text, outline: 'none',
                            fontFamily: '"Inter", sans-serif', boxSizing: 'border-box'
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sección 3: Método de Pago (Tarjetas visuales) */}
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid ' + C.border, padding: 'clamp(16px, 3vw, 24px)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>Método de Pago</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Opción 1: ContraEntrega */}
                    <div
                      className={`compra-payment-card ${form.metodoPago === 'contraentrega' ? 'selected' : ''}`}
                      onClick={() => handleChange('metodoPago', 'contraentrega')}
                    >
                      <div style={{ fontSize: 24, marginTop: 2 }}>💵</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Pago Contra Entrega</span>
                          <span style={{ background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(22,163,74,0.2)' }}>
                            ✓ Recomendado
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: C.subtext, margin: '4px 0 0 0', lineHeight: 1.4 }}>
                          Le pagas en efectivo al repartidor de la transportadora cuando el pedido llegue a tu casa.
                        </p>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + (form.metodoPago === 'contraentrega' ? C.primary : C.muted), display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        {form.metodoPago === 'contraentrega' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.primary }} />}
                      </div>
                    </div>

                    {/* Opción 2: Transferencia */}
                    <div
                      className={`compra-payment-card ${form.metodoPago === 'transferencia' ? 'selected' : ''}`}
                      onClick={() => handleChange('metodoPago', 'transferencia')}
                    >
                      <div style={{ fontSize: 24, marginTop: 2 }}>🏦</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Transferencia Bancaria</span>
                        <p style={{ fontSize: 13, color: C.subtext, margin: '4px 0 0 0', lineHeight: 1.4 }}>
                          Realiza la transferencia desde Bancolombia, Nequi o Daviplata. Te enviaremos las cuentas por WhatsApp.
                        </p>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + (form.metodoPago === 'transferencia' ? C.primary : C.muted), display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        {form.metodoPago === 'transferencia' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.primary }} />}
                      </div>
                    </div>
                  </div>

                  {form.metodoPago === 'transferencia' && bankConfig.empresa_banco && (
                    <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, fontSize: 13, marginTop: 14, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontWeight: 800, color: '#1e40af', marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>ℹ️</span> <span>Datos para transferencia bancaria</span>
                      </div>
                      <div style={{ color: C.text, lineHeight: 1.8 }}>
                        <div><strong>Banco:</strong> {bankConfig.empresa_banco}</div>
                        <div><strong>Tipo de Cuenta:</strong> {bankConfig.empresa_tipo_cuenta || '—'}</div>
                        <div><strong>Número de Cuenta:</strong> {bankConfig.empresa_numero_cuenta}</div>
                        <div><strong>Titular:</strong> {bankConfig.empresa_titular_cuenta}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón de Confirmación Principal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      width: '100%', minHeight: 60, background: saving ? C.muted : C.primary, color: '#fff',
                      border: 'none', borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: '"Inter", sans-serif', opacity: saving ? 0.7 : 1,
                      boxShadow: saving ? 'none' : '0 8px 24px rgba(234,88,12,0.3)', transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                    }}
                    onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = C.primaryHover; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; } }}
                  >
                    {saving ? '🔄 Procesando pedido...' : '🛒 Confirmar pedido y pagar contra entrega'}
                  </button>

                  {/* Sellos de Confianza y Garantía */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8, textAlign: 'center' }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid ' + C.border, borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 20, marginBottom: 2 }}>🚚</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Envío Nacional</div>
                      <div style={{ fontSize: 10, color: C.muted }}>Con guía de rastreo</div>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid ' + C.border, borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 20, marginBottom: 2 }}>💵</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Pago al Recibir</div>
                      <div style={{ fontSize: 10, color: C.muted }}>En la puerta de tu casa</div>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid ' + C.border, borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 20, marginBottom: 2 }}>🛡️</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Garantía Total</div>
                      <div style={{ fontSize: 10, color: C.muted }}>30 días de protección</div>
                    </div>
                  </div>
                </div>
              </form>

              {/* Sidebar de Resumen en Desktop */}
              <div className="compra-desktop-summary" style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 20, padding: 24, position: 'sticky', top: 76, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Resumen de tu pedido</div>

                {producto.imagen && (
                  <div style={{ overflow: 'hidden', borderRadius: 12, marginBottom: 16, border: '1px solid ' + C.border, background: '#f8fafc', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}

                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, color: C.text, lineHeight: 1.3 }}>{producto.nombre}</div>

                {tieneOferta && (
                  <span style={{ display: 'inline-block', background: '#fee2e2', color: C.red, fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, marginBottom: 16 }}>
                    🔥 Oferta especial: -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </span>
                )}

                {/* Controles de Cantidad en Desktop */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.bg, borderRadius: 10, border: '1px solid ' + C.border, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.subtext }}>Cantidad</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button type="button" onClick={() => handleQuantityChange(-1)} disabled={form.cantidad <= 1} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', color: C.text, fontWeight: 700, cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text, minWidth: 16, textAlign: 'center' }}>{form.cantidad}</span>
                    <button type="button" onClick={() => handleQuantityChange(1)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', color: C.text, fontWeight: 700, cursor: 'pointer' }}>+</button>
                  </div>
                </div>

                {/* Desglose de precios */}
                <div style={{ padding: '16px 0', borderTop: '1px solid ' + C.border, borderBottom: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: C.subtext }}>
                    <span>Precio unitario</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{formatPrice(precioFinal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: C.subtext }}>
                    <span>Subtotal ({form.cantidad} uds)</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{formatPrice(subtotalProducto)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: C.subtext }}>
                    <span>Envío</span>
                    <span style={{ fontWeight: 700, color: producto.envioGratis ? C.green : C.text }}>
                      {producto.envioGratis ? '¡GRATIS! 🚚' : formatPrice(envioPrincipal)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 900, marginTop: 12, paddingTop: 12, borderTop: '1.5px dashed ' + C.border }}>
                    <span>Total a Pagar</span>
                    <span style={{ color: tieneOferta ? C.red : C.primary }}>{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Carrito extra items en desktop */}
                {cartItems.length > 0 && (
                  <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                      🛒 Productos adicionales
                    </div>
                    {cartItems.map(item => (
                      <div key={item.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, fontWeight: 800, padding: '0 6px 0 0' }}>✕</button>
                          <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</span>
                          <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>x{item.cantidad}</span>
                          <span style={{ marginLeft: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(item.precio * item.cantidad)}</span>
                        </div>
                        {item.envioCosto > 0 && !item.envioGratis && (
                          <div style={{ fontSize: 10, color: C.subtext, paddingLeft: 24, marginTop: 1 }}>+ Envío: {formatPrice(item.envioCosto)}</div>
                        )}
                        {item.envioGratis && (
                          <div style={{ fontSize: 10, color: C.green, paddingLeft: 24, marginTop: 1 }}>+ Envío gratis</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Banner Envío gratis */}
                {producto.envioGratis ? (
                  <div style={{ marginTop: 16, background: C.greenBg, borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.green, border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🚚</span> <span>¡Genial! Este producto incluye Envío Gratis</span>
                  </div>
                ) : producto.envioCosto ? (
                  <div style={{ marginTop: 16, background: C.primaryLight, borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.text, border: '1px solid ' + C.primaryBorder }}>
                    🚚 Costo de Envío: {formatPrice(producto.envioCosto)}
                  </div>
                ) : null}

                {/* Productos Relacionados / Upsell */}
                {producto?.relacionados?.length > 0 && (
                  <div style={{ marginTop: 24, padding: 16, background: C.bg, borderRadius: 14, border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>+ Complementa tu compra</div>
                    {producto.relacionados.map(rp => {
                      const rpPrecio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                      return (
                        <div key={rp.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                          borderBottom: '1px solid ' + C.border
                        }}>
                          {rp.imagen ? (
                            <img src={rp.imagen} alt={rp.nombre} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#fff', border: '1px solid ' + C.border }} onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: '#fff', border: '1px solid ' + C.border }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{rp.nombre}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{formatPrice(rpPrecio)}</div>
                          </div>
                          <button type="button" onClick={() => addItem(rp)} style={{ background: C.primary, color: '#fff', fontWeight: 800, fontSize: 11, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0, border: 'none', cursor: 'pointer' }}>+ Agregar</button>
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

      {/* Sticky Bottom Floating Bar para Celulares (Mobile CTA Bar) */}
      {!enviado && (
        <div className="compra-sticky-mobile-cta" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
          background: '#FFFFFF', borderTop: '1px solid ' + C.border, padding: '10px 16px',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.1)', display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div>
            <div style={{ fontSize: 11, color: C.subtext, textTransform: 'uppercase', fontWeight: 700 }}>Total a pagar</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.primary, lineHeight: 1 }}>{formatPrice(total)}</div>
          </div>
          <button
            onClick={() => {
              const formEl = document.getElementById('comprar-form');
              if (formEl) formEl.requestSubmit();
            }}
            disabled={saving}
            style={{
              flex: 1, height: 48, background: saving ? C.muted : C.primary, color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(234,88,12,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            {saving ? '🔄 Procesando...' : '🛒 Confirmar Pedido'}
          </button>
        </div>
      )}
    </div>
  );
}

