'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ProductCard from '../../../components/tienda/ProductCard';
import CountdownTimer from '../../../components/tienda/CountdownTimer';

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

  const formatPrice = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)' }}>Cargando producto...</div>;
  if (!producto) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--red)' }}>Producto no encontrado</div>;

  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <a href="/tienda" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13, marginBottom: 20, display: 'inline-block' }}>
        ← Volver a la tienda
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 16 }}>
        <div>
          {producto.imagen && (
            <img src={producto.imagen} alt={producto.nombre}
              style={{ width: '100%', borderRadius: 14, background: 'var(--bg3)', objectFit: 'cover', maxHeight: 400 }} />
          )}
          {imagenes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {imagenes.map((img, i) => (
                <img key={i} src={img} alt={`${producto.nombre} ${i+1}`}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, background: 'var(--bg3)', cursor: 'pointer' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ))}
            </div>
          )}
        </div>

        <div>
          <span style={{
            display: 'inline-block', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '3px 12px', fontSize: 11, color: 'var(--text3)', marginBottom: 12
          }}>{producto.categoria}</span>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.3 }}>
            {producto.nombre}
          </h1>

          {producto.descripcion && (
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              {producto.descripcion}
            </p>
          )}

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            {tieneOferta ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '4px 12px', borderRadius: 8
                  }}>
                    -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
                  </span>
                  <CountdownTimer endsAt={producto.ofertaHasta} />
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--red)' }}>
                  {formatPrice(producto.ofertaPrecio)}
                </div>
                <div style={{ fontSize: 16, color: 'var(--text3)', textDecoration: 'line-through', fontFamily: 'var(--mono)', marginTop: 4 }}>
                  {formatPrice(producto.precioVenta)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                {formatPrice(producto.precioVenta)}
              </div>
            )}
          </div>

          {producto.stock > 0 ? (
            producto.stock <= 5 ? (
              <div style={{ color: 'var(--red)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                🔥 ¡Solo quedan {producto.stock} en stock!
              </div>
            ) : (
              <div style={{ color: 'var(--green)', fontSize: 13, marginBottom: 16 }}>
                ✅ {producto.stock} disponibles
              </div>
            )
          ) : (
            <div style={{ color: 'var(--red)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
              ❌ Agotado temporalmente
            </div>
          )}

          {producto.ventasSimuladas > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13
            }}>
              🔥 <strong>{producto.ventasSimuladas}</strong> personas ya compraron este producto
            </div>
          )}

          {producto.linkCompra && (
            <a href={producto.linkCompra} target="_blank" rel="noopener" style={{
              display: 'block', background: tieneOferta ? 'var(--red)' : 'var(--accent)',
              color: '#fff', textAlign: 'center', padding: '14px', borderRadius: 12,
              textDecoration: 'none', fontWeight: 700, fontSize: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s'
            }}>
              {tieneOferta ? '⚡ ¡Aprovechar oferta ahora!' : '🛒 Comprar ahora'}
            </a>
          )}
        </div>
      </div>

      {/* Relacionados */}
      {producto.relacionados && producto.relacionados.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
            Productos relacionados
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {producto.relacionados.map(p => <ProductCard key={p.id} producto={p} />)}
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>
          ⭐ Reseñas ({resenasTotal})
        </h3>

        {resenasTotal > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, marginBottom: 24,
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--amber)', lineHeight: 1 }}>
                {promedioResenas}
              </div>
              <div style={{ fontSize: 16, color: 'var(--amber)', marginTop: 4 }}>
                {'★'.repeat(Math.round(promedioResenas))}{'☆'.repeat(5 - Math.round(promedioResenas))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{resenasTotal} reseñas</div>
            </div>
            <div>
              {[5,4,3,2,1].map(star => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', width: 18 }}>{star}★</span>
                  <div style={{
                    flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${resenasTotal > 0 ? ((distribucion[star] || 0) / resenasTotal * 100) : 0}%`,
                      height: '100%', background: 'var(--amber)', borderRadius: 4, transition: 'width 0.5s'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', width: 24 }}>{distribucion[star] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {resenaSuccess && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: 10,
            padding: '10px 16px', marginBottom: 16, color: 'var(--green)', fontSize: 13, textAlign: 'center'
          }}>
            ✅ ¡Gracias por tu reseña!
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          {!showResenaForm ? (
            <button onClick={() => setShowResenaForm(true)} style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}>
              ✏️ Escribir reseña
            </button>
          ) : (
            <form onSubmit={handleResenaSubmit} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Calificación:</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setResenaForm({...resenaForm, calificacion: star})} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 24,
                      color: star <= resenaForm.calificacion ? 'var(--amber)' : 'var(--text3)',
                      transition: 'color 0.15s'
                    }}>
                      {star <= resenaForm.calificacion ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Tu nombre"
                value={resenaForm.nombre}
                onChange={e => setResenaForm({...resenaForm, nombre: e.target.value})}
                required
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none'
                }}
              />
              <textarea
                placeholder="Cuéntanos tu experiencia (opcional)"
                value={resenaForm.comentario}
                onChange={e => setResenaForm({...resenaForm, comentario: e.target.value})}
                rows={3}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowResenaForm(false)} style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 16px', color: 'var(--text2)', cursor: 'pointer', fontSize: 13
                }}>Cancelar</button>
                <button type="submit" disabled={resenaSaving} style={{
                  background: 'var(--accent)', border: 'none', borderRadius: 8,
                  padding: '8px 16px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13
                }}>{resenaSaving ? 'Enviando...' : 'Publicar reseña'}</button>
              </div>
            </form>
          )}
        </div>

        {resenas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resenas.map(r => (
              <div key={r.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{r.nombre}</span>
                  <span style={{ color: 'var(--amber)', fontSize: 14 }}>
                    {'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}
                  </span>
                </div>
                {r.comentario && (
                  <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{r.comentario}</p>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                  {new Date(r.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 30, border: '1px dashed var(--border)', borderRadius: 12 }}>
            Sé el primero en dejar una reseña
          </div>
        )}
      </section>
    </div>
  );
}
