'use client';
import { useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';

export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, removeItem, updateQuantity, getTotal, init } = useCartStore();

  useEffect(() => { init(); }, []);

  if (!drawerOpen) return null;

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const total = getTotal();

  return (
    <>
      <div onClick={closeDrawer} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9990
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 90vw)', zIndex: 9991,
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', fontFamily: '"Inter", -apple-system, sans-serif'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 800, fontSize: 18, color: '#0b1c30'
        }}>
          🛒 Carrito ({items.reduce((s, i) => s + i.cantidad, 0)})
          <button onClick={closeDrawer} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#897362' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#897362', fontSize: 15, fontWeight: 600 }}>
              🛒 Tu carrito está vacío
              <br />
              <a href="/#catalogo" onClick={closeDrawer} style={{ color: '#ff8c00', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 12, display: 'inline-block' }}>
                Ir al catálogo →
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #E2E8F0',
                  alignItems: 'center'
                }}>
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.nombre} style={{
                      width: 56, height: 56, objectFit: 'contain', borderRadius: 8,
                      background: '#F8F9FA', border: '1px solid #E2E8F0', flexShrink: 0
                    }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 8, background: '#F8F9FA', border: '1px solid #E2E8F0', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0b1c30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nombre}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0b1c30', marginTop: 2 }}>
                      {formatPrice(item.precio)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <button onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0b1c30' }}>
                        −
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0b1c30' }}>
                        +
                      </button>
                      <button onClick={() => removeItem(item.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 16, fontWeight: 800, color: '#0b1c30' }}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <a href={items.length === 1 ? `/comprar/${items[0].id}` : '#'} onClick={(e) => {
              if (items.length > 1) e.preventDefault();
              closeDrawer();
            }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', minHeight: 48, background: '#ff8c00', color: '#fff',
              borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(255,140,0,0.3)', cursor: 'pointer', border: 'none'
            }}>
              {items.length === 1 ? '🛒 Ir a checkout' : '🛒 Comprar productos'}
            </a>
          </div>
        )}
      </div>
    </>
  );
}
