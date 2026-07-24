'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function UpsellPopup({ productoId, onClose }) {
  const [producto, setProducto] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!productoId) return;
    api.get(`/api/tienda/${productoId}`)
      .then(({ data }) => setProducto(data))
      .catch(() => {});
    requestAnimationFrame(() => setVisible(true));
  }, [productoId]);

  if (!producto || !producto.relacionados?.length) return null;

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s'
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', border: '2px solid #181c1e', boxShadow: '8px 8px 0px 0px #181c1e',
        width: 'min(520px, 95vw)', maxHeight: '88vh', overflow: 'auto', fontFamily: '"Inter", sans-serif'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          background: '#f28c00', color: '#181c1e', padding: '14px 20px',
          borderBottom: '2px solid #181c1e', fontSize: 18, fontWeight: 900,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          ⚡ ¡No te vayas sin ver esto!
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#181c1e' }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#554334', marginBottom: 16, textAlign: 'center' }}>
            Estos productos combinan perfecto con lo que llevas
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {producto.relacionados.slice(0, 3).map(rp => {
              const precio = rp.ofertaActiva && rp.ofertaPrecio ? rp.ofertaPrecio : rp.precioVenta;
              const tieneOferta = rp.ofertaActiva && rp.ofertaPrecio && new Date(rp.ofertaHasta) > new Date();
              return (
                <a key={rp.id} href={`/tienda/comprar/${rp.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                  background: '#f1f4f6', border: '2px solid #181c1e',
                  textDecoration: 'none', color: '#181c1e',
                  boxShadow: '3px 3px 0px 0px #181c1e',
                  transition: 'transform 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translate(-1px, -1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  {rp.imagen ? (
                    <img src={rp.imagen} alt={rp.nombre} style={{ width: 56, height: 56, objectFit: 'cover', border: '2px solid #181c1e', flexShrink: 0, background: '#fff' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 56, height: 56, border: '2px solid #181c1e', flexShrink: 0, background: '#fff' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rp.nombre}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: tieneOferta ? '#ba1a1a' : '#181c1e' }}>
                        {formatPrice(precio)}
                      </span>
                      {tieneOferta && (
                        <span style={{ fontSize: 12, color: '#887362', textDecoration: 'line-through' }}>
                          {formatPrice(rp.precioVenta)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    background: '#f28c00', color: '#181c1e', fontWeight: 800, fontSize: 12,
                    padding: '6px 14px', border: '2px solid #181c1e', whiteSpace: 'nowrap'
                  }}>
                    + Agregar
                  </span>
                </a>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`/tienda/comprar/${productoId}`} style={{
              flex: 1, minHeight: 48, background: '#f28c00', color: '#181c1e',
              border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
              textDecoration: 'none', fontWeight: 900, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translate(-1px, -1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              🛒 Ir al checkout
            </a>
            <a href={`/tienda/comprar/${productoId}`} style={{
              minHeight: 48, padding: '0 20px', background: '#ffffff', color: '#181c1e',
              border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
              textDecoration: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center'
            }}>
              Solo este producto
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
