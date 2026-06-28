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
      position: 'fixed', bottom: 20, left: 20, zIndex: 9999,
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)',
      opacity: visible && !exiting ? 1 : 0,
      transform: visible && !exiting ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'all 0.4s ease',
      maxWidth: 320, cursor: 'pointer'
    }} onClick={() => { setExiting(true); setTimeout(() => onDone?.(), 400); }}>
      <span style={{ fontSize: 22 }}>🔥</span>
      <div>
        <div style={{ fontWeight: 500 }}>{data?.mensaje || '¡Alguien acaba de comprar!'}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Hace {data?.hace || 'un momento'}</div>
      </div>
    </div>
  );
}
