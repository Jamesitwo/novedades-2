'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ProductCard from '../../../components/tienda/ProductCard';
import CountdownTimer from '../../../components/tienda/CountdownTimer';
import { useAuthStore } from '@/store/authStore';

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
  const { usuario } = useAuthStore();
  const isAdmin = usuario?.rol === 'admin';

  useEffect(() => {
    if (!id) return;
    api.get(`/api/tienda/${id}`)
      .then(({ data }) => setProducto(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/resenas/${id}`)
      .then(({ data }) => {
        setResenas(data.resenas);
        setPromedioResenas(data.promedio);
        setResenasTotal(data.total);
        setDistribucion(data.distribucion);
      })
      .catch(() => {});
  }, [id]);

  const handleResenaSubmit = async (e) => {
    e.preventDefault();
    if (!resenaForm.nombre.trim()) return;
    setResenaSaving(true);
    try {
      await api.post(`/api/resenas/${id}`, resenaForm);
      setResenaSuccess(true);
      setShowResenaForm(false);
      setResenaForm({ nombre: '', calificacion: 5, comentario: '' });
      const { data } = await api.get(`/api/resenas/${id}`);
      setResenas(data.resenas);
      setPromedioResenas(data.promedio);
      setResenasTotal(data.total);
      setDistribucion(data.distribucion);
      setTimeout(() => setResenaSuccess(false), 3000);
    } catch (e) {
    } finally {
      setResenaSaving(false);
    }
  };

  const handleGenerarResenas = async () => {
    setResenaSaving(true);
    try {
      await api.post(`/api/resenas/${id}/generar`, { cantidad: 10 });
      setResenaSuccess(true);
      const { data } = await api.get(`/api/resenas/${id}`);
      setResenas(data.resenas);
      setPromedioResenas(data.promedio);
      setResenasTotal(data.total);
      setDistribucion(data.distribucion);
      setTimeout(() => setResenaSuccess(false), 3000);
    } catch (e) {
    } finally {
      setResenaSaving(false);
    }
  };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const S = { border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e' };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, fontSize: 18, fontWeight: 700, color: '#887362' }}>Cargando producto...</div>;
  if (!producto) return <div style={{ textAlign: 'center', padding: 80, fontSize: 18, fontWeight: 700, color: '#ba1a1a' }}>Producto no encontrado</div>;

  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 64px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .detalle-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .detalle-titulo { font-size: 24px !important; }
          .detalle-desc { font-size: 16px !important; }
          .detalle-precio { font-size: 28px !important; }
          .detalle-btn { font-size: 18px !important; min-height: 56px !important; }
          .detalle-related-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
        }
        @media (max-width: 480px) {
          .detalle-titulo { font-size: 20px !important; }
          .detalle-precio { font-size: 24px !important; }
          .detalle-btn { font-size: 16px !important; min-height: 52px !important; }
        }
      `}} />
      <a href="/tienda" style={{
        color: '#8d4f00', textDecoration: 'none', fontSize: 18, fontWeight: 700,
        display: 'inline-block', margin: '32px 0 24px'
      }}>
        ← Volver a la tienda
      </a>

      <div className="detalle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 8 }}>
        <div>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre}
              style={{ width: '100%', border: '2px solid #181c1e', boxShadow: '6px 6px 0px 0px #181c1e', objectFit: 'cover', background: '#f1f4f6', maxHeight: 450 }} />
          ) : (
            <div style={{ width: '100%', height: 400, background: '#f1f4f6', border: '2px solid #181c1e', boxShadow: '6px 6px 0px 0px #181c1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#887362' }}>
              Sin imagen
            </div>
          )}
          {imagenes.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {imagenes.map((img, i) => (
                <img key={i} src={img} alt={`${producto.nombre} ${i+1}`}
                  style={{ width: 80, height: 80, objectFit: 'cover', border: '2px solid #181c1e', cursor: 'pointer', background: '#f1f4f6' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ))}
            </div>
          )}
        </div>

        <div>
          <span style={{
            display: 'inline-block', fontSize: 14, fontWeight: 900, color: '#f28c00',
            textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12
          }}>
            {producto.categoria}
          </span>

          <h1 className="detalle-titulo" style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 900, color: '#181c1e', margin: '0 0 16px', lineHeight: 1.2 }}>
            {producto.nombre}
          </h1>

          {producto.descripcion && (
            <p className="detalle-desc" style={{ color: '#554334', fontSize: 'clamp(16px, 2.5vw, 18px)', lineHeight: 1.6, marginBottom: 24 }}>
              {producto.descripcion}
            </p>
          )}

          <div style={{ background: '#f1f4f6', border: '2px solid #181c1e', padding: 24, marginBottom: 24 }}>
            {tieneOferta ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#ba1a1a', color: '#ffffff', fontSize: 14, fontWeight: 900,
                    padding: '4px 12px', border: '2px solid #181c1e'
                  }}>
                    -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </span>
                  <CountdownTimer endsAt={producto.ofertaHasta} />
                </div>
                <div className="detalle-precio" style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: '#ba1a1a', marginBottom: 4 }}>
                  {formatPrice(producto.ofertaPrecio)}
                </div>
                <div style={{ fontSize: 20, color: '#887362', textDecoration: 'line-through', fontWeight: 700 }}>
                  {formatPrice(producto.precioVenta)}
                </div>
              </>
            ) : (
              <div className="detalle-precio" style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: '#181c1e' }}>
                {formatPrice(producto.precioVenta)}
              </div>
            )}
          </div>

          {producto.stock > 0 ? (
            producto.stock <= 5 ? (
              <div style={{ color: '#ba1a1a', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                🔥 ¡Solo quedan {producto.stock} en stock!
              </div>
            ) : (
              <div style={{ color: '#8d4f00', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                ✅ {producto.stock} disponibles
              </div>
            )
          ) : (
            <div style={{ color: '#ba1a1a', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              ❌ Agotado temporalmente
            </div>
          )}

          {producto.ventasSimuladas > 0 && (
            <div style={{
              background: '#ffdcc0', border: '2px solid #8d4f00',
              padding: '12px 20px', marginBottom: 20, fontSize: 16, fontWeight: 700, color: '#5a3100'
            }}>
              🔥 <strong>{producto.ventasSimuladas}</strong> personas ya compraron este producto
            </div>
          )}

          <a href={`/tienda/comprar/${producto.id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            minHeight: 'clamp(52px, 8vw, 64px)', background: tieneOferta ? '#ba1a1a' : '#f28c00',
            color: '#ffffff', fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 900, textDecoration: 'none',
            border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
            transition: 'transform 0.1s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}>
            🛒 {tieneOferta ? '¡Aprovechar oferta ahora!' : 'Comprar ahora'}
          </a>
        </div>
      </div>

      {producto.relacionados && producto.relacionados.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#181c1e', borderLeft: '8px solid #8d4f00', paddingLeft: 16 }}>
            Productos relacionados
          </h2>
          <div className="detalle-related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
            {producto.relacionados.map(p => <ProductCard key={p.id} producto={p} />)}
          </div>
        </section>
      )}

      <section style={{ marginTop: 64, paddingTop: 32, borderTop: '2px solid #181c1e' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#181c1e', borderLeft: '8px solid #8d4f00', paddingLeft: 16 }}>
          ⭐ Reseñas ({resenasTotal})
        </h2>

        {resenasTotal > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, marginBottom: 32,
            background: '#f1f4f6', border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e', padding: 24
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#8d4f00', lineHeight: 1 }}>
                {promedioResenas}
              </div>
              <div style={{ fontSize: 24, color: '#8d4f00', marginTop: 4 }}>
                {'★'.repeat(Math.round(promedioResenas))}{'☆'.repeat(5 - Math.round(promedioResenas))}
              </div>
              <div style={{ fontSize: 14, color: '#887362', marginTop: 8, fontWeight: 700 }}>{resenasTotal} reseñas</div>
            </div>
            <div>
              {[5,4,3,2,1].map(star => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#554334', width: 28 }}>{star}★</span>
                  <div style={{ flex: 1, height: 12, background: '#ffffff', border: '1px solid #181c1e' }}>
                    <div style={{
                      width: `${resenasTotal > 0 ? ((distribucion[star] || 0) / resenasTotal * 100) : 0}%`,
                      height: '100%', background: '#f28c00', transition: 'width 0.5s'
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#887362', width: 28 }}>{distribucion[star] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {resenaSuccess && (
          <div style={{
            background: '#ffdad6', border: '2px solid #ba1a1a', boxShadow: '3px 3px 0px 0px #181c1e',
            padding: '12px 20px', marginBottom: 20, color: '#ba1a1a', fontSize: 16, fontWeight: 700, textAlign: 'center'
          }}>
            ✅ ¡Gracias por tu reseña!
          </div>
        )}

        {isAdmin && (
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20,
            background: '#ffdcc0', border: '2px solid #f28c00', boxShadow: '3px 3px 0px 0px #181c1e',
            padding: 16
          }}>
            <span style={{ width: '100%', fontSize: 14, color: '#5a3100', fontWeight: 900, marginBottom: 2 }}>
              🔧 Panel admin de reseñas
            </span>
            {!showResenaForm ? (
              <button onClick={() => setShowResenaForm(true)} style={{
                background: '#f28c00', color: '#181c1e', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e',
                padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14, minHeight: 44
              }}>
                ✏️ Crear reseña
              </button>
            ) : (
              <form onSubmit={handleResenaSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#181c1e' }}>Calificación:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setResenaForm({...resenaForm, calificacion: star})} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 28,
                        color: star <= resenaForm.calificacion ? '#f28c00' : '#887362'
                      }}>
                        {star <= resenaForm.calificacion ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="text" placeholder="Nombre del cliente" value={resenaForm.nombre}
                  onChange={e => setResenaForm({...resenaForm, nombre: e.target.value})} required
                  style={{ background: '#ffffff', border: '2px solid #181c1e', padding: '10px 16px', color: '#181c1e', fontSize: 16, fontWeight: 700, outline: 'none' }} />
                <textarea placeholder="Comentario (opcional)" value={resenaForm.comentario}
                  onChange={e => setResenaForm({...resenaForm, comentario: e.target.value})} rows={2}
                  style={{ background: '#ffffff', border: '2px solid #181c1e', padding: '10px 16px', color: '#181c1e', fontSize: 16, outline: 'none', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowResenaForm(false)} style={{
                    background: '#ffffff', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e',
                    padding: '8px 16px', color: '#181c1e', cursor: 'pointer', fontWeight: 700, fontSize: 14, minHeight: 44
                  }}>Cancelar</button>
                  <button type="submit" disabled={resenaSaving} style={{
                    background: '#f28c00', color: '#181c1e', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e',
                    padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14, minHeight: 44
                  }}>{resenaSaving ? 'Enviando...' : 'Publicar'}</button>
                </div>
              </form>
            )}
            <button onClick={handleGenerarResenas} disabled={resenaSaving} style={{
              background: '#181c1e', color: '#ffb875', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e',
              padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14, minHeight: 44
            }}>
              🎲 Generar 10 reseñas
            </button>
          </div>
        )}

        {resenas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resenas.map(r => (
              <div key={r.id} style={{
                background: '#ffffff', border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e', padding: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#181c1e' }}>{r.nombre}</span>
                  <span style={{ color: '#f28c00', fontSize: 18 }}>
                    {'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}
                  </span>
                </div>
                {r.comentario && (
                  <p style={{ color: '#554334', fontSize: 16, lineHeight: 1.6, margin: 0 }}>{r.comentario}</p>
                )}
                <div style={{ fontSize: 14, color: '#887362', marginTop: 8, fontWeight: 700 }}>
                  {new Date(r.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', color: '#887362', padding: 40, fontSize: 16, fontWeight: 700,
            border: '2px dashed #181c1e', boxShadow: '4px 4px 0px 0px #181c1e'
          }}>
            Sé el primero en dejar una reseña
          </div>
        )}
      </section>
    </div>
  );
}
