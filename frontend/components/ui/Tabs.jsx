'use client';

export default function Tabs({ tabs, value, onChange, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'var(--bg3)',
        borderRadius: 8,
        padding: 3,
        width: 'fit-content',
        maxWidth: '100%',
        flexWrap: 'wrap',
        ...style
      }}
    >
      {tabs.map(tab => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--text2)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
            {tab.count != null && <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
