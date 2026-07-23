'use client';
import '../globals.css';

export default function TiendaLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', color: '#181c1e', fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 18, lineHeight: 1.6 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        @media (max-width: 768px) {
          .tienda-nav-desktop { display: none !important; }
          .tienda-hero h1 { font-size: 32px !important; }
          .tienda-hero p { font-size: 18px !important; }
          .tienda-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; }
          .tienda-section-pad { padding: 32px 12px !important; }
        }
        @media (max-width: 480px) {
          .tienda-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
        }
      `}} />

      <header style={{
        background: '#ffffff', borderBottom: '2px solid #181c1e',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, height: 56
      }}>
        <a href="/tienda" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#8d4f00', letterSpacing: -1, textTransform: 'uppercase' }}>
            PIZDO
          </span>
        </a>
        <div className="tienda-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="/tienda" style={{ color: '#8d4f00', textDecoration: 'none', fontSize: 18, fontWeight: 700, borderBottom: '4px solid #8d4f00', paddingBottom: 4 }}>
            Catálogo
          </a>
          <a href="/tienda?oferta=true" style={{ color: '#181c1e', textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>
            Ofertas
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/tienda" style={{ color: '#181c1e', textDecoration: 'none', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🛒</span>
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>

      <footer style={{
        background: '#2d3133', color: '#eef1f3', padding: '64px 24px',
        textAlign: 'center', borderTop: '4px solid #181c1e'
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#ffb875', marginBottom: 24 }}>
          PIZDO INDUSTRIAL
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
          <a href="#" style={{ color: '#eef1f3', textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>Soporte</a>
          <a href="#" style={{ color: '#eef1f3', textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>Privacidad</a>
          <a href="#" style={{ color: '#eef1f3', textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>Términos</a>
        </div>
        <p style={{ margin: 0, fontSize: 18, opacity: 0.7 }}>
          © 2026 Pizdo Industrial Tools. Built for Reliability.
        </p>
      </footer>

      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff',
        borderTop: '2px solid #181c1e', zIndex: 100, display: 'flex',
        justifyContent: 'space-between', padding: '8px 24px 12px', height: 56
      }}>
        <a href="/tienda" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8d4f00', textDecoration: 'none', borderBottom: '4px solid #8d4f00', paddingBottom: 2 }}>
          <span style={{ fontSize: 20 }}>🏠</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Inicio</span>
        </a>
        <a href="/tienda?oferta=true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#181c1e', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Ofertas</span>
        </a>
        <a href="#" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#181c1e', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Buscar</span>
        </a>
      </div>
    </div>
  );
}
