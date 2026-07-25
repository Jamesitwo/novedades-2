'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WhatsAppButton from '../../components/tienda/WhatsAppButton';
import '../globals.css';

export default function TiendaLayout({ children }) {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/tienda?search=${encodeURIComponent(searchVal.trim())}`);
    } else {
      router.push('/tienda');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', color: '#0b1c30', fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 16, lineHeight: 1.5 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
        @media (max-width: 768px) {
          .tienda-nav-links, .tienda-search-desk { display: none !important; }
          .tienda-hero h1 { font-size: 28px !important; line-height: 1.2 !important; }
        }
      `}} />

      <div style={{ background: '#ff8c00', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
        Envío gratis en compras +$100.000
      </div>

      <header style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/tienda" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
            <a href="/tienda" style={{ color: '#904d00', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '4px 8px', borderBottom: '2px solid #904d00' }}>Catálogo</a>
            <a href="/tienda?oferta=true" style={{ color: '#564334', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Ofertas</a>
          </nav>

          <a href="/tienda" style={{ color: '#904d00', textDecoration: 'none', fontSize: 20, flexShrink: 0, padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#eff4ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            🛒
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>

      <footer style={{ background: '#213145', color: '#ffb77d' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffb77d', marginBottom: 16 }}>Pizdo</div>
            <p style={{ color: '#cbdbf5', opacity: 0.8, fontSize: 14, lineHeight: 1.6 }}>
              Las herramientas que necesitas, cuando las necesitas. Calidad profesional garantizada.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#ffb77d', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Compañía</h4>
            <a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Sobre nosotros</a>
            <a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Soporte</a>
          </div>
          <div>
            <h4 style={{ color: '#ffb77d', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Políticas</h4>
            <a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Envíos</a>
            <a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Devoluciones</a>
            <a href="#" style={{ color: '#cbdbf5', opacity: 0.8, display: 'block', fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>Privacidad</a>
          </div>
          <div>
            <h4 style={{ color: '#ffb77d', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Boletín</h4>
            <div style={{ display: 'flex', gap: 0 }}>
              <input type="email" placeholder="Email" style={{ flex: 1, padding: '8px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px 0 0 8px', fontSize: 13, outline: 'none', color: '#0b1c30' }} />
              <button style={{ padding: '8px 16px', background: '#ff8c00', color: '#fff', border: 'none', borderRadius: '0 8px 8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ok</button>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', textAlign: 'center', fontSize: 13, color: '#cbdbf5', opacity: 0.6 }}>
          © 2026 Pizdo Industrial Tools. All rights reserved.
        </div>
      </footer>
      <WhatsAppButton />
    </div>
  );
}
