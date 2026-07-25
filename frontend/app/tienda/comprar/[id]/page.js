'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

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
    email: '', notas: '', cantidad: 1
  });
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);

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

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.celular.trim() || !form.direccion.trim() || !form.departamento || !form.ciudad.trim()) {
      setError('Completa todos los campos requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/tienda/comprar', {
        productoId: id,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        celular: form.celular.trim(),
        direccion: form.direccion.trim(),
        departamento: form.departamento,
        ciudad: form.ciudad.trim(),
        email: form.email.trim() || null,
        notas: form.notas.trim() || null,
        cantidad: form.cantidad || 1
      });
      setEnviado(true);
      const colors = ['#ff8c00', '#feb700', '#fff', '#22c55e', '#ba1a1a'];
      const particles = Array.from({ length: 60 }, (_, i) => ({
        id: i, left: Math.random() * 100 + '%',
        delay: Math.random() * 2 + 's', duration: (Math.random() * 2 + 2) + 's',
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.floor(Math.random() * 10 + 6) + 'px'
      }));
      setConfetti(particles);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al enviar el pedido. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto?.ofertaActiva && producto?.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const precioFinal = tieneOferta ? producto.ofertaPrecio : producto?.precioVenta;
  const total = precioFinal * form.cantidad;
  const S = { border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', borderRadius: '8px' };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 700, color: '#897362' }}>
      Cargando...
    </div>
  );

  if (error && !producto) return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 700, color: '#ba1a1a' }}>
      {error}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', color: '#0b1c30', fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        .compra-input { background: #ffffff; border: 1px solid #E2E8F0; padding: 14px 16px; font-size: 16px; font-weight: 600; color: #0b1c30; outline: none; font-family: 'Inter', sans-serif; width: 100%; box-sizing: border-box; border-radius: 8px; }
        .compra-input:focus { border-color: '#ff8c00; box-shadow: 0 0 0 3px rgba(255,140,0,0.15); }
        @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        @media (max-width: 768px) {
          .compra-grid { grid-template-columns: 1fr !important; }
          .compra-input { font-size: 15px !important; padding: 12px 14px !important; }
        }
      `}} />

      <div style={{ background: '#213145', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 52 }}>
        <a href={`/tienda/${id}`} style={{ color: '#ffb77d', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← Volver al producto
        </a>
        <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: '#ffb77d', textTransform: 'uppercase', letterSpacing: 1 }}>
          PIZDO
        </span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) 24px' }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: 'clamp(32px, 8vw, 64px) 24px', position: 'relative', overflow: 'hidden' }}>
            {confetti.map(p => (
              <div key={p.id} style={{
                position: 'absolute', top: -20, left: p.left, width: p.size, height: p.size,
                background: p.color, borderRadius: '50%', animation: `confetti-fall ${p.duration} ${p.delay} linear`,
                pointerEvents: 'none'
              }} />
            ))}
            <div style={{
              width: 80, height: 80, background: '#22c55e', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 32, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', fontSize: 36
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, marginBottom: 16 }}>
              ¡Pedido registrado!
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#554334', marginBottom: 32, lineHeight: 1.6 }}>
              Gracias por tu compra, {form.nombre}. Te contactaremos pronto al {form.celular} para coordinar la entrega en {form.ciudad}.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/tienda" style={{
                ...S, textDecoration: 'none', background: '#ff8c00', color: '#0b1c30',
                padding: '12px 28px', fontSize: 16, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8
              }}>
                🛒 Seguir comprando
              </a>
            </div>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 900, marginBottom: 12 }}>
              Finalizar compra
            </h1>
            <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#554334', marginBottom: 40, lineHeight: 1.6 }}>
              Completa tus datos y te contactaremos para coordinar el envío.
            </p>

            <div className="compra-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 48, alignItems: 'start' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {error && (
                  <div style={{ background: '#ffdad6', border: '2px solid #ba1a1a', padding: '14px 18px', fontSize: 15, fontWeight: 700, color: '#ba1a1a' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Nombre *
                    <input className="compra-input" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)}
                      placeholder="Tu nombre" required style={{ marginTop: 8 }} />
                  </label>
                  <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Apellido *
                    <input className="compra-input" value={form.apellido} onChange={e => handleChange('apellido', e.target.value)}
                      placeholder="Tu apellido" required style={{ marginTop: 8 }} />
                  </label>
                </div>

                <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Celular / WhatsApp *
                  <input type="tel" className="compra-input" value={form.celular} onChange={e => handleChange('celular', e.target.value)}
                    placeholder="3001234567" required style={{ marginTop: 8 }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Departamento *
                    <select className="compra-input" value={form.departamento}
                      onChange={e => { handleChange('departamento', e.target.value); handleChange('ciudad', ''); }}
                      style={{ marginTop: 8, cursor: 'pointer', appearance: 'auto' }} required>
                      <option value="">Seleccionar...</option>
                      {departamentos.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Ciudad *
                    <select className="compra-input" value={form.ciudad}
                      onChange={e => handleChange('ciudad', e.target.value)}
                      style={{ marginTop: 8, cursor: 'pointer', appearance: 'auto' }} required disabled={!form.departamento}>
                      <option value="">{form.departamento ? 'Seleccionar...' : 'Elige departamento primero'}</option>
                      {ciudades.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Dirección *
                  <input className="compra-input" value={form.direccion} onChange={e => handleChange('direccion', e.target.value)}
                    placeholder="Calle 123 #45-67, Barrio" required style={{ marginTop: 8 }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Cantidad
                    <input type="number" min="1" className="compra-input" value={form.cantidad}
                      onChange={e => handleChange('cantidad', parseInt(e.target.value) || 1)} style={{ marginTop: 8 }} />
                  </label>
                  <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Email (opcional)
                    <input type="email" className="compra-input" value={form.email} onChange={e => handleChange('email', e.target.value)}
                      placeholder="tu@email.com" style={{ marginTop: 8 }} />
                  </label>
                </div>

                <label style={{ fontSize: 15, fontWeight: 800, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Notas adicionales
                  <textarea className="compra-input" value={form.notas} onChange={e => handleChange('notas', e.target.value)}
                    rows={3} placeholder="Color, talla, alguna indicación especial..."
                    style={{ marginTop: 8, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                </label>

                <button type="submit" disabled={saving} style={{
                  ...S, background: saving ? '#897362' : '#ff8c00', color: '#0b1c30',
                  minHeight: 64, fontSize: 22, fontWeight: 900, cursor: 'pointer', marginTop: 12,
                  opacity: saving ? 0.6 : 1
                }}>
                  {saving ? 'Enviando pedido...' : '🛒 Confirmar pedido'}
                </button>
              </form>

              {/* ORDER SUMMARY */}
              <div style={{ background: '#eff4ff', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 28, position: 'sticky', top: 80 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
                  Resumen del pedido
                </div>
                {producto.imagen && (
                  <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: 180, objectFit: 'cover', border: '1px solid #E2E8F0', marginBottom: 16, background: '#fff' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#0b1c30' }}>{producto.nombre}</div>
                {tieneOferta && (
                  <div style={{
                    display: 'inline-block', background: '#ba1a1a', color: '#fff', fontSize: 12, fontWeight: 900,
                    padding: '4px 10px', border: '1px solid #E2E8F0', marginBottom: 12
                  }}>
                    -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </div>
                )}
                <div style={{ marginTop: 16, padding: '16px 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8, color: '#554334' }}>
                    <span>Precio unitario</span>
                    <span style={{ fontWeight: 700 }}>{formatPrice(precioFinal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8, color: '#554334' }}>
                    <span>Cantidad</span>
                    <span style={{ fontWeight: 700 }}>x{form.cantidad}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
                    <span>Total</span>
                    <span style={{ color: tieneOferta ? '#ba1a1a' : '#0b1c30' }}>{formatPrice(total)}</span>
                  </div>
                </div>
                {tieneOferta && (
                  <div style={{ fontSize: 13, color: '#897362', marginTop: 12 }}>
                    Precio normal: <span style={{ textDecoration: 'line-through', fontWeight: 700 }}>{formatPrice(producto.precioVenta)}</span>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  {total >= 100000 ? (
                    <div style={{ background: '#dcfce7', border: '2px solid #22c55e', padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#166534' }}>
                      🚚 ¡Envío gratis! Tu pedido supera los $100,000
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#554334', marginBottom: 6 }}>
                        🚚 Agrega {formatPrice(100000 - total)} más para envío gratis
                      </div>
                      <div style={{ height: 8, background: '#eff4ff', border: '1px solid #181c1e' }}>
                        <div style={{ height: '100%', background: '#ff8c00', width: `${Math.min(100, (total / 100000) * 100)}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                </div>

                {producto?.relacionados?.length > 0 && (
                  <div style={{ marginTop: 20, background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '3px 3px 0px 0px #181c1e', padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#ff8c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      + Agregar a tu pedido
                    </div>
                    {producto.relacionados.map(rp => {
                      const rpPrecio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                      return (
                        <a key={rp.id} href={`/tienda/comprar/${rp.id}`} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
                          borderBottom: '2px solid #e0e3e5', textDecoration: 'none', color: '#0b1c30',
                          cursor: 'pointer', transition: 'background 0.1s, transform 0.1s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff4ff'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}>
                          {rp.imagen ? (
                            <img src={rp.imagen} alt={rp.nombre} style={{ width: 52, height: 52, objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0, background: '#eff4ff' }}
                              onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: 52, height: 52, border: '1px solid #E2E8F0', flexShrink: 0, background: '#eff4ff' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{rp.nombre}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: rp.ofertaActiva && rp.ofertaPrecio ? '#ba1a1a' : '#0b1c30' }}>
                              {formatPrice(rpPrecio)}
                            </div>
                          </div>
                          <span style={{
                            background: '#ff8c00', color: '#0b1c30', fontWeight: 800, fontSize: 12,
                            padding: '6px 16px', border: '1px solid #E2E8F0', boxShadow: '2px 2px 0px 0px #181c1e',
                            whiteSpace: 'nowrap', flexShrink: 0, transition: 'transform 0.1s'
                          }}>
                            + Agregar
                          </span>
                        </a>
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
