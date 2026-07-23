'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
        @media (max-width: 768px) {
          .tienda-hero h1 { font-size: 32px !important; }
          .tienda-hero p { font-size: 18px !important; }
          .tienda-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; }
          .tienda-section-pad { padding: 32px 12px !important; }
          .tienda-navbar { flex-wrap: wrap; height: auto !important; padding: 8px 12px !important; gap: 8px !important; }
          .tienda-nav-links { gap: 12px !important; font-size: 15px !important; }
          .tienda-search-input { width: 140px !important; font-size: 14px !important; }
        }
        @media (max-width: 480px) {
          .tienda-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
          .tienda-brand { font-size: 20px !important; }
          .tienda-nav-links a { font-size: 14px !important; }
          .tienda-search-input { width: 110px !important; }
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
              background: '#f7fafc', width: 200, minWidth: 100
            }}
          />
          <button type="submit" style={{
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
    </div>
  );
}
