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

  useEffect(() => {
    if (productos.length === 0) return;
    const generateNotification = () => {
      const randomProduct = productos[Math.floor(Math.random() * productos.length)];
      const mins = Math.floor(Math.random() * 45) + 1;
      setProofEvents(prev => [...prev.slice(-5), {
        id: Date.now() + Math.random(),
        mensaje: `Alguien compró "${randomProduct.nombre.substring(0, 30)}${randomProduct.nombre.length > 30 ? '...' : ''}"`,
        hace: `${mins} min`
      }]);
    };
    const interval = setInterval(generateNotification, 15000 + Math.random() * 20000);
    return () => clearInterval(interval);
  }, [productos]);

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        .industrial-border { box-shadow: 4px 4px 0px 0px #181c1e; }
        .industrial-border:hover { box-shadow: 6px 6px 0px 0px #181c1e; transform: translate(-2px, -2px); }
        .cat-card { transition: all 0.15s; }
        .cat-card:hover { background: #ffb875 !important; transform: translate(-2px, -2px); box-shadow: 6px 6px 0px 0px #181c1e; }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .tienda-hero { padding: 48px 16px !important; }
        }
      `}} />

      {/* HERO */}
      <section className="tienda-hero" style={{
        background: '#ebeef0', borderBottom: '4px solid #181c1e',
        padding: '64px 24px', position: 'relative', overflow: 'hidden'
      }}>
        <div className="hero-grid" style={{
          maxWidth: 1280, margin: '0 auto', display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center'
        }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900,
              lineHeight: 1.1, marginBottom: 24, color: '#181c1e',
              letterSpacing: -1
            }}>
              Herramientas fáciles de usar para tu hogar
            </h1>
            <p style={{ fontSize: 20, marginBottom: 32, maxWidth: 500, color: '#554334', lineHeight: 1.6 }}>
              Diseñadas para durar, pensadas para la comodidad. En Pizdo, creemos que cualquier proyecto es posible con el equipo correcto.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="#catalogo" style={{
                minHeight: 56, padding: '0 32px', background: '#f28c00', color: '#181c1e',
                border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
                fontSize: 20, fontWeight: 900, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 12,
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}>
                🔧 Explorar Catálogo
              </a>
              <a href="#ofertas" style={{
                minHeight: 56, padding: '0 32px', background: '#ffffff', color: '#181c1e',
                border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
                fontSize: 20, fontWeight: 900, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 12,
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}>
                🔥 Ver Ofertas
              </a>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -8, background: '#f28c00',
              transform: 'rotate(-1deg)', boxShadow: '4px 4px 0px 0px #181c1e'
            }} />
            <img
              src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600"
              alt="Herramientas industriales Pizdo"
              style={{ position: 'relative', width: '100%', height: 350, objectFit: 'cover', border: '2px solid #181c1e' }}
            />
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section style={{ padding: '64px 24px', background: '#f7fafc' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 48, borderLeft: '8px solid #8d4f00', paddingLeft: 16 }}>
            Categorías destacadas
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            {['Herramientas', 'Electrónica', 'Hogar', 'Deportes', 'Oficina', 'Belleza'].slice(0, 3).map((cat, i) => {
              const iconos = ['🔧', '📱', '🏠'];
              const descs = ['Mantén tu espacio impecable con nuestra selección profesional.', 'Tecnología de punta para tu día a día.', 'Todo para hacer de tu casa un hogar.'];
              return (
                <a key={cat} href={`/tienda?categoria=${cat}`} className="cat-card"
                  onClick={e => { e.preventDefault(); setCategoria(cat); }}
                  style={{
                    textDecoration: 'none', color: '#181c1e', display: 'block',
                    padding: 32, background: '#f1f4f6', border: '2px solid #181c1e',
                    boxShadow: '4px 4px 0px 0px #181c1e'
                  }}>
                  <div style={{
                    width: 64, height: 64, background: '#f28c00', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 24, border: '2px solid #181c1e', fontSize: 28
                  }}>
                    {iconos[i]}
                  </div>
                  <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{cat}</h3>
                  <p style={{ fontSize: 18, color: '#554334', marginBottom: 24 }}>{descs[i]}</p>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#8d4f00', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Ver todo <span>→</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* MÁS BUSCADOS */}
      <section style={{ padding: '64px 24px', background: '#2d3133', color: '#eef1f3' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#ffb875', marginBottom: 8, textTransform: 'uppercase', letterSpacing: -1 }}>
                Los más buscados
              </h2>
              <p style={{ fontSize: 20, color: '#e0e3e5' }}>Nuestras herramientas estrella, calificadas por profesionales.</p>
            </div>
            <a href="#catalogo" style={{ fontSize: 18, fontWeight: 700, color: '#ffb875', textDecoration: 'underline' }}>
              Ver toda la selección
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {destacados.slice(0, 4).map(p => <ProductCard key={p.id} producto={p} />)}
          </div>
        </div>
      </section>

      {/* OFERTAS RELÁMPAGO */}
      {ofertas.length > 0 && (
        <section id="ofertas" style={{ padding: '64px 24px', background: '#f7fafc' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#ba1a1a', marginBottom: 8 }}>
                🔥 Ofertas relámpago
              </h2>
              <p style={{ fontSize: 20, color: '#554334' }}>Por tiempo limitado — no dejes pasar estas oportunidades</p>
            </div>
            <div className="tienda-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {ofertas.map(p => (
                <div key={p.id} style={{
                  background: '#ffffff', border: '2px solid #ba1a1a',
                  boxShadow: '4px 4px 0px 0px #ba1a1a', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ position: 'relative', height: 220, overflow: 'hidden', borderBottom: '2px solid #ba1a1a', background: '#f1f4f6' }}>
                    {p.imagen ? (
                      <a href={`/tienda/${p.id}`}>
                        <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }} />
                      </a>
                    ) : null}
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      background: '#ba1a1a', color: '#ffffff', fontSize: 14, fontWeight: 900,
                      padding: '4px 12px', border: '2px solid #181c1e'
                    }}>
                      -{Math.round((1 - p.ofertaPrecio / p.precioVenta) * 100)}% OFF
                    </div>
                    {p.ofertaHasta && (
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        <CountdownTimer endsAt={p.ofertaHasta} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <a href={`/tienda/${p.id}`} style={{ textDecoration: 'none', color: '#181c1e', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                      {p.nombre}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: '#ba1a1a' }}>
                        {formatPrice(p.ofertaPrecio)}
                      </span>
                      <span style={{ fontSize: 16, color: '#887362', textDecoration: 'line-through', fontWeight: 700 }}>
                        {formatPrice(p.precioVenta)}
                      </span>
                    </div>
                    {p.stock > 0 && p.stock <= 5 && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#ba1a1a', marginBottom: 12 }}>
                        ⚡ Solo quedan {p.stock}
                      </div>
                    )}
                    {p.ventasSimuladas > 0 && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#8d4f00', marginBottom: 12 }}>
                        🔥 {p.ventasSimuladas} personas lo compraron
                      </div>
                    )}
                    {p.linkCompra && (
                      <a href={p.linkCompra} target="_blank" rel="noopener" style={{
                        minHeight: 56, background: '#f28c00', color: '#181c1e',
                        border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
                        textDecoration: 'none', fontWeight: 900, fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: 'auto', transition: 'transform 0.1s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #181c1e'; }}>
                        ¡Comprar ahora!
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATÁLOGO */}
      <section id="catalogo" style={{ padding: '64px 24px', background: '#f7fafc' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, color: '#181c1e' }}>
            📦 Catálogo completo
          </h2>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32, alignItems: 'center' }}>
            <button onClick={() => setCategoria('')} style={{
              padding: '8px 20px', border: '2px solid #181c1e',
              background: !categoria ? '#f28c00' : '#ffffff',
              color: !categoria ? '#181c1e' : '#554334',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: !categoria ? '2px 2px 0px 0px #181c1e' : 'none'
            }}>
              Todos
            </button>
            {categorias.map(c => (
              <button key={c} onClick={() => setCategoria(c)} style={{
                padding: '8px 20px', border: '2px solid #181c1e',
                background: categoria === c ? '#f28c00' : '#ffffff',
                color: categoria === c ? '#181c1e' : '#554334',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: categoria === c ? '2px 2px 0px 0px #181c1e' : 'none'
              }}>
                {c}
              </button>
            ))}
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{
              marginLeft: 'auto', background: '#ffffff', border: '2px solid #181c1e',
              padding: '8px 20px', color: '#181c1e', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '2px 2px 0px 0px #181c1e', minHeight: 44
            }}>
              <option value="reciente">Más recientes</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="ventas">Más vendidos</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 64, fontSize: 18, fontWeight: 700, color: '#887362' }}>
              Cargando catálogo...
            </div>
          ) : productos.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 64, fontSize: 18, fontWeight: 700, color: '#887362',
              border: '2px dashed #181c1e', boxShadow: '4px 4px 0px 0px #181c1e'
            }}>
              No hay productos en esta categoría.
            </div>
          ) : (
            <div className="tienda-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
              {productos.map(p => <ProductCard key={p.id} producto={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section style={{ padding: '64px 24px', background: '#f7fafc', borderTop: '4px solid #181c1e' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, background: '#f28c00', color: '#ffffff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32, border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
            transform: 'rotate(1deg)', fontSize: 32
          }}>
            ✅
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
            Únete a la Comunidad Pizdo
          </h2>
          <p style={{ fontSize: 20, color: '#554334', marginBottom: 48, lineHeight: 1.6 }}>
            Recibe guías de reparación, consejos de jardinería y ofertas exclusivas directamente en tu correo. Sin spam, solo herramientas.
          </p>
          <div style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto' }}>
            <input
              type="email" placeholder="tu@email.com"
              style={{
                flex: 1, minHeight: 56, padding: '0 20px', fontSize: 18, fontWeight: 700,
                border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
                outline: 'none', background: '#ffffff'
              }}
            />
            <button style={{
              minHeight: 56, padding: '0 24px', background: '#181c1e', color: '#ffffff',
              border: '2px solid #181c1e', fontSize: 20, fontWeight: 900, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'transform 0.1s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
              Suscribirse
            </button>
          </div>
        </div>
      </section>

      {/* Social proof floating toasts */}
      {proofEvents.map(evt => (
        <SocialProofToast key={evt.id} data={evt} onDone={() => setProofEvents(prev => prev.filter(e => e.id !== evt.id))} />
      ))}
    </div>
  );
}
