'use client';
import '../globals.css';

export default function TiendaLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)'
      }}>
        <a href="/tienda" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🛍️</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Tienda</span>
          <span style={{
            background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase'
          }}>Nuevo</span>
        </a>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/tienda?oferta=true" style={{ color: 'var(--red)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            🔥 Ofertas
          </a>
          <a href="/tienda" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 13 }}>
            Catálogo
          </a>
        </div>
      </nav>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center',
        color: 'var(--text3)', fontSize: 12, marginTop: 60
      }}>
        <p style={{ margin: 0 }}>© 2026 Tienda — Todos los productos están sujetos a disponibilidad.</p>
      </footer>
    </div>
  );
}
