'use client';
import { useState, useEffect } from 'react';

export default function WhatsAppButton({ phone, mensaje }) {
  const numero = phone || '573000000000';
  const [showTooltip, setShowTooltip] = useState(false);
  const [msgDinamico, setMsgDinamico] = useState(mensaje || '');

  useEffect(() => {
    if (mensaje) setMsgDinamico(mensaje);
  }, [mensaje]);

  useEffect(() => {
    const handler = (e) => {
      setMsgDinamico(e.detail?.mensaje || '');
    };
    window.addEventListener('pizdo-whatsapp-message', handler);
    return () => window.removeEventListener('pizdo-whatsapp-message', handler);
  }, []);

  useEffect(() => {
    const show = () => setShowTooltip(true);
    const hide = () => setShowTooltip(false);
    const initial = setTimeout(show, 5000);
    const interval = setInterval(() => { show(); setTimeout(hide, 4000); }, 25000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, []);

  const mensajeEncoded = msgDinamico ? `?text=${encodeURIComponent(msgDinamico)}` : '';

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9990 }}>
      {showTooltip && (
        <div style={{
          position: 'absolute', bottom: 60, right: 0, whiteSpace: 'nowrap',
          background: '#fff', color: '#0b1c30', padding: '8px 14px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          animation: 'slide-up 0.3s ease', border: '1px solid #E2E8F0'
        }}>
          {msgDinamico ? `¿Consultar sobre este producto? 💬` : '¿Necesitas ayuda? 💬'}
          <div style={{ position: 'absolute', bottom: -6, right: 16, width: 12, height: 12, background: '#fff', transform: 'rotate(45deg)', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }} />
        </div>
      )}
      <a href={`https://wa.me/${numero}${mensajeEncoded}`} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 52, height: 52, background: '#25D366', color: '#fff', borderRadius: '50%',
        fontSize: 24, textDecoration: 'none', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(37,211,102,0.3)', transition: 'transform 0.15s, box-shadow 0.15s'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,211,102,0.45)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.3)'; }}
      onClick={() => setShowTooltip(false)}
      title="Chatea con nosotros por WhatsApp">
        💬
      </a>
    </div>
  );
}
