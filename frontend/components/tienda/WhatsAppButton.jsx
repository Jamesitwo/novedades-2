'use client';

export default function WhatsAppButton() {
  return (
    <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
      width: 60, height: 60, background: '#25D366', color: '#fff',
      border: '2px solid #181c1e', boxShadow: '4px 4px 0px 0px #181c1e',
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, textDecoration: 'none', transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'pointer'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px, -2px) scale(1.05)'; e.currentTarget.style.boxShadow = '6px 6px 0px 0px #181c1e'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #181c1e'; }}
    title="Chatea con nosotros por WhatsApp">
      💬
    </a>
  );
}
