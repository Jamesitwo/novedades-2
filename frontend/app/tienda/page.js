'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProductCard from '../../components/tienda/ProductCard';
import CountdownTimer from '../../components/tienda/CountdownTimer';
import SocialProofToast from '../../components/tienda/SocialProofToast';
import UpsellPopup from '../../components/tienda/UpsellPopup';
import { on } from '@/lib/websocket';

export default function TiendaPage() {
  const router = useRouter();
  const [productos, setProductos] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [orden, setOrden] = useState('reciente');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [proofEvents, setProofEvents] = useState([]);
  const [error, setError] = useState('');
  const [upsellProductId, setUpsellProductId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('search') || '';
    setSearch(s);
    if (s) setCategoria('');
  }, []);

  const fetchData = async () => {
    try {
      setError('');
      const params = new URLSearchParams({ limit: 50, orden });
      if (categoria) params.append('categoria', categoria);
      if (search) params.append('search', search);
      console.log('[TIENDA] fetching...', categoria, orden, search);
      const [prodRes, destRes, ofertasRes] = await Promise.all([
        api.get(`/api/tienda?${params}`),
        api.get('/api/tienda/destacados'),
        api.get('/api/tienda/ofertas')
      ]);
      setProductos(prodRes.data?.productos || []);
      setCategorias(prodRes.data?.categorias || []);
      setDestacados(Array.isArray(destRes.data) ? destRes.data : []);
      setOfertas(Array.isArray(ofertasRes.data) ? ofertasRes.data : []);
    } catch (e) {
      console.error('[TIENDA] error:', e);
      setError(e.response?.data?.error || e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [categoria, orden, search]);

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
          .tienda-hero { padding: 40px 16px !important; }
          .tienda-hero h1 { font-size: 26px !important; }
          .tienda-hero p { font-size: 16px !important; }
          .tienda-hero a, .tienda-hero button { font-size: 16px !important; min-height: 48px !important; padding: 0 20px !important; }
          .tienda-hero img { height: 240px !important; }
          .tienda-cats { grid-template-columns: 1fr !important; }
          .tienda-cat-card { padding: 24px !important; }
          .tienda-cat-card h3 { font-size: 22px !important; }
          .tienda-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; gap: 12px !important; }
          .tienda-section { padding: 40px 16px !important; }
          .tienda-section h2 { font-size: 24px !important; }
          .tienda-filters { gap: 4px !important; }
          .tienda-filters button, .tienda-filters select { font-size: 13px !important; padding: 6px 12px !important; }
          .tienda-newsletter-form { flex-direction: column !important; }
          .tienda-newsletter-form input { min-height: 52px !important; font-size: 16px !important; }
          .tienda-newsletter-form button { min-height: 52px !important; font-size: 18px !important; }
          .tienda-offers-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .tienda-hero h1 { font-size: 22px !important; }
          .tienda-hero p { font-size: 15px !important; }
          .tienda-hero a, .tienda-hero button { font-size: 14px !important; min-height: 44px !important; padding: 0 16px !important; }
          .tienda-hero img { height: 200px !important; }
          .tienda-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .tienda-section h2 { font-size: 20px !important; padding-left: 10px !important; border-left-width: 5px !important; }
          .tienda-section { padding: 28px 12px !important; }
          .tienda-cat-card h3 { font-size: 20px !important; }
          .tienda-cat-card p { font-size: 15px !important; }
        }
      `}} />

      {/* HERO */}
      <section className="tienda-hero tienda-section" style={{
        background: '#ebeef0', borderBottom: '4px solid #181c1e',
        padding: 'clamp(40px, 8vw, 64px) 24px', position: 'relative', overflow: 'hidden'
      }}>
        <div className="hero-grid" style={{
          maxWidth: 1280, margin: '0 auto', display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center'
        }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <h1 style={{
              fontSize: 'clamp(22px, 5vw, 48px)', fontWeight: 900,
              lineHeight: 1.1, marginBottom: 24, color: '#181c1e',
              letterSpacing: -1
            }}>
              Herramientas fáciles de usar para tu hogar
            </h1>
            <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', marginBottom: 32, maxWidth: 500, color: '#554334', lineHeight: 1.6 }}>
              Diseñadas para durar, pensadas para la comodidad. En Pizdo, creemos que cualquier proyecto es posible con el equipo correcto.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#catalogo" style={{
                minHeight: 'clamp(44px, 7vw, 56px)', padding: '0 clamp(16px, 3vw, 32px)', background: '#f28c00', color: '#181c1e',
                border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
                fontSize: 'clamp(14px, 2.5vw, 20px)', fontWeight: 900, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}>
                🔧 Explorar Catálogo
              </a>
              <a href="#ofertas" style={{
                minHeight: 'clamp(44px, 7vw, 56px)', padding: '0 clamp(16px, 3vw, 32px)', background: '#ffffff', color: '#181c1e',
                border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
                fontSize: 'clamp(14px, 2.5vw, 20px)', fontWeight: 900, cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
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
              style={{ position: 'relative', width: '100%', height: 'clamp(200px, 35vw, 350px)', objectFit: 'cover', border: '2px solid #181c1e' }}
            />
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="tienda-section" style={{ padding: 'clamp(28px, 8vw, 64px) 24px', background: '#f7fafc' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 700, marginBottom: 'clamp(24px, 4vw, 48px)', borderLeft: '8px solid #8d4f00', paddingLeft: 'clamp(10px, 2vw, 16px)' }}>
            Categorías destacadas
          </h2>
          <div className="tienda-cats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(16px, 3vw, 32px)' }}>
            {['Herramientas', 'Electrónica', 'Hogar', 'Deportes', 'Oficina', 'Belleza'].slice(0, 3).map((cat, i) => {
              const iconos = ['🔧', '📱', '🏠'];
              const descs = ['Mantén tu espacio impecable con nuestra selección profesional.', 'Tecnología de punta para tu día a día.', 'Todo para hacer de tu casa un hogar.'];
              return (
                <a key={cat} href={`/tienda?categoria=${cat}`} className="cat-card"
                  onClick={e => { e.preventDefault(); setCategoria(cat); }}
                  style={{
                    textDecoration: 'none', color: '#181c1e', display: 'block',
                    padding: 'clamp(24px, 4vw, 32px)', background: '#f1f4f6', border: '2px solid #181c1e',
                    boxShadow: '4px 4px 0px 0px #181c1e'
                  }}>
                  <div style={{
                    width: 64, height: 64, background: '#f28c00', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 24, border: '2px solid #181c1e', fontSize: 28
                  }}>
                    {iconos[i]}
                  </div>
                  <h3 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 700, marginBottom: 8 }}>{cat}</h3>
                  <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#554334', marginBottom: 24 }}>{descs[i]}</p>
                  <div style={{ fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 700, color: '#8d4f00', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Ver todo <span>→</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* MÁS BUSCADOS */}
      <section className="tienda-section" style={{ padding: 'clamp(28px, 8vw, 64px) 24px', background: '#2d3133', color: '#eef1f3' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 800, color: '#ffb875', marginBottom: 8, textTransform: 'uppercase', letterSpacing: -1 }}>
                Los más buscados
              </h2>
              <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', color: '#e0e3e5' }}>Nuestras herramientas estrella, calificadas por profesionales.</p>
            </div>
            <a href="#catalogo" style={{ fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 700, color: '#ffb875', textDecoration: 'underline' }}>
              Ver toda la selección
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
            {destacados.slice(0, 4).map(p => <ProductCard key={p.id} producto={p} />)}
          </div>
        </div>
      </section>

      {/* OFERTAS RELÁMPAGO */}
      {ofertas.length > 0 && (
        <section id="ofertas" className="tienda-section" style={{ padding: 'clamp(28px, 8vw, 64px) 24px', background: '#f7fafc' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ marginBottom: 'clamp(20px, 3vw, 32px)' }}>
              <h2 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 800, color: '#ba1a1a', marginBottom: 8 }}>
                🔥 Ofertas relámpago
              </h2>
              <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', color: '#554334' }}>Por tiempo limitado — no dejes pasar estas oportunidades</p>
            </div>
            <div className="tienda-offers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
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
                    <button onClick={() => setUpsellProductId(p.id)} style={{
                      width: '100%', minHeight: 56, background: '#f28c00', color: '#181c1e',
                      border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
                      fontWeight: 900, fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 'auto', transition: 'transform 0.1s', fontFamily: '"Inter", sans-serif'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #181c1e'; }}>
                      ¡Comprar ahora!
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CATÁLOGO */}
      <section id="catalogo" className="tienda-section" style={{ padding: 'clamp(28px, 8vw, 64px) 24px', background: '#f7fafc' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(20px, 3vw, 32px)', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 700, color: '#181c1e', margin: 0 }}>
              {search ? `🔍 Resultados para "${search}"` : '📦 Catálogo completo'}
            </h2>
            {search && (
              <button onClick={() => { setSearch(''); router.push('/tienda'); }} style={{
                background: '#181c1e', color: '#ffb875', border: '2px solid #181c1e',
                padding: '4px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}>
                ✕ Limpiar
              </button>
            )}
          </div>

          <div className="tienda-filters" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'clamp(16px, 2vw, 32px)', alignItems: 'center' }}>
            <button onClick={() => setCategoria('')} style={{
              padding: 'clamp(6px, 1vw, 8px) clamp(12px, 2vw, 20px)', border: '2px solid #181c1e',
              background: !categoria ? '#f28c00' : '#ffffff',
              color: !categoria ? '#181c1e' : '#554334',
              fontSize: 'clamp(13px, 2vw, 16px)', fontWeight: 700, cursor: 'pointer',
              boxShadow: !categoria ? '2px 2px 0px 0px #181c1e' : 'none', whiteSpace: 'nowrap'
            }}>
              Todos
            </button>
            {categorias.map(c => (
              <button key={c} onClick={() => setCategoria(c)} style={{
                padding: 'clamp(6px, 1vw, 8px) clamp(12px, 2vw, 20px)', border: '2px solid #181c1e',
                background: categoria === c ? '#f28c00' : '#ffffff',
                color: categoria === c ? '#181c1e' : '#554334',
                fontSize: 'clamp(13px, 2vw, 16px)', fontWeight: 700, cursor: 'pointer',
                boxShadow: categoria === c ? '2px 2px 0px 0px #181c1e' : 'none', whiteSpace: 'nowrap'
              }}>
                {c}
              </button>
            ))}
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{
              marginLeft: 'auto', background: '#ffffff', border: '2px solid #181c1e',
              padding: 'clamp(6px, 1vw, 8px) clamp(12px, 2vw, 20px)', color: '#181c1e',
              fontSize: 'clamp(13px, 2vw, 16px)', fontWeight: 700, cursor: 'pointer',
              boxShadow: '2px 2px 0px 0px #181c1e', minHeight: 40
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
          ) : error ? (
            <div style={{
              textAlign: 'center', padding: 64, fontSize: 18, fontWeight: 700, color: '#ba1a1a',
              border: '2px dashed #ba1a1a', boxShadow: '4px 4px 0px 0px #181c1e'
            }}>
              {error}
              <br />
              <button onClick={fetchData} style={{
                marginTop: 16, background: '#f28c00', color: '#181c1e',
                border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
                padding: '10px 24px', fontSize: 16, fontWeight: 700, cursor: 'pointer', minHeight: 48
              }}>Reintentar</button>
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
      <section className="tienda-section" style={{ padding: 'clamp(28px, 8vw, 64px) 24px', background: '#f7fafc', borderTop: '4px solid #181c1e' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            width: 'clamp(60px, 10vw, 80px)', height: 'clamp(60px, 10vw, 80px)', background: '#f28c00', color: '#ffffff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32, border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
            transform: 'rotate(1deg)', fontSize: 'clamp(24px, 4vw, 32px)'
          }}>
            ✅
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 700, marginBottom: 24 }}>
            Únete a la Comunidad Pizdo
          </h2>
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', color: '#554334', marginBottom: 'clamp(24px, 4vw, 48px)', lineHeight: 1.6 }}>
            Recibe guías de reparación, consejos de jardinería y ofertas exclusivas directamente en tu correo. Sin spam, solo herramientas.
          </p>
          <div className="tienda-newsletter-form" style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto' }}>
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
      {/* RECENTLY VIEWED */}
      {(() => {
        try {
          const vistos = JSON.parse(localStorage.getItem('pizdo_vistos') || '[]');
          if (vistos.length === 0) return null;
          const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
          return (
            <section className="tienda-section" style={{ padding: 'clamp(28px, 8vw, 64px) 24px', background: '#f7fafc' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                <h2 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 700, marginBottom: 24, borderLeft: '6px solid #8d4f00', paddingLeft: 12 }}>
                  👀 Viste recientemente
                </h2>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                  {vistos.map(v => (
                    <a key={v.id} href={`/tienda/${v.id}`} style={{
                      minWidth: 180, maxWidth: 220, textDecoration: 'none', color: '#181c1e',
                      background: '#ffffff', border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
                      display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'transform 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translate(-1px, -1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                      {v.imagen ? (
                        <img src={v.imagen} alt={v.nombre} style={{ width: '100%', height: 120, objectFit: 'cover', borderBottom: '2px solid #181c1e', background: '#f1f4f6' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: '100%', height: 120, background: '#f1f4f6', borderBottom: '2px solid #181c1e' }} />
                      )}
                      <div style={{ padding: 10, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.nombre}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          );
        } catch { return null; }
      })()}

      {upsellProductId && <UpsellPopup productoId={upsellProductId} onClose={() => setUpsellProductId(null)} />}

      {proofEvents.map(evt => (
        <SocialProofToast key={evt.id} data={evt} onDone={() => setProofEvents(prev => prev.filter(e => e.id !== evt.id))} />
      ))}
    </div>
  );
}
