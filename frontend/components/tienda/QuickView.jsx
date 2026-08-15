'use client';
import { useState, useEffect } from 'react';

export default function QuickView({ producto, onClose }) {
  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
        width: 'min(520px, 95vw)', maxHeight: '88vh', overflow: 'auto', fontFamily: '"Inter", sans-serif'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative', background: '#F8F9FA', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#897362', fontSize: 15, fontWeight: 500 }}>Sin imagen</div>
          )}
          <button onClick={onClose} aria-label="Cerrar vista rápida" style={{ position: 'absolute', top: 12, right: 12, width: 40, height: 40, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 0 }}>✕</button>
          {tieneOferta && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#ba1a1a', color: '#fff', fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>-{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}%</div>
          )}
        </div>
        <div style={{ padding: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ff8c00', textTransform: 'uppercase', letterSpacing: 1 }}>{producto.categoria}</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0', color: '#0b1c30' }}>{producto.nombre}</h2>
          {producto.descripcion && <p style={{ fontSize: 14, color: '#564334', lineHeight: 1.5, marginBottom: 16 }}>{producto.descripcion}</p>}
          <div style={{ marginBottom: 16 }}>
            {tieneOferta ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#ba1a1a' }}>{formatPrice(producto.ofertaPrecio)}</span>
                <span style={{ fontSize: 16, color: '#897362', textDecoration: 'line-through' }}>{formatPrice(producto.precioVenta)}</span>
              </div>
            ) : (
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0b1c30' }}>{formatPrice(producto.precioVenta)}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: producto.stock > 5 ? '#22c55e' : producto.stock > 0 ? '#ba1a1a' : '#897362' }}>
              {producto.stock > 0 ? `✅ ${producto.stock} disponibles` : '❌ Agotado'}
            </span>
            {producto.ventasSimuladas > 0 && <span style={{ color: '#904d00' }}>🔥 {producto.ventasSimuladas} vendidos</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`/comprar/${producto.id}`} style={{
              flex: 1, minHeight: 48, background: '#ff8c00', color: '#fff', borderRadius: 8,
              textDecoration: 'none', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>🛒 Comprar ahora</a>
            <a href={`/producto/${producto.id}`} style={{
              minHeight: 48, padding: '0 20px', background: '#fff', color: '#2D2D2D', border: '2px solid #2D2D2D', borderRadius: 8,
              textDecoration: 'none', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center'
            }}>Ver detalle →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
