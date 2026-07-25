'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function UpsellPopup({ productoId, onClose }) {
  const [producto, setProducto] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!productoId) return;
    api.get(`/api/producto/${productoId}`)
      .then(({ data }) => setProducto(data))
      .catch(() => setProducto({ relacionado: [] }));
    requestAnimationFrame(() => setVisible(true));
  }, [productoId]);

  if (!producto) return null;

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const relacionados = producto.relacionados || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
        width: 'min(480px, 95vw)', maxHeight: '85vh', overflow: 'auto', fontFamily: '"Inter", sans-serif'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          background: '#ff8c00', color: '#fff', padding: '14px 20px', fontSize: 17, fontWeight: 800,
          borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          ⚡ Confirmar compra
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#fff' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {relacionados.length > 0 && (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#564334', marginBottom: 16, textAlign: 'center' }}>
                Estos productos combinan perfecto con lo que llevas
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {relacionados.slice(0, 3).map(rp => {
                  const precio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
                  const tieneOferta = rp.ofertaActiva && rp.ofertaPrecio && new Date(rp.ofertaHasta) > new Date();
                  return (
                    <a key={rp.id} href={""/comprar/${rp.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                      background: '#f8f9ff', borderRadius: 8, border: '1px solid #E2E8F0',
                      textDecoration: 'none', color: '#0b1c30', transition: 'box-shadow 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      {rp.imagen ? (
                        <img src={rp.imagen} alt={rp.nombre} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, flexShrink: 0, background: '#F8F9FA' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0, background: '#F8F9FA' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rp.nombre}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: tieneOferta ? '#ba1a1a' : '#0b1c30' }}>{formatPrice(precio)}</span>
                          {tieneOferta && <span style={{ fontSize: 12, color: '#897362', textDecoration: 'line-through' }}>{formatPrice(rp.precioVenta)}</span>}
                        </div>
                      </div>
                      <span style={{ background: '#ff8c00', color: '#fff', fontWeight: 700, fontSize: 12, padding: '5px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}>+ Agregar</span>
                    </a>
                  );
                })}
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={""/comprar/${productoId}`} style={{
              flex: 1, minHeight: 44, background: '#ff8c00', color: '#fff', borderRadius: 8,
              textDecoration: 'none', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>🛒 Ir al checkout</a>
            <a href={""/comprar/${productoId}`} style={{
              minHeight: 44, padding: '0 20px', background: '#fff', color: '#2D2D2D', border: '2px solid #2D2D2D', borderRadius: 8,
              textDecoration: 'none', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center'
            }}>Solo este producto</a>
          </div>
        </div>
      </div>
    </div>
  );
}
