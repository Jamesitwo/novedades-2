'use client';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: '"Inter", sans-serif'
    }} onClick={onCancel}>
      <div style={{
        background: '#ffffff', border: '2px solid #181c1e', boxShadow: '8px 8px 0px 0px #181c1e',
        width: 'min(420px, 92vw)', padding: 32, textAlign: 'center'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 56, height: 56, background: '#f28c00', color: '#181c1e',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, border: '2px solid #181c1e', fontSize: 24
        }}>
          ⚠
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#181c1e', marginBottom: 8 }}>
          ¿Estás seguro?
        </div>
        <p style={{ fontSize: 15, color: '#554334', marginBottom: 28, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            minHeight: 48, padding: '0 28px', background: '#ffffff', color: '#181c1e',
            border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: '"Inter", sans-serif'
          }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{
            minHeight: 48, padding: '0 28px', background: '#ba1a1a', color: '#ffffff',
            border: '2px solid #181c1e', boxShadow: '3px 3px 0px 0px #181c1e',
            fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: '"Inter", sans-serif'
          }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
