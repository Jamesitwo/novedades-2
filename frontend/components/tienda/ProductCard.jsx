'use client';
import { useState } from 'react';
import UpsellPopup from './UpsellPopup';

export default function ProductCard({ producto }) {
  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const [showUpsell, setShowUpsell] = useState(false);

  return (
    <a href={`/tienda/${producto.id}`} className="industrial-card" style={{
      textDecoration: 'none', color: '#181c1e', display: 'flex', flexDirection: 'column',
      background: '#ffffff', border: '2px solid #181c1e',
      boxShadow: '4px 4px 0px 0px #181c1e', position: 'relative',
      transition: 'transform 0.15s, box-shadow 0.15s'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}>
      
      {tieneOferta && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 2,
          background: '#f28c00', color: '#181c1e', fontSize: 14, fontWeight: 900,
          padding: '4px 12px', border: '2px solid #181c1e', boxShadow: '2px 2px 0px 0px #181c1e'
        }}>
          -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}%
        </div>
      )}

      {producto.stock > 0 && producto.stock <= 5 && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: '#ffdad6', color: '#93000a', fontSize: 12, fontWeight: 900,
          padding: '4px 12px', border: '2px solid #ba1a1a'
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
        <span style={{
          fontSize: 12, fontWeight: 900, color: '#f28c00', textTransform: 'uppercase',
          letterSpacing: 2, marginBottom: 8
        }}>
          {producto.categoria}
        </span>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, lineHeight: 1.3, flex: 1 }}>
          {producto.nombre}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          {tieneOferta ? (
            <>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#ba1a1a' }}>
                {formatPrice(producto.ofertaPrecio)}
              </span>
              <span style={{ fontSize: 16, color: '#887362', textDecoration: 'line-through', fontWeight: 700 }}>
                {formatPrice(producto.precioVenta)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 28, fontWeight: 900 }}>
              {formatPrice(producto.precioVenta)}
            </span>
          )}
        </div>

        {producto.ventasSimuladas > 0 && (
          <div style={{ fontSize: 14, fontWeight: 700, color: '#8d4f00', marginBottom: 12 }}>
            🔥 {producto.ventasSimuladas} vendidos
          </div>
        )}

        <button onClick={(e) => { e.preventDefault(); setShowUpsell(true); }} style={{
          width: '100%', minHeight: 56, background: '#f28c00', color: '#181c1e',
          border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
          fontSize: 18, fontWeight: 900, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'transform 0.1s, box-shadow 0.1s', fontFamily: '"Inter", sans-serif'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #181c1e'; }}>
          🛒 Comprar
        </button>

        {showUpsell && <UpsellPopup productoId={producto.id} onClose={() => setShowUpsell(false)} />}
      </div>
    </a>
  );
}
