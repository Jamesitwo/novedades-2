'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ProductCard from '@/components/tienda/ProductCard';
import CountdownTimer from '@/components/tienda/CountdownTimer';
import { useAuthStore } from '@/store/authStore';
import ClientLayout from '../../ClientLayout';

export default function ProductoDetallePage() {
  const params = useParams();
  const id = params.id;
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resenas, setResenas] = useState([]);
  const [promedioResenas, setPromedioResenas] = useState(0);
  const [resenasTotal, setResenasTotal] = useState(0);
  const [distribucion, setDistribucion] = useState({});
  const [showResenaForm, setShowResenaForm] = useState(false);
  const [resenaForm, setResenaForm] = useState({ nombre: '', calificacion: 5, comentario: '' });
  const [resenaSaving, setResenaSaving] = useState(false);
  const [resenaSuccess, setResenaSuccess] = useState(false);
  const [viendoAhora] = useState(() => Math.floor(Math.random() * 4) + 1);
  const [comprado24h, setComprado24h] = useState(0);
  const [reviewConfig, setReviewConfig] = useState({ cantidad: 10, distribucion: { 5: 45, 4: 25, 3: 12, 2: 10, 1: 8 }, diasMax: 90, conComentario: 75 });
  const { usuario } = useAuthStore();
  const isAdmin = usuario?.rol === 'admin';
  const [imgActiva, setImgActiva] = useState(0);
  const [pauseCarousel, setPauseCarousel] = useState(false);
  const imgCountRef = useRef(0);
  const [tiendaConfig, setTiendaConfig] = useState({});

  useEffect(() => {
    api.get('/api/configuracion/public').then(({ data }) => setTiendaConfig(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (imgCountRef.current <= 1 || pauseCarousel) return;
    const interval = setInterval(() => setImgActiva(prev => (prev + 1) % imgCountRef.current), 3500);
    return () => clearInterval(interval);
  }, [pauseCarousel]);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/tienda/${id}`)
      .then(({ data }) => {
        setProducto(data);
        setComprado24h(data.ventasSimuladas > 10 ? Math.floor(data.ventasSimuladas * 0.15) : 1);
        try {
          const vistos = JSON.parse(localStorage.getItem('pizdo_vistos') || '[]');
          const filtrado = vistos.filter(v => v.id !== data.id);
          filtrado.unshift({ id: data.id, slug: data.slug, nombre: data.nombre || '', imagen: data.imagen || '' });
          localStorage.setItem('pizdo_vistos', JSON.stringify(filtrado.slice(0, 4)));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/resenas/${id}`)
      .then(({ data }) => { setResenas(data.resenas); setPromedioResenas(data.promedio); setResenasTotal(data.total); setDistribucion(data.distribucion); })
      .catch(() => {});
  }, [id]);

  const handleResenaSubmit = async (e) => { e.preventDefault(); if (!resenaForm.nombre.trim()) return; setResenaSaving(true);
    try { await api.post(`/api/resenas/${id}`, resenaForm); setResenaSuccess(true); setShowResenaForm(false); setResenaForm({ nombre: '', calificacion: 5, comentario: '' });
      const { data } = await api.get(`/api/resenas/${id}`); setResenas(data.resenas); setPromedioResenas(data.promedio); setResenasTotal(data.total); setDistribucion(data.distribucion);
      setTimeout(() => setResenaSuccess(false), 3000); } catch {} finally { setResenaSaving(false); } };
  const handleGenerarResenas = async () => { setResenaSaving(true);
    try { await api.post(`/api/resenas/${id}/generar`, { cantidad: reviewConfig.cantidad, distribucion: reviewConfig.distribucion, diasMax: reviewConfig.diasMax, conComentario: reviewConfig.conComentario });
      setResenaSuccess(true); const { data } = await api.get(`/api/resenas/${id}`); setResenas(data.resenas); setPromedioResenas(data.promedio); setResenasTotal(data.total); setDistribucion(data.distribucion);
      setTimeout(() => setResenaSuccess(false), 3000); } catch {} finally { setResenaSaving(false); } };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const C = { primary: '#ff8c00', primaryDark: '#904d00', text: '#0b1c30', subtext: '#564334', muted: '#897362', bg: '#f8f9ff', surface: '#fff', border: '#E2E8F0', red: '#ba1a1a', amber: '#feb700', green: '#22c55e' };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, fontSize: 16, fontWeight: 600, color: C.muted }}>Cargando producto...</div>;
  if (!producto) return <div style={{ textAlign: 'center', padding: 80, fontSize: 16, fontWeight: 600, color: C.red }}>Producto no encontrado</div>;

  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const rawImagenes = typeof producto.imagenes === 'string' ? (() => { try { return JSON.parse(producto.imagenes); } catch { return []; } })() : producto.imagenes;
  const imagenesArr = Array.isArray(rawImagenes) ? rawImagenes : [];
  const todasImagenes = [...new Set([...(typeof producto.imagen === 'string' && producto.imagen.startsWith('http') ? [producto.imagen] : []), ...imagenesArr])];
  imgCountRef.current = todasImagenes.length;
  const imagenPrincipal = todasImagenes.length > 0 ? todasImagenes[imgActiva] || todasImagenes[0] : null;

  return (
    <ClientLayout><div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) { .detalle-grid-v2 { grid-template-columns: 1fr !important; } .detalle-titulo { font-size: 22px !important; } }
      `}} />

      <a href="/" style={{ color: C.primary, textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-block', margin: '24px 0' }}>← Volver a la tienda</a>

      <div className="detalle-grid-v2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div onMouseEnter={() => setPauseCarousel(true)} onMouseLeave={() => setPauseCarousel(false)}>
          <div style={{ background: '#F8F9FA', borderRadius: 12, overflow: 'hidden', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative', minHeight: 380 }}>
            {tieneOferta && <span style={{ position: 'absolute', top: 12, left: 12, background: '#feb700', color: '#271900', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase' }}>Best Seller</span>}
            {imagenPrincipal ? (
              <img src={imagenPrincipal} alt={producto.nombre} style={{ width: '100%', maxHeight: 400, objectFit: 'contain', transition: 'transform 0.4s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
            ) : (
              <div style={{ color: C.muted, fontSize: 16, fontWeight: 500 }}>Sin imagen</div>
            )}
          </div>
          {todasImagenes.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
              {todasImagenes.map((img, i) => (
                <div key={i} onClick={() => setImgActiva(i)} style={{
                  cursor: 'pointer', background: '#F8F9FA', borderRadius: 8, overflow: 'hidden',
                  border: imgActiva === i ? '2px solid ' + C.primary : '1px solid ' + C.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8,
                  transition: 'all 0.15s', opacity: imgActiva === i ? 1 : 0.7
                }}>
                  <img src={img} alt="" style={{ width: '100%', height: 60, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.primaryDark, textTransform: 'uppercase', letterSpacing: 1 }}>Pizdo Industrial</span>
          <h1 className="detalle-titulo" style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, margin: '8px 0 12px', color: C.text, lineHeight: 1.2 }}>{producto.nombre}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: C.amber, fontSize: 16 }}>{'★'.repeat(Math.round(promedioResenas || 4.5))}{'☆'.repeat(5 - Math.round(promedioResenas || 4.5))}</span>
            <a href="#reviews" style={{ color: C.primary, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{resenasTotal || 0} reseñas</a>
          </div>

          {producto.descripcion && <p style={{ color: C.subtext, fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{producto.descripcion}</p>}

          <div style={{ marginBottom: 20 }}>
            {tieneOferta ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: C.red }}>{formatPrice(producto.ofertaPrecio)}</span>
                  <span style={{ fontSize: 16, color: C.muted, textDecoration: 'line-through' }}>{formatPrice(producto.precioVenta)}</span>
                  <span style={{ background: '#ffdad6', color: '#93000a', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>-{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}%</span>
                </div>
                {producto.ofertaHasta && <CountdownTimer endsAt={producto.ofertaHasta} />}
              </div>
            ) : (
              <span style={{ fontSize: 32, fontWeight: 800, color: C.text }}>{formatPrice(producto.precioVenta)}</span>
            )}
          </div>

          {producto.stock > 0 && producto.stock <= 5 && (
            <div style={{ color: '#ba1a1a', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>¡Solo quedan {producto.stock} unidades!</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <a href={`/comprar/${producto.id}`} onClick={() => window.dispatchEvent(new Event('pizdo-cart-add'))} style={{
              flex: 1, minHeight: 48, background: C.primary, color: '#fff', border: 'none', borderRadius: 8,
              fontWeight: 700, fontSize: 16, cursor: 'pointer', textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255,140,0,0.3)', transition: 'transform 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              🛒 Comprar ahora
            </a>
          </div>

          <div style={{ background: '#e5eeff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🚚</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                  {producto.envioGratis
                    ? (tiendaConfig.envio_texto || '✅ ¡Envío gratis!')
                    : producto.envioCosto
                      ? `Envío: ${formatPrice(producto.envioCosto)}`
                      : producto.precioVenta >= 100000
                        ? (tiendaConfig.envio_texto || '✅ ¡Envío gratis!')
                        : `Te faltan ${formatPrice(100000 - (tieneOferta ? producto.ofertaPrecio : producto.precioVenta))} para envío gratis`}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{tiendaConfig.envio_dias || 'Entrega estimada: 2-4 días hábiles'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{tiendaConfig.garantia_titulo || '5-Year Pro Warranty'}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{tiendaConfig.garantia_texto || 'Reparaciones o reemplazo sin costo'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {producto.relacionados?.length > 0 && (
        <section style={{ marginTop: 48, borderTop: '1px solid ' + C.border, paddingTop: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, borderLeft: '4px solid #ff8c00', paddingLeft: 12, color: C.text }}>Productos relacionados</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {producto.relacionados.map(p => <ProductCard key={p.id} producto={p} />)}
          </div>
        </section>
      )}

      <section id="reviews" style={{ marginTop: 48, borderTop: '1px solid ' + C.border, paddingTop: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, borderLeft: '4px solid #ff8c00', paddingLeft: 12, color: C.text }}>
          ⭐ Reseñas ({resenasTotal})
        </h2>
        {resenasTotal > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, marginBottom: 28, background: '#eff4ff', borderRadius: 12, padding: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: C.primaryDark, lineHeight: 1 }}>{promedioResenas}</div>
              <div style={{ fontSize: 20, color: C.amber, marginTop: 4 }}>{'★'.repeat(Math.round(promedioResenas))}{'☆'.repeat(5 - Math.round(promedioResenas))}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, fontWeight: 600 }}>{resenasTotal} reseñas</div>
            </div>
            <div>
              {[5,4,3,2,1].map(star => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, width: 20 }}>{star}★</span>
                  <div style={{ flex: 1, height: 8, background: C.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${resenasTotal > 0 ? ((distribucion[star] || 0) / resenasTotal * 100) : 0}%`, height: '100%', background: C.amber, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, width: 24 }}>{distribucion[star] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {resenaSuccess && <div style={{ background: '#ffdad6', border: '1px solid ' + C.red, borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: C.red, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>✅ ¡Gracias por tu reseña!</div>}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, background: '#ffdcc3', border: '1px solid ' + C.primary, borderRadius: 12, padding: 14 }}>
            <span style={{ width: '100%', fontSize: 13, color: C.primaryDark, fontWeight: 800, marginBottom: 2 }}>🔧 Panel admin de reseñas</span>
            {!showResenaForm ? (
              <button onClick={() => setShowResenaForm(true)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✏️ Crear reseña</button>
            ) : (
              <form onSubmit={handleResenaSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Calificación:</span>
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setResenaForm({...resenaForm, calificacion: star})} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: star <= resenaForm.calificacion ? C.amber : C.muted }}>{star <= resenaForm.calificacion ? '★' : '☆'}</button>
                  ))}
                </div>
                <input type="text" placeholder="Nombre del cliente" value={resenaForm.nombre} onChange={e => setResenaForm({...resenaForm, nombre: e.target.value})} required style={{ padding: '6px 10px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 13, outline: 'none', color: C.text, background: C.surface }} />
                <textarea placeholder="Comentario (opcional)" value={resenaForm.comentario} onChange={e => setResenaForm({...resenaForm, comentario: e.target.value})} rows={2} style={{ padding: '6px 10px', border: '1px solid ' + C.border, borderRadius: 6, fontSize: 13, outline: 'none', color: C.text, resize: 'vertical', background: C.surface }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowResenaForm(false)} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: C.text }}>Cancelar</button>
                  <button type="submit" disabled={resenaSaving} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{resenaSaving ? 'Enviando...' : 'Publicar'}</button>
                </div>
              </form>
            )}
            <div style={{ width: '100%', borderTop: '1px solid ' + C.border, paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: C.primaryDark, textTransform: 'uppercase', marginBottom: 2 }}>Cantidad</div>
                <input type="number" min="1" max="50" value={reviewConfig.cantidad} onChange={e => setReviewConfig(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 10 }))}
                  style={{ width: '100%', padding: '4px 6px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 12, outline: 'none', color: C.text, background: C.surface }} />
              </div>
              <div><div style={{ fontSize: 10, fontWeight: 700, color: C.primaryDark, textTransform: 'uppercase', marginBottom: 2 }}>Días atrás</div>
                <input type="number" min="1" max="365" value={reviewConfig.diasMax} onChange={e => setReviewConfig(prev => ({ ...prev, diasMax: parseInt(e.target.value) || 90 }))}
                  style={{ width: '100%', padding: '4px 6px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 12, outline: 'none', color: C.text, background: C.surface }} />
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ width: '100%', fontSize: 10, fontWeight: 700, color: C.primaryDark, textTransform: 'uppercase' }}>Distribución (%)</span>
              {[5,4,3,2,1].map(star => (
                <label key={star} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: C.text }}>
                  {star}★
                  <input type="number" min="0" max="100" value={reviewConfig.distribucion[star]} onChange={e => setReviewConfig(prev => ({ ...prev, distribucion: { ...prev.distribucion, [star]: parseInt(e.target.value) || 0 } }))}
                    style={{ width: 40, padding: '2px 4px', border: '1px solid ' + C.border, borderRadius: 4, fontSize: 11, outline: 'none', textAlign: 'center', color: C.text, background: C.surface }} />
                </label>
              ))}
            </div>
            <button onClick={handleGenerarResenas} disabled={resenaSaving} style={{ background: '#2D2D2D', color: '#ffb77d', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              🎲 Generar {reviewConfig.cantidad} reseñas
            </button>
          </div>
        )}
        {resenas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resenas.map(r => (
              <div key={r.id} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.nombre}</span>
                  <span style={{ color: C.amber, fontSize: 16 }}>{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</span>
                </div>
                {r.comentario && <p style={{ color: C.subtext, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{r.comentario}</p>}
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontWeight: 500 }}>{new Date(r.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: C.muted, padding: 30, border: '1px dashed ' + C.border, borderRadius: 10, fontSize: 14, fontWeight: 500 }}>Sé el primero en dejar una reseña</div>
        )}
      </section>

      {producto.landingConfig && (() => {
        const lc = typeof producto.landingConfig === 'string' ? JSON.parse(producto.landingConfig) : producto.landingConfig;
        const sections = [
          { key: 'beneficios', icon: '✨', defaultTitle: 'Beneficios' },
          { key: 'autoridad', icon: '🏆', defaultTitle: 'Certificaciones' },
          { key: 'testimonios', icon: '💬', defaultTitle: 'Testimonios' },
          { key: 'modoUso', icon: '📋', defaultTitle: 'Modo de Uso' },
          { key: 'logistica', icon: '🚚', defaultTitle: 'Envío y Entrega' },
          { key: 'faq', icon: '❓', defaultTitle: 'Preguntas Frecuentes' },
          { key: 'oferta', icon: '🔥', defaultTitle: 'Oferta Especial' }
        ];
        return sections.filter(s => lc[s.key]?.enabled).map(s => (
          <section key={s.key} style={{ marginTop: 48, borderTop: '1px solid ' + C.border, paddingTop: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, borderLeft: '4px solid #ff8c00', paddingLeft: 12, color: C.text }}>
              {s.icon} {lc[s.key].titulo || s.defaultTitle}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: lc[s.key].imagen ? '1fr 1fr' : '1fr', gap: 32, alignItems: 'center' }}>
              <div>
                {lc[s.key].contenido?.split('\n').map((p, i) => (
                  <p key={i} style={{ color: C.subtext, fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>{p}</p>
                ))}
              </div>
              {lc[s.key].imagen && (
                <img src={lc[s.key].imagen} alt={lc[s.key].titulo} style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 300, border: '1px solid ' + C.border }}
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
            </div>
          </section>
        ));
      })()}

    </div></ClientLayout>
  );
}
