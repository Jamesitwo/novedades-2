'use client';

import Icon from './Icon';

export default function EmptyState({ icon = 'inbox', title, text, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
      <Icon name={icon} size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
      {title && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>{title}</div>}
      {text && <div style={{ fontSize: 13, maxWidth: 360, margin: '0 auto' }}>{text}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
