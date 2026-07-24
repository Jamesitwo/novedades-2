'use client';
import { useState } from 'react';
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

  const toggleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const favs = JSON.parse(localStorage.getItem('pizdo_favs') || '[]');
    const next = faved ? favs.filter(id => id !== producto.id) : [...favs, producto.id];
    localStorage.setItem('pizdo_favs', JSON.stringify(next));
    setFaved(!faved);
    if (onFavChange) onFavChange();
  };

  const esNuevo = producto.createdAt ? (new Date() - new Date(producto.createdAt)) < 7 * 86400000 : false;
  const esTop = producto.ventasSimuladas > 100;

  return (
    <div style={{ position: 'relative' }}>
      <a href={`/tienda/${producto.id}`} className="industrial-card" style={{
        textDecoration: 'none', color: '#181c1e', display: 'flex', flexDirection: 'column',
        background: '#ffffff', border: '2px solid #181c1e',
        boxShadow: '4px 4px 0px 0px #181c1e', position: 'relative',
        transition: 'transform 0.15s, box-shadow 0.15s'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}>
        
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tieneOferta && (
            <span style={{ background: '#ba1a1a', color: '#fff', fontSize: 12, fontWeight: 900, padding: '3px 10px', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e' }}>
              -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
            </span>
          )}
          {esNuevo && (
            <span style={{ background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 900, padding: '2px 8px', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e' }}>
              🆕 NUEVO
            </span>
          )}
          {esTop && (
            <span style={{ background: '#8d4f00', color: '#ffb875', fontSize: 11, fontWeight: 900, padding: '2px 8px', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e' }}>
              🔥 TOP
            </span>
          )}
        </div>

        <button onClick={toggleFav} style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2, width: 36, height: 36,
          background: faved ? '#ffdad6' : '#ffffff', border: '2px solid #181c1e',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: faved ? '2px 2px 0px 0px #ba1a1a' : '2px 2px 0px 0px #181c1e',
          transition: 'all 0.15s'
        }}>
          {faved ? '❤️' : '🤍'}
        </button>

        {producto.stock > 0 && producto.stock <= 5 && (
          <div style={{
            position: 'absolute', top: esNuevo || tieneOferta ? (esNuevo && tieneOferta ? 90 : tieneOferta ? 56 : esNuevo ? 56 : 46) : 46, right: 10, zIndex: 2,
            background: '#ffdad6', color: '#93000a', fontSize: 11, fontWeight: 900,
            padding: '3px 10px', border: '2px solid #ba1a1a', boxShadow: '2px 2px 0px 0px #181c1e'
          }}>
            Solo {producto.stock}
          </div>
        )}

        <div style={{ height: 'clamp(160px, 30vw, 240px)', overflow: 'hidden', borderBottom: '2px solid #181c1e', background: '#f1f4f6' }}>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:100%;background:#f1f4f6;display:flex;align-items:center;justify-content:center;color:#887362;font-size:14px;font-weight:700">Sin imagen</div>'; }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#887362', fontSize: 14, fontWeight: 700 }}>Sin imagen</div>
          )}
        </div>

        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#f28c00', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            {producto.categoria}
          </span>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, lineHeight: 1.3, flex: 1 }}>
            {producto.nombre}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            {tieneOferta ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#ba1a1a' }}>{formatPrice(producto.ofertaPrecio)}</span>
                <span style={{ fontSize: 16, color: '#887362', textDecoration: 'line-through', fontWeight: 700 }}>{formatPrice(producto.precioVenta)}</span>
              </>
            ) : (
              <span style={{ fontSize: 28, fontWeight: 900 }}>{formatPrice(producto.precioVenta)}</span>
            )}
          </div>

          {producto.ventasSimuladas > 0 && (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#8d4f00', marginBottom: 12 }}>
              🔥 {producto.ventasSimuladas} vendidos
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowUpsell(true); }} style={{
              flex: 1, minHeight: 52, background: '#f28c00', color: '#181c1e',
              border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
              fontSize: 16, fontWeight: 900, cursor: 'pointer',
              fontFamily: '"Inter", sans-serif', transition: 'transform 0.1s'
            }}>
              🛒 Comprar
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }} style={{
              minHeight: 52, padding: '0 14px', background: '#ffffff', color: '#181c1e',
              border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
              fontSize: 16, cursor: 'pointer', fontFamily: '"Inter", sans-serif'
            }} title="Vista rápida">
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
