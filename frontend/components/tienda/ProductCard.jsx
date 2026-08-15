'use client';
import { useState, useEffect, useRef } from 'react';
import UpsellPopup from './UpsellPopup';
import QuickView from './QuickView';
import { useCartStore } from '@/store/cartStore';

export default function ProductCard({ producto, onFavChange }) {
  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();
  const [showUpsell, setShowUpsell] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [faved, setFaved] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('pizdo_favs') || '[]');
      setFaved(Array.isArray(favs) && favs.includes(producto.id));
    } catch {
      // localStorage no disponible: se deja sin favorito
    }
  }, [producto.id]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { addItem } = useCartStore();

  const handleBuy = (e) => {
    e.preventDefault(); e.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 800);
    addItem(producto);
    window.dispatchEvent(new Event('pizdo-cart-add'));
    if (typeof window !== 'undefined' && window.fbq) {
      const precioProd = producto.ofertaActiva && producto.ofertaPrecio ? producto.ofertaPrecio : producto.precioVenta;
      window.fbq('track', 'AddToCart', {
        content_name: producto.nombre,
        content_ids: [producto.id],
        content_type: 'product',
        value: precioProd,
        currency: 'COP'
      });
    }
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

  return (
    <div ref={cardRef} style={{
      position: 'relative', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease', height: '100%', width: '100%', minWidth: 0
    }}>
      <a href={`/producto/${producto.slug || producto.id}`} style={{
        textDecoration: 'none', color: '#0f172a', display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden', minWidth: 0
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
        
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tieneOferta && (
            <span className="shimmer-badge" style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 2px 6px rgba(220,38,38,0.3)' }}>
              -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
            </span>
          )}
          {esTop && (
            <span className="shimmer-badge" style={{ background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
              ★ TOP VENDIDO
            </span>
          )}
          {esNuevo && (
            <span className="shimmer-badge" style={{ background: '#ea580c', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
              NUEVO
            </span>
          )}
        </div>

        <button onClick={toggleFav} style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2, width: 34, height: 34,
          background: faved ? '#fef2f2' : 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', borderRadius: 10,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)', backdropFilter: 'blur(4px)'
        }}>
          {faved ? '❤️' : '🤍'}
        </button>

        <div style={{ height: 190, overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottom: '1px solid #f1f5f9' }}>
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s ease' }}
              onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;font-weight:500">Sin imagen</div>'; }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Sin imagen</div>
          )}
        </div>

        <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
            {producto.categoria || 'Herramientas'}
          </span>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 40, color: '#0f172a' }}>
            {producto.nombre}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, color: '#f59e0b', fontSize: 13 }}>
            {'★'.repeat(5)} {producto.ventasSimuladas > 0 && <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, marginLeft: 4 }}>({producto.ventasSimuladas} ventas)</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            {tieneOferta ? (
              <>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{formatPrice(producto.ofertaPrecio)}</span>
                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through', fontWeight: 500 }}>{formatPrice(producto.precioVenta)}</span>
              </>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{formatPrice(producto.precioVenta)}</span>
            )}
          </div>

          {producto.stock > 0 && producto.stock <= 5 && (
            <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>⚡ ¡Solo quedan {producto.stock} unidades!</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button onClick={handleBuy} style={{
              flex: 1, minHeight: 42, background: clicked ? '#16a34a' : '#ea580c', color: '#ffffff',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
              transition: 'all 0.2s', boxShadow: clicked ? 'none' : '0 4px 12px rgba(234,88,12,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
            onMouseEnter={e => { if (!clicked) { e.currentTarget.style.background = '#c2410c'; } }}
            onMouseLeave={e => { if (!clicked) { e.currentTarget.style.background = '#ea580c'; } }}>
              {clicked ? '✓ Agregado' : '🛒 Agregar al carrito'}
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }} style={{
              minHeight: 42, width: 42, background: '#f8fafc', color: '#0f172a', border: '1.5px solid #e2e8f0',
              borderRadius: 10, fontSize: 15, cursor: 'pointer', fontFamily: '"Inter", sans-serif', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }} title="Vista rápida">
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
