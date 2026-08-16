'use client';

export const STATUS_MAP = {
  novedad: { label: 'Novedad', color: 'var(--amber)' },
  contactado: { label: 'Contactado', color: 'var(--accent2)' },
  solucionado: { label: 'Solucionado', color: 'var(--green)' },
  cancelado: { label: 'Cancelado', color: 'var(--red)' },
  devolucion: { label: 'Devolución', color: 'var(--purple)' },
  pendiente_llamar: { label: 'Pend. llamar', color: 'var(--amber)' },
  va_a_recoger: { label: 'Va a recoger', color: 'var(--green)' },
  no_va_a_recoger: { label: 'No recoge', color: 'var(--red)' },
  pendiente: { label: 'Pendiente', color: 'var(--amber)' },
  pagada: { label: 'Pagada', color: 'var(--green)' },
  anulada: { label: 'Anulada', color: 'var(--red)' },
  activo: { label: 'Activo', color: 'var(--green)' },
  inactivo: { label: 'Inactivo', color: 'var(--red)' }
};

export default function StatusBadge({ status, label, color, icon, style = {} }) {
  const meta = STATUS_MAP[status] || {};
  const c = color || meta.color || 'var(--text2)';
  const l = label || meta.label || status;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: `color-mix(in srgb, ${c} 14%, transparent)`,
        color: c,
        border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
      {icon}
      {l}
    </span>
  );
}
