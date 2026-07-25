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
  const [scrollY, setScrollY] = useState(0);
  const [bundleConfig, setBundleConfig] = useState(null);
  const [bundleProducts, setBundleProducts] = useState([]);
  const [homeConfig, setHomeConfig] = useState({});

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/api/configuracion').then(({ data }) => {
      setHomeConfig({
        hero_titulo: data.hero_titulo || '',
        hero_subtitulo: data.hero_subtitulo || '',
        hero_boton_texto: data.hero_boton_texto || '',
        hero_imagen_url: data.hero_imagen_url || '',
        seccion_bestsellers_titulo: data.seccion_bestsellers_titulo || '',
        seccion_catalogo_titulo: data.seccion_catalogo_titulo || '',
        coupon_activo: data.coupon_activo || false,
        coupon_codigo: data.coupon_codigo || '',
        coupon_texto: data.coupon_texto || '',
        coupon_descuento: data.coupon_descuento || ''
      });
      const ids = data.bundle_productos || [];
      if (ids.length > 0) {
        setBundleConfig({
          titulo: data.bundle_titulo || 'Professional DIY Kit',
          descripcion: data.bundle_descripcion || '',
          precioNormal: data.bundle_precio_normal || 0,
          precioOferta: data.bundle_precio_oferta || 0
        });
        const params = new URLSearchParams({ limit: 20, orden: 'reciente' });
        api.get(`/api/tienda?${params}`).then(({ data: prodData }) => {
          const prods = (prodData.productos || []).filter(p => ids.includes(p.id));
          setBundleProducts(prods);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

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
      console.error(e);
      setError('Error al cargar productos');
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
    const interval = setInterval(() => {
      const randomProduct = productos[Math.floor(Math.random() * productos.length)];
      const mins = Math.floor(Math.random() * 45) + 1;
      setProofEvents(prev => [...prev.slice(-5), {
        id: Date.now() + Math.random(),
        mensaje: `Alguien compró "${randomProduct.nombre.substring(0, 30)}${randomProduct.nombre.length > 30 ? '...' : ''}"`,
        hace: `${mins} min`
      }]);
    }, 15000 + Math.random() * 20000);
    return () => clearInterval(interval);
  }, [productos]);

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });

  const C = {
    heroBg: '#213145', heroText: '#eaf1ff',
    primary: '#ff8c00', primaryDark: '#904d00',
    secondary: '#feb700', accent: '#ff8c00',
    bg: '#f8f9ff', surface: '#fff', border: '#E2E8F0',
    text: '#0b1c30', subtext: '#564334', muted: '#897362',
    red: '#ba1a1a', green: '#22c55e'
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .ff-hero { padding: 40px 16px !important; }
          .ff-hero h1 { font-size: 26px !important; }
          .ff-hero p { font-size: 15px !important; }
          .ff-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; gap: 12px !important; }
          .ff-section { padding: 40px 16px !important; }
          .ff-section h2 { font-size: 22px !important; }
          .ff-cats { grid-template-columns: repeat(3, 1fr) !important; }
          .ff-bundle { flex-direction: column !important; }
        }
        @media (max-width: 480px) {
          .ff-hero { padding: 28px 12px !important; }
          .ff-hero h1 { font-size: 22px !important; }
          .ff-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .ff-cats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}} />

      {/* HERO */}
      <section className="ff-hero" style={{ background: C.heroBg, color: C.heroText, padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 44px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: -1 }}>
              {homeConfig.hero_titulo || 'Pizdo — Las herramientas que necesitas, cuando las necesitas'}
            </h1>
            <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#c8c6c6', marginBottom: 28, lineHeight: 1.5 }}>
              {homeConfig.hero_subtitulo || 'Calidad profesional para tus proyectos más exigentes. Diseñadas para resistir y rendir al máximo.'}
            </p>
            <a href="#catalogo" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff',
              padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(255,140,0,0.3)', transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {homeConfig.hero_boton_texto || 'Comprar ahora'}
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcSsgYjIuTXU8W2IljOR6Ud-dcffWygOFaJpx_hWqJQxygTfsfQxGOqwtDK2U06gihO1Syx6_F67RAbS9DhatpSeTfDye1sJoQVnf1QFSHHm7LUuGtYUvZnG19WXiL26GWK8I5h9wCRr_GqzIDxkxbDzYzOss2ASMyAo4U6f95CTqp6v7w8frnovUHonUEYKyjF7TNy-Ey9nAtOeDLcgIPOyKN-q6fuPYRohnuHbnIt0R1sDToRAEOY59W2yE4ZZpBGpki8I5bmxQ"
              alt="Pizdo Power Tools" style={{ width: '100%', maxWidth: 400, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))', transform: `translateY(${scrollY * 0.05}px)`, transition: 'transform 0.1s ease-out' }} />
            <div style={{
              position: 'absolute', bottom: 20, left: -10, background: '#fff', color: '#0b1c30',
              padding: '10px 16px', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              borderLeft: '4px solid #feb700', fontSize: 13, fontWeight: 700,
              animation: 'float 3s ease-in-out infinite'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <div>
                  <div style={{ fontWeight: 800 }}>Garantía de 5 años</div>
                  <div style={{ fontSize: 11, color: '#897362', fontWeight: 500 }}>En herramientas eléctricas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="ff-section" style={{ padding: '64px 24px', background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, marginBottom: 32, borderLeft: '4px solid #ff8c00', paddingLeft: 12, color: C.text }}>
            Categorías destacadas
          </h2>
          <div className="ff-cats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {['Herramientas', 'Electrónica', 'Hogar', 'Deportes', 'Oficina'].map(cat => (
              <a key={cat} href="#" onClick={e => { e.preventDefault(); setCategoria(cat); }}
                style={{
                  textDecoration: 'none', color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: 24, background: C.surface, border: '1px solid ' + C.border,
                  borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
                <div style={{ width: 56, height: 56, background: '#e5eeff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 22 }}>
                  {['🔧', '📱', '🏠', '⚽', '💼'][['Herramientas', 'Electrónica', 'Hogar', 'Deportes', 'Oficina'].indexOf(cat)]}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{cat}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      {destacados.length > 0 && (
        <section className="ff-section" style={{ padding: '48px 24px', background: C.surface, borderTop: '1px solid ' + C.border, borderBottom: '1px solid ' + C.border }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, borderLeft: '4px solid #ff8c00', paddingLeft: 12, color: C.text, margin: 0 }}>
                {homeConfig.seccion_bestsellers_titulo || 'Más vendidos'}
              </h2>
              <a href="#catalogo" style={{ color: C.primary, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Ver todos →</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {destacados.slice(0, 4).map(p => <ProductCard key={p.id} producto={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* BUNDLE / COMBO */}
      {bundleConfig && bundleProducts.length > 0 ? (
        <section className="ff-section" style={{ padding: '48px 24px', background: C.bg }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="ff-bundle" style={{ display: 'flex', background: '#e5eeff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ flex: 1, padding: 'clamp(24px, 5vw, 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#904d00', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>Compra en Combo y Ahorra</span>
                <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, color: C.text, marginBottom: 12 }}>{bundleConfig.titulo}</h2>
                <p style={{ color: C.subtext, fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>{bundleConfig.descripcion || `${bundleProducts.map(p => p.nombre).join(' + ')}.`}</p>
                {bundleConfig.precioOferta > 0 && (
                  <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: '1px solid ' + C.border, display: 'inline-flex', flexDirection: 'column', alignSelf: 'flex-start', marginBottom: 16 }}>
                    {bundleConfig.precioNormal > 0 && <span style={{ fontSize: 12, color: C.muted, textDecoration: 'line-through', marginBottom: 4 }}>Precio por separado: {formatPrice(bundleConfig.precioNormal)}</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: C.primaryDark }}>{formatPrice(bundleConfig.precioOferta)}</span>
                      {bundleConfig.precioNormal > 0 && (
                        <span style={{ background: '#ffdad6', color: '#93000a', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>Ahorras {formatPrice(bundleConfig.precioNormal - bundleConfig.precioOferta)}</span>
                      )}
                    </div>
                  </div>
                )}
                {bundleProducts.length > 0 && (
                  <a href={`/comprar/${bundleProducts[0].id}`} style={{
                    background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                    padding: '12px 28px', textDecoration: 'none', alignSelf: 'flex-start', boxShadow: '0 4px 12px rgba(255,140,0,0.3)', display: 'inline-flex'
                  }}>Comprar Combo</a>
                )}
              </div>
              <div style={{ flex: 1.4, background: C.heroBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 400, gap: 16, flexWrap: 'wrap' }}>
                {bundleProducts.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {i > 0 && <span style={{ color: '#fff', fontSize: 32, fontWeight: 700, flexShrink: 0 }}>+</span>}
                    <a href={`/producto/${p.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#fff', gap: 10 }}>
                      {p.imagen ? (
                        <img src={p.imagen} alt={p.nombre} style={{ width: 200, height: 200, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))', borderRadius: 12, background: '#F8F9FA', padding: 10 }} />
                      ) : (
                        <div style={{ width: 200, height: 200, borderRadius: 12, background: '#F8F9FA', padding: 10 }} />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nombre}
                      </span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="ff-section" style={{ padding: '48px 24px', background: C.bg }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="ff-bundle" style={{ display: 'flex', background: '#e5eeff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ flex: 1, padding: 'clamp(24px, 5vw, 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#904d00', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>Compra en Combo y Ahorra</span>
                <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, color: C.text, marginBottom: 12 }}>Professional DIY Kit</h2>
                <p style={{ color: C.subtext, fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>Todo lo que necesitas para empezar. Taladro percutor de impacto + Set de 50 brocas + Maletín de transporte reforzado.</p>
                <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: '1px solid ' + C.border, display: 'inline-flex', flexDirection: 'column', alignSelf: 'flex-start', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: C.muted, textDecoration: 'line-through', marginBottom: 4 }}>Precio por separado: $340.000</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: C.primaryDark }}>$295.000</span>
                    <span style={{ background: '#ffdad6', color: '#93000a', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>Ahorras $45.000</span>
                  </div>
                </div>
                <button style={{
                  background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                  padding: '12px 28px', cursor: 'pointer', alignSelf: 'flex-start', boxShadow: '0 4px 12px rgba(255,140,0,0.3)'
                }}>Comprar Combo</button>
              </div>
              <div style={{ flex: 1, background: C.heroBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 300 }}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDphn2wxQrXf940TeJFs7VVWWWnQ9hwyw8qe5IQfw2F6n2cZewEuNT8eWRJi3dB6wY6oLuIYqlsWJArezBEzLNKroWTi3TO9NAkZ-HKvoj0sVYd3ByYaqVEl38kz1VNdsdwuFYNO8zmJz8YWznF6HrRRBQffjMQGf6K8m8d7RWM7chbMSd0yL47GhU73UuzmFz-aZaxpfCF7W4WzlererXdGQ-FXhRYjCXkg342X4uMGBA5VGMDXkp03WLIXK8PEc3gYdmJxGS_YCw"
                  alt="Professional DIY Kit Bundle" style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))' }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {homeConfig.coupon_activo && homeConfig.coupon_codigo && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 48px' }}>
          <div style={{ background: 'linear-gradient(135deg, #ff8c00 0%, #904d00 100%)', color: '#fff', borderRadius: 16, padding: 'clamp(20px, 4vw, 32px)', boxShadow: '0 4px 16px rgba(255,140,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: 24 }}>🎫</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 3vw, 22px)' }}>{homeConfig.coupon_texto || `${homeConfig.coupon_descuento || 10}% OFF en tu primera compra`}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{homeConfig.coupon_descuento ? `Usa el código en el checkout. Válido para todos los productos.` : ''}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 24px', fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 800, letterSpacing: 2, cursor: 'pointer' }}
              onClick={() => { navigator.clipboard.writeText(homeConfig.coupon_codigo); }}>
              {homeConfig.coupon_codigo}
            </div>
          </div>
        </section>
      )}

      {/* OFERTAS RELÁMPAGO */}
      {ofertas.length > 0 && (
        <section id="ofertas" className="ff-section" style={{ padding: '48px 24px', background: C.bg }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, marginBottom: 8, borderLeft: '4px solid #ba1a1a', paddingLeft: 12, color: C.text }}>
              🔥 Ofertas relámpago
            </h2>
            <p style={{ color: C.subtext, fontSize: 15, marginBottom: 24 }}>Por tiempo limitado — no dejes pasar estas oportunidades</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {ofertas.map(p => (
                <div key={p.id} style={{
                  background: C.surface, border: '1px solid ' + C.border, borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ position: 'relative', height: 200, background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    {p.imagen ? (
                      <a href={`/producto/${p.id}`}>
                        <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      </a>
                    ) : null}
                    <div style={{ position: 'absolute', top: 10, left: 10, background: '#ba1a1a', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                      -{Math.round((1 - p.ofertaPrecio / p.precioVenta) * 100)}%
                    </div>
                    {p.ofertaHasta && <div style={{ position: 'absolute', top: 10, right: 10 }}><CountdownTimer endsAt={p.ofertaHasta} /></div>}
                  </div>
                  <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <a href={`/producto/${p.id}`} style={{ textDecoration: 'none', color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{p.nombre}</a>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#ba1a1a' }}>{formatPrice(p.ofertaPrecio)}</span>
                      <span style={{ fontSize: 13, color: C.muted, textDecoration: 'line-through' }}>{formatPrice(p.precioVenta)}</span>
                    </div>
                    <button onClick={() => setUpsellProductId(p.id)} style={{
                      width: '100%', minHeight: 42, background: '#fff', color: '#2D2D2D', border: '2px solid #2D2D2D',
                      borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 'auto',
                      fontFamily: '"Inter", sans-serif', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#2D2D2D'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2D2D2D'; }}>
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
      <section id="catalogo" className="ff-section" style={{ padding: '48px 24px', background: C.bg }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: C.text, margin: 0 }}>
              {search ? `🔍 Resultados para "${search}"` : homeConfig.seccion_catalogo_titulo || '📦 Catálogo completo'}
            </h2>
            {search && (
              <button onClick={() => { setSearch(''); router.push('/'); }} style={{
                background: '#2D2D2D', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>✕ Limpiar</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
            <button onClick={() => setCategoria('')} style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid ' + C.border,
              background: !categoria ? C.primary : C.surface, color: !categoria ? '#fff' : C.text,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
            }}>Todos</button>
            {categorias.map(c => (
              <button key={c} onClick={() => setCategoria(c)} style={{
                padding: '6px 16px', borderRadius: 20, border: '1px solid ' + C.border,
                background: categoria === c ? C.primary : C.surface, color: categoria === c ? '#fff' : C.text,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
              }}>{c}</button>
            ))}
            <select value={orden} onChange={e => setOrden(e.target.value)} style={{
              marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, border: '1px solid ' + C.border,
              background: C.surface, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>
              <option value="reciente">Más recientes</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="ventas">Más vendidos</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, fontSize: 15, fontWeight: 600, color: C.muted }}>Cargando catálogo...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 60, fontSize: 15, fontWeight: 600, color: C.red }}>
              {error}
              <br />
              <button onClick={fetchData} style={{ marginTop: 12, padding: '8px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Reintentar</button>
            </div>
          ) : productos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, fontSize: 15, fontWeight: 600, color: C.muted, border: '1px dashed ' + C.border, borderRadius: 12 }}>
              No hay productos en esta categoría.
            </div>
          ) : (
            <div className="ff-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {productos.map(p => <ProductCard key={p.id} producto={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* RECENTLY VIEWED */}
      {(() => {
        try {
          const vistos = JSON.parse(localStorage.getItem('pizdo_vistos') || '[]');
          if (vistos.length === 0) return null;
          return (
            <section className="ff-section" style={{ padding: '48px 24px', background: C.surface, borderTop: '1px solid ' + C.border }}>
              <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                <h2 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, marginBottom: 20, borderLeft: '4px solid #ff8c00', paddingLeft: 12, color: C.text }}>👀 Viste recientemente</h2>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                  {vistos.map(v => (
                    <a key={v.id} href={`/producto/${v.id}`} style={{
                      minWidth: 160, maxWidth: 200, textDecoration: 'none', color: C.text, background: C.surface,
                      border: '1px solid ' + C.border, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      display: 'flex', flexDirection: 'column', flexShrink: 0
                    }}>
                      {v.imagen ? <img src={v.imagen} alt={v.nombre} style={{ width: '100%', height: 100, objectFit: 'contain', borderBottom: '1px solid ' + C.border, background: '#F8F9FA', borderRadius: '8px 8px 0 0' }} onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ height: 100, background: '#F8F9FA', borderBottom: '1px solid ' + C.border, borderRadius: '8px 8px 0 0' }} />}
                      <div style={{ padding: 10, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.nombre}</div>
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
