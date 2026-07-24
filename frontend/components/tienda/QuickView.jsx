'use client';
import { useState, useEffect } from 'react';

export default function QuickView({ producto, onClose }) {
  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s'
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', border: '2px solid #181c1e', boxShadow: '8px 8px 0px 0px #181c1e',
        width: 'min(560px, 95vw)', maxHeight: '90vh', overflow: 'auto', fontFamily: '"Inter", sans-serif'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative' }}>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: 280, objectFit: 'cover', borderBottom: '2px solid #181c1e', background: '#f1f4f6' }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: '100%', height: 280, background: '#f1f4f6', borderBottom: '2px solid #181c1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#887362', fontSize: 16, fontWeight: 700 }}>
              Sin imagen
            </div>
          )}
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 36, height: 36,
            background: '#ffffff', border: '2px solid #181c1e', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
          }}>✕</button>
          {tieneOferta && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: '#ba1a1a', color: '#fff', fontSize: 14, fontWeight: 900,
              padding: '4px 12px', border: '2px solid #181c1e'
            }}>
              -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
            </div>
          )}
        </div>
        <div style={{ padding: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#f28c00', textTransform: 'uppercase', letterSpacing: 2 }}>
            {producto.categoria}
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0', color: '#181c1e' }}>
            {producto.nombre}
          </h2>
          {producto.descripcion && (
            <p style={{ fontSize: 15, color: '#554334', lineHeight: 1.5, marginBottom: 16 }}>{producto.descripcion}</p>
          )}
          <div style={{ marginBottom: 16 }}>
            {tieneOferta ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#ba1a1a' }}>{formatPrice(producto.ofertaPrecio)}</span>
                <span style={{ fontSize: 18, color: '#887362', textDecoration: 'line-through' }}>{formatPrice(producto.precioVenta)}</span>
              </div>
            ) : (
              <span style={{ fontSize: 32, fontWeight: 900 }}>{formatPrice(producto.precioVenta)}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, fontSize: 14, fontWeight: 700 }}>
            <span style={{ color: producto.stock > 5 ? '#22c55e' : producto.stock > 0 ? '#ba1a1a' : '#887362' }}>
              {producto.stock > 0 ? `✅ ${producto.stock} disponibles` : '❌ Agotado'}
            </span>
            {producto.ventasSimuladas > 0 && (
              <span style={{ color: '#8d4f00' }}>🔥 {producto.ventasSimuladas} vendidos</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`/tienda/comprar/${producto.id}`} style={{
              flex: 1, minHeight: 52, background: '#f28c00', color: '#181c1e',
              border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
              textDecoration: 'none', fontWeight: 900, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              🛒 Comprar ahora
            </a>
            <a href={`/tienda/${producto.id}`} style={{
              minHeight: 52, padding: '0 20px', background: '#ffffff', color: '#181c1e',
              border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center'
            }}>
              Ver detalle →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

