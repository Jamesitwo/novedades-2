'use client';

export default function WhatsAppButton() {
  return (
    <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
      width: 52, height: 52, background: '#25D366', color: '#fff',
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 24, textDecoration: 'none', cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(37,211,102,0.3)', transition: 'transform 0.15s, box-shadow 0.15s'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,211,102,0.45)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.3)'; }}
    title="Chatea con nosotros por WhatsApp">
      💬
    </a>
  );
}
