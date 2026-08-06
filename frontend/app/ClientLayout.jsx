'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import WhatsAppButton from '../components/tienda/WhatsAppButton';
import CartDrawer from '../components/tienda/CartDrawer';
import './globals.css';

export default function TiendaLayout({ children }) {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [promoText, setPromoText] = useState('');
  const { init, getCount, openDrawer } = useCartStore();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    const update = () => setCartCount(getCount());
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [getCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/?search=${encodeURIComponent(searchVal.trim())}`);
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = () => {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 600);
    };
    window.addEventListener('pizdo-cart-add', handler);
    return () => window.removeEventListener('pizdo-cart-add', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    try { setDismissedInstall(localStorage.getItem('pizdo_pwa_dismissed') === '1'); } catch {}
  }, []);

  useEffect(() => {
    api.get('/api/configuracion/public').then(({ data }) => {
      if (data.whatsapp_numero) setWhatsappPhone(data.whatsapp_numero);
      if (data.promo_bar_texto) setPromoText(data.promo_bar_texto);
    }).catch(() => {});
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => setInstallPrompt(null));
    }
  };

  const dismissInstall = () => {
    setInstallPrompt(null);
    try { localStorage.setItem('pizdo_pwa_dismissed', '1'); } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 15, lineHeight: 1.5 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .shimmer-badge::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%); animation: shimmer 2.5s infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse-red { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); color: #dc2626; } }
        @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.08); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        
        .tienda-search-input:focus {
          border-color: #ea580c !important;
          box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.15) !important;
        }

        @media (max-width: 768px) {
          .tienda-nav-links { display: none !important; }
          .tienda-search-desk { display: none !important; }
          .tienda-search-mobile-trigger { display: flex !important; }
        }

        @media (min-width: 769px) {
          .tienda-search-mobile-trigger { display: none !important; }
          .tienda-mobile-search-bar { display: none !important; }
        }
      `}} />

      {/* Top Banner de Promoción */}
      <div style={{ background: 'linear-gradient(90deg, #ea580c 0%, #c2410c 100%)', color: '#fff', textAlign: 'center', padding: '9px 16px', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 8px rgba(234,88,12,0.2)' }}>
        <span>🚚</span> <span>{promoText || '¡ENVÍO GRATIS Y PAGO CONTRA ENTREGA EN TODA COLOMBIA!'}</span>
      </div>

      {/* Header Principal */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Logo Brand */}
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ background: '#ea580c', color: '#fff', fontWeight: 900, fontSize: 18, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(234,88,12,0.3)' }}>P</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5, lineHeight: 1 }}>PIZDO</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#ea580c', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>INDUSTRIAL TOOLS</span>
            </div>
          </a>

          {/* Search Bar Desktop */}
          <form className="tienda-search-desk" onSubmit={handleSearch} style={{ flex: '1 1 auto', maxWidth: 520, minWidth: 0, margin: '0 auto' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
              <input
                type="text"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Buscar herramientas industriales, taladros, sets..."
                className="tienda-search-input"
                style={{
                  width: '100%', padding: '10px 16px 10px 42px', background: '#f8fafc',
                  border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 500,
                  color: '#0f172a', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box'
                }}
              />
            </div>
          </form>

          {/* Navigation Links Desktop */}
          <nav className="tienda-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <a href="/" style={{ color: '#ea580c', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: '#fff7ed' }}>
              Catálogo
            </a>
            <a href="/#ofertas" style={{ color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '6px 12px', borderRadius: 8 }}>
              🔥 Ofertas
            </a>
          </nav>

          {/* Acciones Header (Search Mobile + Carrito) */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              className="tienda-search-mobile-trigger"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              style={{ background: '#f1f5f9', border: 'none', width: 40, height: 40, borderRadius: 10, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#0f172a' }}
            >
              🔍
            </button>

            <button
              onClick={openDrawer}
              title="Ver carrito de compras"
              style={{
                position: 'relative', background: '#fff7ed', border: '1.5px solid #ffedd5',
                color: '#ea580c', width: 44, height: 44, borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                transition: 'all 0.2s', transform: cartBounce ? 'scale(1.2) rotate(5deg)' : 'scale(1)',
                boxShadow: '0 4px 12px rgba(234,88,12,0.1)'
              }}
            >
              🛒
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: '#ffffff', fontSize: 11, fontWeight: 900,
                  minWidth: 20, height: 20, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar Mobile Expandable */}
        {showMobileSearch && (
          <div className="tienda-mobile-search-bar" style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <form onSubmit={handleSearch} style={{ width: '100%' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
                <input
                  type="text"
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Buscar productos..."
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 16px 12px 42px', background: '#ffffff',
                    border: '1.5px solid #ea580c', borderRadius: 12, fontSize: 15, fontWeight: 500,
                    color: '#0f172a', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</main>

      {/* Botón Volver Arriba */}
      {showBackTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: 90, right: 20, zIndex: 9989, width: 46, height: 46,
            background: '#ffffff', color: '#ea580c', border: '1.5px solid #e2e8f0', borderRadius: '50%',
            cursor: 'pointer', fontSize: 20, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'bounce-in 0.4s ease', transition: 'all 0.2s'
          }}
        >
          ↑
        </button>
      )}

      {/* Banner PWA Instalar */}
      {installPrompt && !dismissedInstall && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#0f172a', color: '#ffedd5', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontFamily: '"Inter", sans-serif', animation: 'slide-up 0.4s ease',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>📱 Instala la App de Pizdo</div>
            <div style={{ fontSize: 12, opacity: 0.8, color: '#cbd5e1' }}>Acceso rápido y ofertas exclusivas sin abrir navegador</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleInstall} style={{ background: '#ea580c', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(234,88,12,0.3)' }}>Instalar</button>
            <button onClick={dismissInstall} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>
        </div>
      )}

      {/* Footer Pro */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 36 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', marginBottom: 12, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#ea580c', color: '#fff', width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>P</span>
              <span>PIZDO</span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              Herramientas industriales de nivel profesional para tus proyectos en Colombia. Calidad garantizada.
            </p>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#10b981', fontWeight: 700 }}>
              <span>✓ Envíos a nivel nacional</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 15, fontWeight: 800, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Categorías</h4>
            <a href="/#catalogo" style={{ color: '#cbd5e1', display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 10, transition: 'color 0.15s' }}>Herramientas Eléctricas</a>
            <a href="/#catalogo" style={{ color: '#cbd5e1', display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 10, transition: 'color 0.15s' }}>Sets de Mecánica</a>
            <a href="/#catalogo" style={{ color: '#cbd5e1', display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 10, transition: 'color 0.15s' }}>Accesorios Industriales</a>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 15, fontWeight: 800, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Servicio al Cliente</h4>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 10 }}>🚚 Pago Contra Entrega</div>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 10 }}>🛡️ Garantía de Satisfacción</div>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 10 }}>📱 Soporte por WhatsApp</div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: 15, fontWeight: 800, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Boletín de Ofertas</h4>
            <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 12 }}>Suscríbete y recibe cupones de descuento exclusivos:</p>
            <div style={{ display: 'flex', gap: 0 }}>
              <input
                type="email"
                placeholder="Tu correo electrónico..."
                style={{ flex: 1, padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px 0 0 10px', fontSize: 13, outline: 'none', color: '#fff' }}
              />
              <button style={{ padding: '10px 18px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '0 10px 10px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Unirme
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', padding: '20px 24px', textAlign: 'center', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, maxWidth: 1280, margin: '0 auto' }}>
          <div>© 2026 Pizdo Industrial Tools. Todos los derechos reservados.</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
            <span>🇨🇴 Envíos a toda Colombia</span>
            <span>🔒 Pago Seguro</span>
          </div>
        </div>
      </footer>

      <WhatsAppButton phone={whatsappPhone} />
      <CartDrawer />
    </div>
  );
}
