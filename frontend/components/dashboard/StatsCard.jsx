export default function StatsCard({ title, value, color, subtitle }) {
  const colorMap = {
    '#667eea': 'blue',
    '#f59e0b': 'amber',
    '#10b981': 'green',
    '#ef4444': 'red',
    '#8b5cf6': 'purple'
  };

  const colorClass = colorMap[color] || 'blue';

  return (
    <div className={`stat-card c-${colorClass}`}>
      <div className="stat-label">{title}</div>
      <div className={`stat-value ${colorClass}`}>{value}</div>
      {subtitle && <div className="stat-sub">{subtitle}</div>}
    </div>
  );
}