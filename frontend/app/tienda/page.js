'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import ProductCard from '../../components/tienda/ProductCard';
import CountdownTimer from '../../components/tienda/CountdownTimer';
import SocialProofToast from '../../components/tienda/SocialProofToast';
import { on } from '@/lib/websocket';

export default function TiendaPage() {
  const [productos, setProductos] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [orden, setOrden] = useState('reciente');
  const [loading, setLoading] = useState(true);
  const [proofEvents, setProofEvents] = useState([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ limit: 50, orden });
      if (categoria) params.append('categoria', categoria);
      const [prodRes, destRes, ofertasRes] = await Promise.all([
        api.get(`/api/tienda?${params}`),
        api.get('/api/tienda/destacados'),
        api.get('/api/tienda/ofertas')
      ]);
      setProductos(prodRes.data.productos);
      setCategorias(prodRes.data.categorias || []);
      setDestacados(destRes.data);
      setOfertas(ofertasRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [categoria, orden]);

  useEffect(() => {
    const unsub = on('tienda:compra-simulada', (data) => {
      setProofEvents(prev => [...prev.slice(-4), { ...data, id: Date.now() + Math.random() }]);
    });
    return () => unsub();
  }, []);

  const formatPrice = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  return (
    <div>
      {/* Hero */}
      <section style={{
        textAlign: 'center', padding: '60px 16px 48px',
        background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
        borderRadius: 20, marginBottom: 40, color: '#fff'
      }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: -1 }}>
          🛍️ Descubre productos ganadores
        </h1>
        <p style={{ fontSize: 16, opacity: 0.85, maxWidth: 500, margin: '0 auto 24px' }}>
          Explora nuestro catálogo curado con los mejores productos. Ofertas por tiempo limitado.
        </p>
        <a href="#ofertas" style={{
          background: '#fff', color: 'var(--accent)', padding: '12px 32px', borderRadius: 30,
          textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-block',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
        }}>
          Ver ofertas 🔥
        </a>
      </section>

      {/* Destacados */}
      {destacados.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
            ⭐ Productos destacados
          </h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {destacados.map(p => (
              <div key={p.id} style={{ minWidth: 280, maxWidth: 320 }}>
                <ProductCard producto={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ofertas */}
      {ofertas.length > 0 && (
        <section id="ofertas" style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>🔥 Ofertas relámpago</h2>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Por tiempo limitado</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {ofertas.map(p => (
              <div key={p.id} style={{
                background: 'var(--bg2)', border: '2px solid var(--red)', borderRadius: 14,
                padding: 16, display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 8
                  }}>
                    -{Math.round((1 - p.ofertaPrecio / p.precioVenta) * 100)}% OFF
                  </span>
                  {p.ofertaHasta && <CountdownTimer endsAt={p.ofertaHasta} />}
                </div>
                {p.imagen && (
                  <a href={`/tienda/${p.id}`}>
                    <img src={p.imagen} alt={p.nombre}
                      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, background: 'var(--bg3)' }}
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  </a>
                )}
                <a href={`/tienda/${p.id}`} style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
                  {p.nombre}
                </a>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--red)' }}>
                    {formatPrice(p.ofertaPrecio)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'line-through', fontFamily: 'var(--mono)' }}>
                    {formatPrice(p.precioVenta)}
                  </span>
                </div>
                {p.stock > 0 && p.stock <= 5 && (
                  <div style={{ color: 'var(--red)', fontSize: 11, fontWeight: 600 }}>
                    ⚡ Solo quedan {p.stock}
                  </div>
                )}
                {p.ventasSimuladas > 0 && (
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>🔥 {p.ventasSimuladas} personas lo compraron</div>
                )}
                {p.linkCompra && (
                  <a href={p.linkCompra} target="_blank" rel="noopener" style={{
                    background: 'var(--red)', color: '#fff', textAlign: 'center', padding: '10px',
                    borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13, marginTop: 'auto'
                  }}>
                    ¡Comprar ahora!
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
          📦 Catálogo completo
        </h2>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={() => setCategoria('')} style={{
            padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)',
            background: !categoria ? 'var(--accent)' : 'var(--bg3)',
            color: !categoria ? '#fff' : 'var(--text2)', fontSize: 12, cursor: 'pointer', fontWeight: 500
          }}>Todos</button>
          {categorias.map(c => (
            <button key={c} onClick={() => setCategoria(c)} style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)',
              background: categoria === c ? 'var(--accent)' : 'var(--bg3)',
              color: categoria === c ? '#fff' : 'var(--text2)', fontSize: 12, cursor: 'pointer', fontWeight: 500
            }}>{c}</button>
          ))}
          <select value={orden} onChange={e => setOrden(e.target.value)} style={{
            marginLeft: 'auto', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '6px 14px', color: 'var(--text)', fontSize: 12, cursor: 'pointer'
          }}>
            <option value="reciente">Más recientes</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="ventas">Más vendidos</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando catálogo...</div>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 14 }}>
            No hay productos en esta categoría.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {productos.map(p => <ProductCard key={p.id} producto={p} />)}
          </div>
        )}
      </section>

      {/* Social proof floating toasts */}
      {proofEvents.map(evt => (
        <SocialProofToast key={evt.id} data={evt} onDone={() => setProofEvents(prev => prev.filter(e => e.id !== evt.id))} />
      ))}
    </div>
  );
}
