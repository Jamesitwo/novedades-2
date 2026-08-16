'use client';

import Icon from './Icon';

export default function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, total }) {
  if (!totalPages || totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 16px',
        borderTop: '1px solid var(--border)'
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>
        {total != null ? `${total} registro${total !== 1 ? 's' : ''} · ` : ''}Página {page} de {totalPages}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              padding: '8px 10px',
              fontSize: 12,
              cursor: 'pointer',
              minHeight: 40
            }}
          >
            {[10, 20, 50, 100].map(n => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
        )}
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
          style={{
            minWidth: 40, minHeight: 40, borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: page <= 1 ? 0.4 : 1
          }}
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
          style={{
            minWidth: 40, minHeight: 40, borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: page >= totalPages ? 0.4 : 1
          }}
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </div>
  );
}
