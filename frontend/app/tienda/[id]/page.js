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

  useEffect(() => {
    if (!id) return;
    api.get(`/api/tienda/${id}`)
      .then(({ data }) => setProducto(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
    </div>
  );
}
