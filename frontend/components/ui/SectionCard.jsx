'use client';

import Icon from './Icon';

export default function SectionCard({
  title,
  icon,
  count,
  actions,
  children,
  collapsible = false,
  open = true,
  onToggle,
  style = {},
  bodyStyle = {}
}) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        ...style
      }}
    >
      <div
        onClick={collapsible ? onToggle : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          cursor: collapsible ? 'pointer' : 'default',
          userSelect: 'none',
          background: 'var(--bg3)',
          minHeight: 44
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text2)',
            fontFamily: 'var(--label-font)'
          }}
        >
          {collapsible && <Icon name={open ? 'expand_more' : 'chevron_right'} size={18} />}
          {icon && <Icon name={icon} size={18} style={{ color: 'var(--accent2)' }} />}
          {title}
          {count != null && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({count})</span>}
        </span>
        {actions && <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</span>}
      </div>
      {open && <div style={{ padding: 14, ...bodyStyle }}>{children}</div>}
    </div>
  );
}
