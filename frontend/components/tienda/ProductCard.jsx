'use client';

export default function ProductCard({ producto }) {
  const formatPrice = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  const tieneOferta = producto.ofertaActiva && producto.ofertaPrecio && new Date(producto.ofertaHasta) > new Date();

  return (
    <a href={`/tienda/${producto.id}`} style={{
      textDecoration: 'none', color: 'inherit', display: 'block',
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
      overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
      
      {tieneOferta && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 10px', borderRadius: 8
        }}>
          -{Math.round((1 - producto.ofertaPrecio / producto.precioVenta) * 100)}% OFF
        </div>
      )}

      {producto.stock > 0 && producto.stock <= 5 && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          background: 'rgba(239,68,68,0.15)', color: 'var(--red)', fontSize: 10, fontWeight: 700,
          padding: '3px 10px', borderRadius: 8, border: '1px solid var(--red)'
        }}>
          Solo {producto.stock}
        </div>
      )}

      {producto.imagen ? (
        <img src={producto.imagen} alt={producto.nombre}
          style={{ width: '100%', height: 180, objectFit: 'cover', background: 'var(--bg3)' }}
          onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:180px;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:12px">Sin imagen</div>'; }} />
      ) : (
        <div style={{ width: '100%', height: 180, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>Sin imagen</div>
      )}

      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {producto.nombre}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          {tieneOferta ? (
            <>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--red)' }}>
                {formatPrice(producto.ofertaPrecio)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)', textDecoration: 'line-through', fontFamily: 'var(--mono)' }}>
                {formatPrice(producto.precioVenta)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
              {formatPrice(producto.precioVenta)}
            </span>
          )}
        </div>

        {producto.ventasSimuladas > 0 && (
          <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 4 }}>
            🔥 {producto.ventasSimuladas} vendidos
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 10px', borderRadius: 10 }}>
            {producto.categoria}
          </span>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Ver más →</span>
        </div>
      </div>
    </a>
  );
}
