'use client';

import Icon from './Icon';

const VARIANTS = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    hover: { filter: 'brightness(1.1)' }
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--border)',
    hover: { background: 'var(--bg3)', color: 'var(--text)' }
  },
  secondary: {
    background: 'var(--bg3)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    hover: { background: 'var(--bg4)' }
  },
  success: {
    background: 'var(--green)',
    color: '#fff',
    border: 'none',
    hover: { filter: 'brightness(1.1)' }
  },
  danger: {
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
    hover: { filter: 'brightness(1.1)' }
  },
  dangerGhost: {
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid var(--red)',
    hover: { background: 'rgba(239,68,68,0.1)' }
  }
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const sizes = {
    sm: { padding: '5px 10px', fontSize: 12 },
    md: { padding: '8px 14px', fontSize: 13 },
    lg: { padding: '10px 18px', fontSize: 14 }
  };
  const s = sizes[size] || sizes.md;

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 8,
        fontWeight: 500,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        fontFamily: 'var(--font)',
        ...v,
        ...s,
        ...style
      }}
    >
      {loading ? <Icon name="progress_activity" size={16} className="spin" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}
