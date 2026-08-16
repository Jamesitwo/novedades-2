'use client';

import Icon from './Icon';

const SIZES = {
  sm: 400,
  md: 520,
  lg: 640
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  hideClose = false
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: 'min(100%, ' + (SIZES[size] || SIZES.md) + 'px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '18px 20px',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title && <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {!hideClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text3)',
                padding: 4,
                borderRadius: 6,
                display: 'flex'
              }}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '14px 20px',
              borderTop: '1px solid var(--border)'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
