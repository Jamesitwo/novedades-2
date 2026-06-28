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
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!timeLeft) return <span style={{ fontSize: 11, color: 'var(--text3)' }}>Finalizada</span>;

  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: '#fff',
      background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 8,
      letterSpacing: 0.5
    }}>
      ⏱ {timeLeft}
    </span>
  );
}
