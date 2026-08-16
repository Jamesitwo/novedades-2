'use client';

export default function Field({ label, required, error, hint, children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text3)',
          fontFamily: 'var(--label-font)'
        }}>
          {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 500 }}>{error}</span>}
    </div>
  );
}
