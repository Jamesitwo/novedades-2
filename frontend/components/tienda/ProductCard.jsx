'use client';
import { useState, useEffect, useRef } from 'react';
import UpsellPopup from './UpsellPopup';
import QuickView from './QuickView';

export default function ProductCard({ producto, onFavChange }) {
  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const [showUpsell, setShowUpsell] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [faved, setFaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pizdo_favs') || '[]').includes(producto.id); }
    catch { return false; }
  });
  const [clicked, setClicked] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleBuy = (e) => {
    e.preventDefault(); e.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 1500);
    setTimeout(() => setShowUpsell(true), 300);
  };

  const toggleFav = (e) => {
    e.preventDefault(); e.stopPropagation();
    const favs = JSON.parse(localStorage.getItem('pizdo_favs') || '[]');
    const next = faved ? favs.filter(id => id !== producto.id) : [...favs, producto.id];
    localStorage.setItem('pizdo_favs', JSON.stringify(next));
    setFaved(!faved);
    if (onFavChange) onFavChange();
  };

  const esNuevo = producto.createdAt ? (new Date() - new Date(producto.createdAt)) < 7 * 86400000 : false;
  const esTop = producto.ventasSimuladas > 100;

  const precioFinal = tieneOferta ? producto.ofertaPrecio : producto.precioVenta;

  return (
    <div ref={cardRef} style={{
      position: 'relative', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease'
    }}>
      <a href={`/producto/${producto.id}`} style={{
        textDecoration: 'none', color: '#0b1c30', display: 'flex', flexDirection: 'column',
        background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s, transform 0.2s',
        overflow: 'hidden'
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}>
        
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tieneOferta && (
            <span className="shimmer-badge" style={{ background: '#ba1a1a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
              -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}%
            </span>
          )}
          {esTop && (
            <span className="shimmer-badge" style={{ background: '#feb700', color: '#271900', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
              MÁS VENDIDO
            </span>
          )}
          {esNuevo && (
            <span className="shimmer-badge" style={{ background: '#ff8c00', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
              NUEVO
            </span>
          )}
        </div>

        <button onClick={toggleFav} style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2, width: 32, height: 32,
          background: faved ? '#ffdad6' : '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          {faved ? '❤️' : '🤍'}
        </button>

        {producto.stock > 0 && producto.stock <= 5 && (
          <div style={{
            position: 'absolute', top: 8, right: 48, zIndex: 2,
            background: '#ffdad6', color: '#93000a', fontSize: 10, fontWeight: 700,
            padding: '3px 8px', borderRadius: 20
          }}>
            Solo {producto.stock}
          </div>
        )}

        <div style={{ height: 200, overflow: 'hidden', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#897362;font-size:13px;font-weight:500">Sin imagen</div>'; }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#897362', fontSize: 13, fontWeight: 500 }}>Sin imagen</div>
          )}
        </div>

        <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ff8c00', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            {producto.categoria}
          </span>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 40 }}>
            {producto.nombre}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, color: '#feb700', fontSize: 13 }}>
            {'★'.repeat(5)} <span style={{ color: '#897362', fontSize: 11, fontWeight: 500, marginLeft: 4 }}>({Math.floor(producto.ventasSimuladas / 10) || Math.floor(Math.random() * 50 + 10)})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            {tieneOferta ? (
              <>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0b1c30' }}>{formatPrice(producto.ofertaPrecio)}</span>
                <span style={{ fontSize: 13, color: '#897362', textDecoration: 'line-through', fontWeight: 500 }}>{formatPrice(producto.precioVenta)}</span>
              </>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 800, color: '#0b1c30' }}>{formatPrice(producto.precioVenta)}</span>
            )}
          </div>

          {producto.stock > 0 && producto.stock <= 5 && (
            <div style={{ color: '#ba1a1a', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>¡Solo quedan {producto.stock}!</div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <button onClick={handleBuy} style={{
              flex: 1, minHeight: 40, background: clicked ? '#22c55e' : '#fff', color: clicked ? '#fff' : '#2D2D2D',
              border: clicked ? '2px solid #22c55e' : '2px solid #2D2D2D',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
              transition: 'all 0.2s', transform: clicked ? 'scale(1.05)' : 'scale(1)'
            }}
            onMouseEnter={e => { if (!clicked) { e.currentTarget.style.background = '#2D2D2D'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (!clicked) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2D2D2D'; } }}>
              {clicked ? '✓ Agregado!' : '🛒 Agregar'}
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }} style={{
              minHeight: 40, padding: '0 10px', background: '#fff', color: '#2D2D2D', border: '2px solid #2D2D2D',
              borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: '"Inter", sans-serif', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2D2D2D'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2D2D2D'; }} title="Vista rápida">
              👁
            </button>
          </div>
        </div>
      </a>

      {showUpsell && <UpsellPopup productoId={producto.id} onClose={() => setShowUpsell(false)} />}
      {showQuickView && <QuickView producto={producto} onClose={() => setShowQuickView(false)} />}
    </div>
  );
}
