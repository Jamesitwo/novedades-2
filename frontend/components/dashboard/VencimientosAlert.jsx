import Link from 'next/link';

export default function VencimientosAlert({ pedidos }) {
  if (!pedidos || pedidos.length === 0) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const getDiasRestantes = (fechaLimite) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    const diff = Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="table-card" style={{ marginTop: 16 }}>
      <div className="table-header">
        <span className="table-header-title">Pedidos por vencer</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Transportadora</th>
            <th>Fecha límite</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => {
            const dias = getDiasRestantes(pedido.fechaLimite);
            const esHoy = dias <= 0;
            return (
              <tr key={pedido.id}>
                <td>
                  <div className="td-name">{pedido.nombre} {pedido.apellido}</div>
                  <div className="td-mono" style={{ color: 'var(--text3)' }}>{pedido.celular}</div>
                </td>
                <td>{pedido.producto}</td>
                <td>{pedido.transportadora}</td>
                <td className="td-mono">
                  {formatDate(pedido.fechaLimite)}
                  {esHoy ? (
                    <span className="vence-tag vence-hoy">hoy</span>
                  ) : dias <= 3 ? (
                    <span className="vence-tag vence-pronto">{dias}d</span>
                  ) : null}
                </td>
                <td>
                  <Link href={`/oficina/${pedido.id}`} className="action-btn">Ver</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}