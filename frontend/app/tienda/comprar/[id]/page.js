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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '', apellido: '', celular: '', direccion: '', ciudad: '',
    email: '', notas: '', cantidad: 1
  });

  useEffect(() => {
    if (!id) return;
    api.get(`/api/tienda/${id}`)
      .then(({ data }) => setProducto(data))
      .catch(() => setError('Producto no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.celular.trim() || !form.direccion.trim() || !form.ciudad.trim()) {
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
        ciudad: form.ciudad.trim(),
        email: form.email.trim() || null,
        notas: form.notas.trim() || null,
        cantidad: form.cantidad || 1
      });
      setEnviado(true);
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
  const S = { border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e' };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 700, color: '#887362' }}>
      Cargando...
    </div>
  );

  if (error && !producto) return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 700, color: '#ba1a1a' }}>
      {error}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', color: '#181c1e', fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        .compra-input { background: #ffffff; border: 2px solid #181c1e; padding: 12px 16px; font-size: 18px; font-weight: 700; color: #181c1e; outline: none; font-family: 'Inter', sans-serif; width: 100%; box-sizing: border-box; }
        .compra-input:focus { box-shadow: 0 0 0 4px #f28c00; }
        @media (max-width: 768px) {
          .compra-grid { grid-template-columns: 1fr !important; }
          .compra-input { font-size: 16px !important; padding: 10px 14px !important; }
        }
      `}} />

      <div style={{ background: '#181c1e', borderBottom: '2px solid #181c1e', padding: '0 24px', display: 'flex', alignItems: 'center', height: 52 }}>
        <a href={`/tienda/${id}`} style={{ color: '#ffb875', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
          ← Volver al producto
        </a>
        <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 900, color: '#ffb875', textTransform: 'uppercase', letterSpacing: 1 }}>
          PIZDO
        </span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(24px, 5vw, 48px) 24px' }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: 'clamp(32px, 8vw, 64px) 24px' }}>
            <div style={{
              width: 80, height: 80, background: '#22c55e', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 32, border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e', fontSize: 36
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
                ...S, textDecoration: 'none', background: '#f28c00', color: '#181c1e',
                padding: '12px 28px', fontSize: 16, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8
              }}>
                🛒 Seguir comprando
              </a>
            </div>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, marginBottom: 8 }}>
              Finalizar compra
            </h1>
            <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#554334', marginBottom: 32 }}>
              Completa tus datos y te contactaremos para coordinar el envío.
            </p>

            <div className="compra-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32, alignItems: 'start' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ background: '#ffdad6', border: '2px solid #ba1a1a', padding: '12px 16px', fontSize: 15, fontWeight: 700, color: '#ba1a1a' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Nombre *
                    <input className="compra-input" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)}
                      placeholder="Tu nombre" required style={{ marginTop: 6 }} />
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Apellido *
                    <input className="compra-input" value={form.apellido} onChange={e => handleChange('apellido', e.target.value)}
                      placeholder="Tu apellido" required style={{ marginTop: 6 }} />
                  </label>
                </div>

                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Celular / WhatsApp *
                  <input type="tel" className="compra-input" value={form.celular} onChange={e => handleChange('celular', e.target.value)}
                    placeholder="3001234567" required style={{ marginTop: 6 }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Ciudad *
                    <input className="compra-input" value={form.ciudad} onChange={e => handleChange('ciudad', e.target.value)}
                      placeholder="Bogotá" required style={{ marginTop: 6 }} />
                  </label>
                  <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Cantidad
                    <input type="number" min="1" className="compra-input" value={form.cantidad}
                      onChange={e => handleChange('cantidad', parseInt(e.target.value) || 1)} style={{ marginTop: 6 }} />
                  </label>
                </div>

                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Dirección *
                  <input className="compra-input" value={form.direccion} onChange={e => handleChange('direccion', e.target.value)}
                    placeholder="Calle 123 #45-67, Barrio" required style={{ marginTop: 6 }} />
                </label>

                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Email (opcional)
                  <input type="email" className="compra-input" value={form.email} onChange={e => handleChange('email', e.target.value)}
                    placeholder="tu@email.com" style={{ marginTop: 6 }} />
                </label>

                <label style={{ fontSize: 13, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Notas adicionales
                  <textarea className="compra-input" value={form.notas} onChange={e => handleChange('notas', e.target.value)}
                    rows={3} placeholder="Color, talla, alguna indicación especial..."
                    style={{ marginTop: 6, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                </label>

                <button type="submit" disabled={saving} style={{
                  ...S, background: saving ? '#887362' : '#f28c00', color: '#181c1e',
                  minHeight: 56, fontSize: 20, fontWeight: 900, cursor: 'pointer', marginTop: 8,
                  opacity: saving ? 0.6 : 1
                }}>
                  {saving ? 'Enviando pedido...' : '🛒 Confirmar pedido'}
                </button>
              </form>

              {/* ORDER SUMMARY */}
              <div style={{ background: '#f1f4f6', border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e', padding: 24, position: 'sticky', top: 80 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#554334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                  Resumen del pedido
                </div>
                {producto.imagen && (
                  <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: 180, objectFit: 'cover', border: '2px solid #181c1e', marginBottom: 16, background: '#fff' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#181c1e' }}>{producto.nombre}</div>
                {tieneOferta && (
                  <div style={{
                    display: 'inline-block', background: '#ba1a1a', color: '#fff', fontSize: 12, fontWeight: 900,
                    padding: '4px 10px', border: '2px solid #181c1e', marginBottom: 12
                  }}>
                    -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </div>
                )}
                <div style={{ marginTop: 16, padding: '16px 0', borderTop: '2px solid #181c1e', borderBottom: '2px solid #181c1e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8, color: '#554334' }}>
                    <span>Precio unitario</span>
                    <span style={{ fontWeight: 700 }}>{formatPrice(precioFinal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8, color: '#554334' }}>
                    <span>Cantidad</span>
                    <span style={{ fontWeight: 700 }}>x{form.cantidad}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, marginTop: 12, paddingTop: 12, borderTop: '2px solid #181c1e' }}>
                    <span>Total</span>
                    <span style={{ color: tieneOferta ? '#ba1a1a' : '#181c1e' }}>{formatPrice(total)}</span>
                  </div>
                </div>
                {tieneOferta && (
                  <div style={{ fontSize: 13, color: '#887362', marginTop: 12 }}>
                    Precio normal: <span style={{ textDecoration: 'line-through', fontWeight: 700 }}>{formatPrice(producto.precioVenta)}</span>
                  </div>
                )}
              </div>

              {producto?.relacionados?.length > 0 && (
                <div style={{ marginTop: 20, background: '#ffffff', border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e', padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#f28c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    + Agregar a tu pedido
                  </div>
                  {producto.relacionados.map(rp => {
                    const rpPrecio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                    return (
                      <a key={rp.id} href={`/tienda/comprar/${rp.id}`} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                        borderBottom: '1px solid #e0e3e5', textDecoration: 'none', color: '#181c1e',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f4f6'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {rp.imagen ? (
                          <img src={rp.imagen} alt={rp.nombre} style={{ width: 44, height: 44, objectFit: 'cover', border: '2px solid #181c1e', flexShrink: 0, background: '#f1f4f6' }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: 44, height: 44, border: '2px solid #181c1e', flexShrink: 0, background: '#f1f4f6' }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rp.nombre}</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: rp.ofertaActiva && rp.ofertaPrecio ? '#ba1a1a' : '#181c1e' }}>
                            {formatPrice(rpPrecio)}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f28c00', whiteSpace: 'nowrap', flexShrink: 0 }}>Agregar →</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
