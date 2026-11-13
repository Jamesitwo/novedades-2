'use client';

// Selector de producto con busqueda: se escribe parte del nombre (o el id) y
// la lista muestra la foto de cada producto para identificarlo rapido.
//   productos: { [id]: { name, image } }
import { useState, useEffect, useRef, useMemo } from 'react';

const normalizar = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const MAX = 60;

function Foto({ src, size }) {
  const [rota, setRota] = useState(false);
  const caja = { width: size, height: size, borderRadius: 6, flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg3)' };
  if (!src || rota) {
    return <div style={{ ...caja, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: size > 30 ? 14 : 11 }}>📦</div>;
  }
  return <img src={src} alt="" loading="lazy" style={{ ...caja, objectFit: 'cover' }} onError={() => setRota(true)} />;
}

export default function SelectorProducto({ productos = {}, value, onSelect, placeholder = 'Escribe el nombre del producto…', autoFocus = false, style }) {
  const actual = value ? productos[String(value)] : null;
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const cajaRef = useRef(null);
  const listaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fuera = e => { if (cajaRef.current && !cajaRef.current.contains(e.target)) { setAbierto(false); setTexto(''); } };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const lista = useMemo(() => {
    const todos = Object.entries(productos).map(([id, p]) => ({ id, name: p?.name || `#${id}`, image: p?.image || null }));
    const q = normalizar(texto).trim();
    if (!q) return todos.slice(0, MAX);
    const palabras = q.split(/\s+/);
    return todos
      .filter(p => { const n = normalizar(`${p.name} ${p.id}`); return palabras.every(w => n.includes(w)); })
      .sort((a, b) => normalizar(a.name).indexOf(palabras[0]) - normalizar(b.name).indexOf(palabras[0]))
      .slice(0, MAX);
  }, [productos, texto]);

  useEffect(() => { setActivo(0); }, [texto]);
  useEffect(() => {
    const el = listaRef.current?.children?.[activo];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  const elegir = p => {
    setAbierto(false);
    setTexto('');
    inputRef.current?.blur();
    if (p && String(p.id) !== String(value ?? '')) onSelect?.(p.id);
  };

  const teclas = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo(a => Math.min(a + 1, lista.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (abierto && lista[activo]) elegir(lista[activo]); }
    else if (e.key === 'Escape') { setAbierto(false); setTexto(''); inputRef.current?.blur(); }
  };

  return (
    <div ref={cajaRef} style={{ position: 'relative', flex: 1, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'var(--bg)', border: `1px solid ${abierto ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8 }}>
        {!abierto && actual && <Foto src={actual.image} size={26} />}
        <input
          ref={inputRef}
          type="text"
          value={abierto ? texto : (actual?.name || (value ? `#${value}` : ''))}
          placeholder={abierto && actual ? actual.name : placeholder}
          onFocus={() => { setAbierto(true); setTexto(''); }}
          onChange={e => { setTexto(e.target.value); setAbierto(true); }}
          onKeyDown={teclas}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', padding: '4px 0' }}
        />
        <span style={{ color: 'var(--text3)', fontSize: 10, pointerEvents: 'none' }}>▼</span>
      </div>
      {abierto && (
        <div ref={listaRef} role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, maxHeight: 300, overflowY: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
          {lista.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>Ningun producto coincide con “{texto}”</div>
          ) : lista.map((p, k) => {
            const sel = String(p.id) === String(value ?? '');
            return (
              <div key={p.id} role="option" aria-selected={sel}
                onMouseDown={e => { e.preventDefault(); elegir(p); }}
                onMouseEnter={() => setActivo(k)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', cursor: 'pointer', background: k === activo ? 'var(--bg3)' : 'transparent', borderLeft: `3px solid ${sel ? 'var(--accent)' : 'transparent'}` }}>
                <Foto src={p.image} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: sel ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>#{p.id}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
