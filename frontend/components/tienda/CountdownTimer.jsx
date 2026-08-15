'use client';
import { useState, useEffect } from 'react';

export default function CountdownTimer({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endsAt) return;
    const calc = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setTimeLeft(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, urgent: diff < 3600000 });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!timeLeft) return <span style={{ fontSize: 12, fontWeight: 700, color: '#ba1a1a' }}>Finalizada</span>;

  return (
    <span style={{
      fontFamily: '"Inter", monospace', fontSize: 15, fontWeight: 800, color: timeLeft.urgent ? '#ba1a1a' : '#0b1c30',
      background: '#ffdad6', padding: '4px 10px', borderRadius: 8,
      letterSpacing: 1, display: 'inline-block',
      animation: timeLeft.urgent ? 'pulse-red 1s infinite' : 'none'
    }}>
      ⏱ {timeLeft.text}
    </span>
  );
}
