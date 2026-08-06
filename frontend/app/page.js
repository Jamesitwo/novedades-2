'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ClientLayout from './ClientLayout';
import ProductCard from '../components/tienda/ProductCard';
import CountdownTimer from '../components/tienda/CountdownTimer';
import SocialProofToast from '../components/tienda/SocialProofToast';
import UpsellPopup from '../components/tienda/UpsellPopup';
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
  const [homeCategorias, setHomeCategorias] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/api/configuracion/public').then(({ data }) => {
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
      setHomeCategorias(data.homepage_categorias || []);
      setRedesSociales(data.redes_sociales || []);
      const ids = data.bundle_productos || [];
      if (ids.length > 0) {
        setBundleConfig({
          titulo: data.bundle_titulo || 'Professional DIY Kit',
          descripcion: data.bundle_descripcion || '',
          precioNormal: data.bundle_precio_normal || 0,
          precioOferta: data.bundle_precio_oferta || 0,
          badgeTexto: data.bundle_badge_texto || 'Compra en Combo y Ahorra'
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
    heroBg: '#0f172a', heroText: '#f8fafc',
    primary: '#ea580c', primaryDark: '#c2410c', primaryLight: '#fff7ed', primaryBorder: '#ffedd5',
    secondary: '#f59e0b', accent: '#ea580c',
    bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0',
    text: '#0f172a', subtext: '#475569', muted: '#94a3b8',
    red: '#dc2626', green: '#16a34a'
  };

  return (
    <ClientLayout>
      <div>
        <style dangerouslySetInnerHTML={{__html: `
          .ff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
          .ff-grid > * { height: 100%; min-width: 0; width: 100%; }
          
          .ff-hero-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            align-items: center;
          }

          .ff-trust-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            padding: 24px;
          }

          @media (max-width: 900px) {
            .ff-trust-bar {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 16px !important;
            }
          }

          @media (max-width: 768px) {
            .ff-hero { padding: 48px 16px !important; text-align: center; }
            .ff-hero-container { grid-template-columns: 1fr !important; gap: 32px !important; }
            .ff-hero h1 { font-size: 28px !important; }
            .ff-hero p { font-size: 15px !important; }
            .ff-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; gap: 14px !important; }
            .ff-section { padding: 40px 16px !important; }
            .ff-section h2 { font-size: 22px !important; }
            .ff-cats { grid-template-columns: repeat(3, 1fr) !important; }
            .ff-bundle { flex-direction: column !important; }
          }
          @media (max-width: 480px) {
            .ff-hero { padding: 32px 14px !important; }
            .ff-hero h1 { font-size: 24px !important; }
            .ff-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
            .ff-cats { grid-template-columns: repeat(2, 1fr) !important; }
            .ff-trust-bar { grid-template-columns: 1fr !important; gap: 12px !important; }
          }
        `}} />

        {/* HERO SECTION */}
        <section className="ff-hero" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: C.heroText, padding: '72px 24px', position: 'relative', overflow: 'hidden' }}>
          <div className="ff-hero-container" style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(234, 88, 12, 0.15)', color: '#ffedd5', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, marginBottom: 16 }}>
                ⚡ HERRAMIENTAS INDUSTRIALES PROFESIONALES
              </div>
              <h1 style={{ fontSize: 'clamp(26px, 4.5vw, 44px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 16, letterSpacing: -1, color: '#ffffff' }}>
                {homeConfig.hero_titulo || 'Pizdo — Las herramientas que necesitas, cuando las necesitas'}
              </h1>
              <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#94a3b8', marginBottom: 32, lineHeight: 1.6, maxWidth: 540 }}>
                {homeConfig.hero_subtitulo || 'Calidad profesional garantizada para tus trabajos más exigentes. Diseñadas para resistir y rendir al máximo.'}
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'inherit' }}>
                <a href="#catalogo" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff',
                  padding: '16px 36px', borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(234,88,12,0.35)', transition: 'all 0.2s ease'
                }}>
                  🛒 {homeConfig.hero_boton_texto || 'Ver Catálogo Completo'}
                </a>
                <a href="#ofertas" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', color: '#ffffff',
                  padding: '16px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.15)', transition: 'all 0.2s ease'
                }}>
                  🔥 Ver Ofertas
                </a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcSsgYjIuTXU8W2IljOR6Ud-dcffWygOFaJpx_hWqJQxygTfsfQxGOqwtDK2U06gihO1Syx6_F67RAbS9DhatpSeTfDye1sJoQVnf1QFSHHm7LUuGtYUvZnG19WXiL26GWK8I5h9wCRr_GqzIDxkxbDzYzOss2ASMyAo4U6f95CTqp6v7w8frnovUHonUEYKyjF7TNy-Ey9nAtOeDLcgIPOyKN-q6fuPYRohnuHbnIt0R1sDToRAEOY59W2yE4ZZpBGpki8I5bmxQ"
                alt="Pizdo Power Tools"
                style={{ width: '100%', maxWidth: 420, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))', transform: `translateY(${scrollY * 0.04}px)`, transition: 'transform 0.1s ease-out' }}
              />
              <div style={{
                position: 'absolute', bottom: 10, left: 0, background: '#ffffff', color: '#0f172a',
                padding: '12px 18px', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                borderLeft: '4px solid #ea580c', fontSize: 13, fontWeight: 700,
                animation: 'float 3s ease-in-out infinite'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>⭐</span>
                  <div>
                    <div style={{ fontWeight: 900, color: '#0f172a' }}>Garantía Pizdo Directa</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Servicio y repuestos originales</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BARRA DE BENEFICIOS Y CONFIANZA */}
        <div className="ff-trust-bar">
          <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'contents' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff7ed', border: '1px solid #ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🚚</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Envío a Toda Colombia</div>
                <div style={{ fontSize: 12, color: C.subtext }}>Con número de guía de rastreo</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💵</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Pago Contra Entrega</div>
                <div style={{ fontSize: 12, color: C.subtext }}>Pagas al recibir en tu puerta</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🛡️</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Garantía de Satisfacción</div>
                <div style={{ fontSize: 12, color: C.subtext }}>30 días de cobertura directa</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', border: '1px solid #fde68a', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⚡</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Despacho Rápido 24h</div>
                <div style={{ fontSize: 12, color: C.subtext }}>Envíos prioritarios diarios</div>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORÍAS */}
        <section className="ff-section" style={{ padding: '56px 24px', background: C.bg }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, borderLeft: '4px solid #ea580c', paddingLeft: 12, color: C.text, margin: 0 }}>
                Categorías Destacadas
              </h2>
            </div>
            <div className="ff-cats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              {homeCategorias.length === 0 && (
                <div style={{ color: C.muted, fontSize: 14, fontWeight: 500, textAlign: 'center', padding: 20, gridColumn: '1 / -1' }}>
                  Configura las categorías desde el panel de administración
                </div>
              )}
              {homeCategorias.length > 0 && homeCategorias.map(cat => {
                const emojiMap = { 'Herramientas': '🔧', 'Electrónica': '📱', 'Hogar': '🏠', 'Deportes': '⚽', 'Oficina': '💼', 'Belleza': '💄', 'Ropa': '👕', 'Calzado': '👟' };
                const emoji = emojiMap[cat] || '📦';
                return (
                  <a key={cat} href="#catalogo" onClick={e => { e.preventDefault(); setCategoria(cat); setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  style={{
                    textDecoration: 'none', color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: 24, background: C.surface, border: '1px solid ' + C.border,
                    borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}>
                  <div style={{ width: 56, height: 56, background: C.primaryLight, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 24, border: '1px solid ' + C.primaryBorder }}>
                    {emoji}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'center' }}>{cat}</span>
                </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* BEST SELLERS */}
        {destacados.length > 0 && (
          <section className="ff-section" style={{ padding: '48px 24px', background: C.surface, borderTop: '1px solid ' + C.border, borderBottom: '1px solid ' + C.border }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, borderLeft: '4px solid #ea580c', paddingLeft: 12, color: C.text, margin: 0 }}>
                  {homeConfig.seccion_bestsellers_titulo || 'Más Vendidos'}
                </h2>
                <a href="#catalogo" style={{ color: C.primary, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>Ver catálogo →</a>
              </div>
              <div className="ff-grid">
                {destacados.slice(0, 4).map(p => <ProductCard key={p.id} producto={p} />)}
              </div>
            </div>
          </section>
        )}

        {/* BUNDLE / COMBO */}
        {bundleConfig && bundleProducts.length > 0 && (
          <section className="ff-section" style={{ padding: '48px 24px', background: C.bg }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <div className="ff-bundle" style={{ display: 'flex', background: '#eff6ff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #bfdbfe' }}>
                <div style={{ flex: 1, padding: 'clamp(24px, 5vw, 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ color: C.primary, fontWeight: 800, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>{bundleConfig?.badgeTexto || 'Compra en Combo y Ahorra'}</span>
                  <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>{bundleConfig.titulo}</h2>
                  <p style={{ color: C.subtext, fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>{bundleConfig.descripcion || `${bundleProducts.map(p => p.nombre).join(' + ')}.`}</p>
                  {bundleConfig.precioOferta > 0 && (
                    <div style={{ background: C.surface, borderRadius: 14, padding: 16, border: '1px solid ' + C.border, display: 'inline-flex', flexDirection: 'column', alignSelf: 'flex-start', marginBottom: 20 }}>
                      {bundleConfig.precioNormal > 0 && <span style={{ fontSize: 12, color: C.muted, textDecoration: 'line-through', marginBottom: 4 }}>Precio por separado: {formatPrice(bundleConfig.precioNormal)}</span>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: C.primary }}>{formatPrice(bundleConfig.precioOferta)}</span>
                        {bundleConfig.precioNormal > 0 && (
                          <span style={{ background: '#fee2e2', color: C.red, fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>Ahorras {formatPrice(bundleConfig.precioNormal - bundleConfig.precioOferta)}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {bundleProducts.length > 0 && (
                    <a href={`/comprar/${bundleProducts[0].id}`} style={{
                      background: C.primary, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16,
                      padding: '14px 32px', textDecoration: 'none', alignSelf: 'flex-start', boxShadow: '0 8px 24px rgba(234,88,12,0.3)', display: 'inline-flex'
                    }}>Comprar Combo</a>
                  )}
                </div>
                <div style={{ flex: 1.4, background: C.heroBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 380, gap: 16, flexWrap: 'wrap' }}>
                  {bundleProducts.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {i > 0 && <span style={{ color: '#fff', fontSize: 32, fontWeight: 800, flexShrink: 0 }}>+</span>}
                      <a href={`/producto/${p.slug || p.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#fff', gap: 10 }}>
                        {p.imagen && (
                          <img src={p.imagen} alt={p.nombre} style={{ width: 180, height: 180, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))', borderRadius: 14, background: '#ffffff', padding: 12 }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.nombre}
                        </span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CUPÓN DE DESCUENTO */}
        {homeConfig.coupon_activo && homeConfig.coupon_codigo && (
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 48px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: '#fff', borderRadius: 20, padding: 'clamp(20px, 4vw, 32px)', boxShadow: '0 8px 28px rgba(234,88,12,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '12px 16px', fontSize: 28 }}>🎫</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 3vw, 24px)' }}>{homeConfig.coupon_texto || `${homeConfig.coupon_descuento || 10}% OFF en tu primera compra`}</div>
                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>Toca el código para copiarlo y aplicarlo en tu pedido.</div>
                </div>
              </div>
              <div
                style={{ background: '#ffffff', color: C.primary, borderRadius: 12, padding: '14px 28px', fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 900, letterSpacing: 2, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                onClick={(e) => {
                  navigator.clipboard.writeText(homeConfig.coupon_codigo);
                  const prev = e.currentTarget.innerText;
                  e.currentTarget.innerText = '¡COPIADO! ✓';
                  setTimeout(() => { e.currentTarget.innerText = prev; }, 2000);
                }}
              >
                {homeConfig.coupon_codigo}
              </div>
            </div>
          </section>
        )}

        {/* OFERTAS RELÁMPAGO */}
        {ofertas.length > 0 && (
          <section id="ofertas" className="ff-section" style={{ padding: '48px 24px', background: C.bg }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 8, borderLeft: '4px solid #dc2626', paddingLeft: 12, color: C.text }}>
                🔥 Ofertas Relámpago
              </h2>
              <p style={{ color: C.subtext, fontSize: 15, marginBottom: 28 }}>Precios especiales por tiempo limitado — ¡Consíguelas antes de que se agoten!</p>
              <div className="ff-grid">
                {ofertas.map(p => (
                  <div key={p.id} style={{
                    background: C.surface, border: '1px solid ' + C.border, borderRadius: 16,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ position: 'relative', height: 200, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                      {p.imagen ? (
                        <a href={`/producto/${p.slug || p.id}`}>
                          <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        </a>
                      ) : null}
                      <div style={{ position: 'absolute', top: 10, left: 10, background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20, boxShadow: '0 2px 6px rgba(220,38,38,0.3)' }}>
                        -{Math.round((1 - p.ofertaPrecio / p.precioVenta) * 100)}% OFF
                      </div>
                      {p.ofertaHasta && <div style={{ position: 'absolute', top: 10, right: 10 }}><CountdownTimer endsAt={p.ofertaHasta} /></div>}
                    </div>
                    <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <a href={`/producto/${p.slug || p.id}`} style={{ textDecoration: 'none', color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.3 }}>{p.nombre}</a>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: '#dc2626' }}>{formatPrice(p.ofertaPrecio)}</span>
                        <span style={{ fontSize: 13, color: C.muted, textDecoration: 'line-through' }}>{formatPrice(p.precioVenta)}</span>
                      </div>
                      <button onClick={() => setUpsellProductId(p.id)} style={{
                        width: '100%', minHeight: 44, background: C.primary, color: '#ffffff', border: 'none',
                        borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', marginTop: 'auto',
                        fontFamily: '"Inter", sans-serif', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(234,88,12,0.25)'
                      }}>
                        🛒 ¡Comprar Oferta Ahora!
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CATÁLOGO COMPLETO */}
        <section id="catalogo" className="ff-section" style={{ padding: '56px 24px', background: C.bg }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, color: C.text, margin: 0 }}>
                {search ? `🔍 Resultados para "${search}"` : homeConfig.seccion_catalogo_titulo || '📦 Catálogo Completo'}
              </h2>
              {search && (
                <button onClick={() => { setSearch(''); router.push('/'); }} style={{
                  background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                }}>✕ Limpiar filtro</button>
              )}
            </div>

            {/* Filtros de Categoría y Ordenamiento */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
              <button onClick={() => setCategoria('')} style={{
                padding: '8px 20px', borderRadius: 20, border: '1px solid ' + (categoria ? C.border : C.primary),
                background: !categoria ? C.primary : C.surface, color: !categoria ? '#fff' : C.text,
                fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: !categoria ? '0 4px 12px rgba(234,88,12,0.25)' : 'none'
              }}>Todos los productos</button>
              {categorias.map(c => (
                <button key={c} onClick={() => setCategoria(c)} style={{
                  padding: '8px 20px', borderRadius: 20, border: '1px solid ' + (categoria === c ? C.primary : C.border),
                  background: categoria === c ? C.primary : C.surface, color: categoria === c ? '#fff' : C.text,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: categoria === c ? '0 4px 12px rgba(234,88,12,0.25)' : 'none'
                }}>{c}</button>
              ))}
              <select value={orden} onChange={e => setOrden(e.target.value)} style={{
                marginLeft: 'auto', padding: '8px 16px', borderRadius: 20, border: '1.5px solid ' + C.border,
                background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', outline: 'none'
              }}>
                <option value="reciente">Más recientes</option>
                <option value="precio-asc">Precio: Menor a Mayor</option>
                <option value="precio-desc">Precio: Mayor a Menor</option>
                <option value="ventas">Más vendidos</option>
              </select>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 80, fontSize: 16, fontWeight: 600, color: C.muted }}>Cargando catálogo de productos...</div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: 60, fontSize: 15, fontWeight: 600, color: C.red }}>
                {error}
                <br />
                <button onClick={fetchData} style={{ marginTop: 16, padding: '10px 24px', background: C.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>Reintentar</button>
              </div>
            ) : productos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, fontSize: 16, fontWeight: 600, color: C.muted, border: '2px dashed ' + C.border, borderRadius: 16 }}>
                No se encontraron productos en esta categoría.
              </div>
            ) : (
              <div className="ff-grid">
                {productos.map(p => <ProductCard key={p.id} producto={p} />)}
              </div>
            )}
          </div>
        </section>

        {/* RECIENTEMENTE VISTOS */}
        {(() => {
          try {
            const vistos = JSON.parse(localStorage.getItem('pizdo_vistos') || '[]');
            if (vistos.length === 0) return null;
            return (
              <section className="ff-section" style={{ padding: '48px 24px', background: C.surface, borderTop: '1px solid ' + C.border }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                  <h2 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, marginBottom: 20, borderLeft: '4px solid #ea580c', paddingLeft: 12, color: C.text }}>👀 Viste recientemente</h2>
                  <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                    {vistos.map(v => (
                      <a key={v.id} href={`/producto/${v.slug || v.id}`} style={{
                        minWidth: 160, maxWidth: 200, textDecoration: 'none', color: C.text, background: C.surface,
                        border: '1px solid ' + C.border, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden'
                      }}>
                        {v.imagen ? <img src={v.imagen} alt={v.nombre} style={{ width: '100%', height: 110, objectFit: 'contain', borderBottom: '1px solid ' + C.border, background: '#f8fafc' }} onError={e => { e.target.style.display = 'none'; }} />
                          : <div style={{ height: 110, background: '#f8fafc', borderBottom: '1px solid ' + C.border }} />}
                        <div style={{ padding: 12, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.nombre}</div>
                      </a>
                    ))}
                  </div>
                </div>
              </section>
            );
          } catch { return null; }
        })()}

        {/* REDES SOCIALES */}
        {redesSociales.length > 0 && (
          <section className="ff-section" style={{ padding: '56px 24px', background: '#0f172a', color: '#ffffff' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, marginBottom: 8, color: '#ffffff' }}>
                🌐 Síguenos en Redes Sociales
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>
                Entérate de lanzamientos, ofertas exclusivas y consejos de uso
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {redesSociales.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{
                    textDecoration: 'none', color: '#ffffff', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 10, padding: '20px 28px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s',
                    minWidth: 120
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none'; }}>
                    <span style={{ fontSize: 32 }}>
                      {r.plataforma === 'Facebook' ? (
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <circle cx="16" cy="16" r="16" fill="#1877F2"/>
                          <text x="16" y="22" textAnchor="middle" fontSize="20" fontWeight="bold" fill="white" fontFamily="Arial">f</text>
                        </svg>
                      ) : r.icono}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{r.plataforma}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {upsellProductId && <UpsellPopup productoId={upsellProductId} onClose={() => setUpsellProductId(null)} />}
        {proofEvents.map(evt => (
          <SocialProofToast key={evt.id} data={evt} onDone={() => setProofEvents(prev => prev.filter(e => e.id !== evt.id))} />
        ))}
      </div>
    </ClientLayout>
  );
}
