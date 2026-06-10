export function TableSkeleton({ rows = 5, columns = 7 }) {
  return (
    <div style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg3)' }}>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton-line" style={{ width: '80%', height: 12 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="skeleton-line" style={{ width: colIndex === 0 ? '60%' : '70%', height: 14 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card" style={{ padding: 18, borderRadius: 10 }}>
      <div className="skeleton-line" style={{ width: '50%', height: 11, marginBottom: 12 }} />
      <div className="skeleton-line" style={{ width: '40%', height: 28 }} />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="stats-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}