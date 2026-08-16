'use client';

import Icon from './Icon';

const SPARK_SIZES = [35, 50, 40, 65, 55, 45, 70, 60, 80, 75, 90, 100];

export default function KpiCard({
  label,
  value,
  icon,
  color = 'var(--accent)',
  delta,
  deltaUp = true,
  sub,
  sparkline,
  sparkColor,
  style = {}
}) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 120,
        transition: 'background 0.15s',
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text3)',
            fontFamily: 'var(--label-font)'
          }}
        >
          {label}
        </span>
        {icon && <Icon name={icon} size={18} style={{ color }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>
              {value}
            </span>
            {delta != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  padding: '1px 6px',
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${deltaUp ? 'var(--green)' : 'var(--red)'} 14%, transparent)`,
                  color: deltaUp ? 'var(--green)' : 'var(--red)'
                }}
              >
                <Icon name={deltaUp ? 'arrow_upward' : 'arrow_downward'} size={12} />
                {delta}
              </span>
            )}
          </div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
        </div>
        {sparkline && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36, flexShrink: 0 }}>
            {sparkline.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: `${h}%`,
                  minHeight: 2,
                  borderRadius: '1px 1px 0 0',
                  background: sparkColor || color
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function randomSpark() {
  return SPARK_SIZES.map(() => 15 + Math.round(Math.random() * 85));
}
