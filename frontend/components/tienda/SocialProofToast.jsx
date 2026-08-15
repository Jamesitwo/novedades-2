'use client';
import { useState, useEffect, useRef } from 'react';

export default function SocialProofToast({ data, onDone }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => { setExiting(true); setTimeout(() => onDoneRef.current?.(), 400); }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 24, zIndex: 9995,
      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#0b1c30',
      fontFamily: '"Inter", sans-serif', width: 'min(320px, calc(100vw - 48px))', maxWidth: 320, cursor: 'pointer',
      opacity: visible && !exiting ? 1 : 0,
      transform: visible && !exiting ? 'translateX(0)' : 'translateX(-120%)',
      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
    }} onClick={() => { setExiting(true); setTimeout(() => onDoneRef.current?.(), 400); }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔥</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{data?.mensaje || '¡Alguien acaba de comprar!'}</div>
        <div style={{ fontSize: 11, color: '#897362', marginTop: 2, fontWeight: 500 }}>Hace {data?.hace || 'un momento'}</div>
      </div>
    </div>
  );
}
