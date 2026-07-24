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
    <div style={{ minHeight: '100vh', background: '#f7fafc', color: '#181c1e', fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 18, lineHeight: 1.6 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        .tienda-hero h1, .tienda-hero p, .tienda-grid, .tienda-section-pad {
          transition: all 0.2s;
        }
        @media (max-width: 900px) {
          .tienda-navbar { flex-wrap: wrap; height: auto !important; padding: 8px 12px !important; gap: 8px !important; }
          .tienda-nav-links { gap: 10px !important; }
          .tienda-nav-links a { font-size: 14px !important; }
          .tienda-search-input { width: 130px !important; font-size: 13px !important; min-height: 36px !important; }
          .tienda-search-btn { min-height: 36px !important; font-size: 13px !important; padding: 0 10px !important; }
          .tienda-brand span { font-size: 20px !important; }
        }
        @media (max-width: 600px) {
          .tienda-navbar { padding: 6px 10px !important; gap: 6px !important; justify-content: center !important; }
          .tienda-brand span { font-size: 18px !important; }
          .tienda-nav-links { gap: 6px !important; }
          .tienda-nav-links a { font-size: 13px !important; padding-bottom: 2px !important; }
          .tienda-search-input { width: 100px !important; font-size: 12px !important; padding: 0 8px !important; min-height: 32px !important; }
          .tienda-search-btn { min-height: 32px !important; font-size: 12px !important; padding: 0 8px !important; }
        }
      `}} />

      <header className="tienda-navbar" style={{
        background: '#ffffff', borderBottom: '2px solid #181c1e',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, height: 56, gap: 16
      }}>
        <a href="/tienda" className="tienda-brand" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#8d4f00', letterSpacing: -1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            PIZDO
          </span>
        </a>

        <div className="tienda-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <a href="/tienda" style={{ color: '#8d4f00', textDecoration: 'none', fontSize: 17, fontWeight: 700, borderBottom: '4px solid #8d4f00', paddingBottom: 4, whiteSpace: 'nowrap' }}>
            🏠 Inicio
          </a>
          <a href="/tienda?oferta=true" style={{ color: '#181c1e', textDecoration: 'none', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>
            🔥 Ofertas
          </a>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 0, flex: '0 1 auto', minWidth: 0 }}>
          <input
            className="tienda-search-input"
            type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Buscar..."
            style={{
              minHeight: 40, padding: '0 12px', fontSize: 15, fontWeight: 700, color: '#181c1e',
              border: '2px solid #181c1e', borderRight: 'none', outline: 'none',
              background: '#f7fafc', width: 200, minWidth: 80
            }}
          />
          <button type="submit" className="tienda-search-btn" style={{
            minHeight: 40, padding: '0 12px', background: '#f28c00', color: '#181c1e',
            border: '2px solid #181c1e', fontSize: 15, fontWeight: 700, cursor: 'pointer', flexShrink: 0
          }}>
            🔍
          </button>
        </form>

        <a href="/tienda" style={{ color: '#181c1e', textDecoration: 'none', fontSize: 17, fontWeight: 700, flexShrink: 0 }}>
          🛒
        </a>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 40 }}>
        {children}
      </main>

      <footer style={{
        background: '#2d3133', color: '#eef1f3', padding: 'clamp(32px, 5vw, 64px) 24px',
        textAlign: 'center', borderTop: '4px solid #181c1e'
      }}>
        <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#ffb875', marginBottom: 24 }}>
          PIZDO INDUSTRIAL
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 4vw, 32px)', marginBottom: 32, flexWrap: 'wrap' }}>
          <a href="#" style={{ color: '#eef1f3', textDecoration: 'none', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 700 }}>Soporte</a>
          <a href="#" style={{ color: '#eef1f3', textDecoration: 'none', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 700 }}>Privacidad</a>
          <a href="#" style={{ color: '#eef1f3', textDecoration: 'none', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 700 }}>Términos</a>
        </div>
        <p style={{ margin: 0, fontSize: 'clamp(14px, 3vw, 18px)', opacity: 0.7 }}>
          © 2026 Pizdo Industrial Tools.
        </p>
      </footer>
      <WhatsAppButton />
    </div>
  );
}
