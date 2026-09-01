'use client';

import { useState, useEffect, useRef } from 'react';

export default function Autocomplete({ value, onChange, options = [], placeholder, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filtered = (options || []).filter(o => {
    const name = String(o.name || o || '').toLowerCase();
    return name.includes(filter.toLowerCase());
  }).slice(0, 30);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{
          width: '100%', padding: '8px 10px', background: disabled ? 'var(--bg3)' : 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
          color: disabled ? 'var(--text3)' : 'var(--text)', outline: 'none',
          fontFamily: 'var(--font)', boxSizing: 'border-box', transition: 'border-color 0.2s'
        }}
      />
      {open && !disabled && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxHeight: 200, overflowY: 'auto'
        }}>
          {filtered.map((o, i) => (
            <div
              key={o.id || o.name || i}
              onClick={() => { onChange(o.name || o); setFilter(''); setOpen(false); }}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {o.name || o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
