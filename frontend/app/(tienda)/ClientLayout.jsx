'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import WhatsAppButton from '../../components//WhatsAppButton';
import '../globals.css';

export default function TiendaLayout({ children }) {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [showBackTop, setShowBackTop] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [promoText, setPromoText] = useState('');

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
    api.get('/api/configuracion').then(({ data }) => {
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
    <div style={{ minHeight: '100vh', background: '#f8f9ff', color: '#0b1c30', fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 16, lineHeight: 1.5 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .shimmer-badge::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%); animation: shimmer 2.5s infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse-red { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); color: #ba1a1a; } }
        @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.08); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @media (max-width: 768px) {
          .tienda-nav-links, .tienda-search-desk { display: none !important; }
        }
      `}} />

      <div style={{ background: '#ff8c00', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
        {promoText || 'Envío gratis en compras +$100.000'}
      </div>

      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#904d00', letterSpacing: -1, textTransform: 'uppercase' }}>Pizdo</span>
          </a>

          <form className="tienda-search-desk" onSubmit={handleSearch} style={{ flex: '1 1 auto', maxWidth: 480, minWidth: 0 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#897362', fontSize: 18 }}>🔍</span>
              <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
                placeholder="Buscar herramientas..."
                style={{ width: '100%', padding: '10px 16px 10px 40px', background: '#eff4ff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 15, fontWeight: 500, color: '#0b1c30', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#ff8c00'; e.target.style.boxShadow = '0 0 0 1px #ff8c00'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            </div>
          </form>

          <nav className="tienda-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
            <a href="/" style={{ color: '#904d00', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '4px 8px', borderBottom: '2px solid #904d00' }}>Catálogo</a>
            <a href="/?oferta=true" style={{ color: '#564334', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Ofertas</a>
          </nav>

          <a href="/" style={{
            color: '#904d00', textDecoration: 'none', fontSize: 20, flexShrink: 0, padding: '4px 8px', borderRadius: 8,
            transition: 'transform 0.3s', transform: cartBounce ? 'scale(1.3) rotate(5deg)' : 'scale(1)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#eff4ff'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            🛒
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</main>

      {showBackTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 9989, width: 44, height: 44,
          background: '#fff', color: '#904d00', border: '1px solid #E2E8F0', borderRadius: '50%',
          cursor: 'pointer', fontSize: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'bounce-in 0.4s ease', transition: 'opacity 0.3s'
        }}>
          ↑
        </button>
      )}

      {installPrompt && !dismissedInstall && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#213145', color: '#ffb77d', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontFamily: '"Inter", sans-serif', animation: 'slide-up 0.4s ease',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>📱 Instala Pizdo en tu celular</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Acceso rápido sin abrir el navegador</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleInstall} style={{ background: '#ff8c00', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Instalar</button>
            <button onClick={dismissInstall} style={{ background: 'none', border: 'none', color: '#cbdbf5', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>
        </div>
      )}

      <footer style={{ background: '#213145', color: '#ffb77d' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32 }}>
          <div><div style={{ fontSize: 20, fontWeight: 800, color: '#ffb77d', marginBottom: 16 }}>Pizdo</div><p style={{ color: '#cbdbf5', opacity: 0.8, fontSize: 14, lineHeight: 1.6 }}>Las herramientas que necesitas, cuando las necesitas.</p></div>
          <div><h4 style={{ color: '#ffb77d', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Compañía</h4><a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Sobre nosotros</a><a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Soporte</a></div>
          <div><h4 style={{ color: '#ffb77d', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Políticas</h4><a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Envíos</a><a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Devoluciones</a></div>
          <div><h4 style={{ color: '#ffb77d', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Boletín</h4><div style={{ display: 'flex', gap: 0 }}><input type="email" placeholder="Email" style={{ flex: 1, padding: '8px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px 0 0 8px', fontSize: 13, outline: 'none', color: '#0b1c30' }} /><button style={{ padding: '8px 16px', background: '#ff8c00', color: '#fff', border: 'none', borderRadius: '0 8px 8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ok</button></div></div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', textAlign: 'center', fontSize: 13, color: '#cbdbf5', opacity: 0.6 }}>© 2026 Pizdo Industrial Tools.</div>
      </footer>
      <WhatsAppButton phone={whatsappPhone} />
    </div>
  );
}
