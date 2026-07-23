'use client';
import { useState, useEffect } from 'react';

export default function SocialProofToast({ data, onDone }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDone?.(), 400);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 24, zIndex: 9999,
      background: '#ffffff', border: '2px solid #181c1e',
      boxShadow: '4px 4px 0px 0px #181c1e',
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 15, fontWeight: 700, color: '#181c1e', fontFamily: '"Inter", sans-serif',
      opacity: visible && !exiting ? 1 : 0,
      transform: visible && !exiting ? 'translateX(0)' : 'translateX(-120%)',
      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      maxWidth: 340, cursor: 'pointer'
    }} onClick={() => { setExiting(true); setTimeout(() => onDone?.(), 400); }}>
      <span style={{
        fontSize: 24, background: '#f28c00', color: '#181c1e',
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid #181c1e', flexShrink: 0
      }}>
        🔥
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>
          {data?.mensaje || '¡Alguien acaba de comprar!'}
        </div>
        <div style={{ fontSize: 12, color: '#887362', marginTop: 3, fontWeight: 600 }}>
          Hace {data?.hace || 'un momento'}
        </div>
      </div>
    </div>
  );
}
