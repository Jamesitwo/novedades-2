'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function PedidosAdminPage() {
  const router = useRouter();
  const { isAuthenticated, initialized, initialize, usuario } = useAuthStore();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [pagoFilter, setPagoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const LIMIT = 15;

  useEffect(() => { initialize(); }, []);
  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) { router.push('/admin/login'); return; }
    if (usuario?.rol !== 'admin') { router.push('/admin/dashboard'); return; }
  }, [initialized, isAuthenticated, usuario, router]);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (estadoFilter) params.append('estado', estadoFilter);
      if (pagoFilter) params.append('metodoPago', pagoFilter);
      if (search) params.append('search', search);
      const { data } = await api.get(`/api/pedidos?${params}`);
      setPedidos(data.pedidos || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAuthenticated && usuario?.rol === 'admin') fetchPedidos(); }, [page, estadoFilter, pagoFilter, search, isAuthenticated, usuario]);

  const handleEstado = async (id, estado) => {
    await api.put(`/api/pedidos/${id}`, { estado });
    showToast('Estado actualizado');
    fetchPedidos();
    if (detail?.id === id) setDetail({ ...detail, estado });
  };

  const handlePagado = async (id, pagado) => {
    await api.put(`/api/pedidos/${id}`, { pagado });
    showToast(pagado ? 'Marcado como pagado' : 'Desmarcado como pagado');
    fetchPedidos();
    if (detail?.id === id) setDetail({ ...detail, pagado });
  };

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/api/pedidos/${id}`);
      setDetail(data);
    } catch { showToast('Error al cargar detalle', 'error'); }
  };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const formatDate = (d) => new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const estadoColors = {
    pendiente: '#feb700', confirmado: '#2196F3', enviado: '#ff8c00', entregado: '#22c55e', cancelado: '#ba1a1a'
  };

  if (!initialized || !isAuthenticated || usuario?.rol !== 'admin') return null;

  return (
    <div style={{ maxWidth: 1200, padding: '24px', minHeight: '100%', fontFamily: '"Inter", sans-serif', color: '#0b1c30' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .pedido-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .pedido-table th { background: #eff4ff; border-bottom: 1px solid #E2E8F0; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #564334; text-align: left; white-space: nowrap; }
        .pedido-table td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
        .pedido-table tr:hover td { background: #eff4ff; cursor: pointer; }
        @media (max-width: 768px) { .pedido-table th, .pedido-table td { padding: 6px 8px; font-size: 11px; } }
      `}} />

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#ba1a1a' : '#22c55e', color: '#fff', padding: '12px 20px', fontSize: 14, fontWeight: 600, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, borderLeft: '4px solid #ff8c00', paddingLeft: 12, margin: 0 }}>
          📦 Pedidos ({total})
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, outline: 'none', minWidth: 200 }} />
        <select value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, outline: 'none', cursor: 'pointer', appearance: 'auto' }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmado">Confirmado</option>
          <option value="enviado">Enviado</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select value={pagoFilter} onChange={e => { setPagoFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, outline: 'none', cursor: 'pointer', appearance: 'auto' }}>
          <option value="">Todos los pagos</option>
          <option value="contraentrega">Contra entrega</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, fontSize: 16, fontWeight: 700, color: '#897362' }}>Cargando...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'auto' }}>
          <table className="pedido-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#897362' }}>No se encontraron pedidos</td></tr>
              ) : (
                pedidos.map(p => (
                  <tr key={p.id} onClick={() => openDetail(p.id)}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{p.nombre} {p.apellido}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productoNombre}</td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatPrice(p.total)}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: p.metodoPago === 'transferencia' ? '#e5eeff' : '#f0fdf4', color: p.metodoPago === 'transferencia' ? '#904d00' : '#166534' }}>
                        {p.metodoPago === 'transferencia' ? '🏦 Transf.' : '💵 Contra entrega'}
                      </span>
                      {p.pagado && <span style={{ marginLeft: 4, fontSize: 11, color: '#22c55e', fontWeight: 700 }}>✓</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: estadoColors[p.estado] || '#E2E8F0', color: '#fff' }}>
                        {p.estado.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', background: '#fff', opacity: page <= 1 ? 0.4 : 1 }}>← Anterior</button>
          <span style={{ alignSelf: 'center', fontSize: 13, fontWeight: 600 }}>Pág {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', background: '#fff', opacity: page >= totalPages ? 0.4 : 1 }}>Siguiente →</button>
        </div>
      )}

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDetail(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: 'min(500px, 95vw)', maxHeight: '90vh', overflow: 'auto', padding: 24, boxShadow: '0 16px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Detalle del pedido</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div><strong>Producto:</strong> {detail.productoNombre}</div>
              <div><strong>Cliente:</strong> {detail.nombre} {detail.apellido}</div>
              <div><strong>Celular:</strong> {detail.celular}</div>
              <div><strong>Dirección:</strong> {detail.direccion}</div>
              <div><strong>{detail.departamento}, {detail.ciudad}</strong></div>
              {detail.email && <div><strong>Email:</strong> {detail.email}</div>}
              {detail.notas && <div><strong>Notas:</strong> {detail.notas}</div>}
              <div><strong>Cantidad:</strong> {detail.cantidad}</div>
              <div><strong>Precio unitario:</strong> {formatPrice(detail.precioUnitario)}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}><strong>Total:</strong> {formatPrice(detail.total)}</div>
              <div><strong>Método de pago:</strong> {detail.metodoPago === 'transferencia' ? '🏦 Transferencia' : '💵 Contra entrega'}</div>
              <div><strong>Pagado:</strong> {detail.pagado ? '✅ Sí' : '❌ No'}</div>
              <div><strong>Fecha:</strong> {formatDate(detail.createdAt)}</div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#564334', textTransform: 'uppercase' }}>Estado</label>
              <select value={detail.estado} onChange={e => handleEstado(detail.id, e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, cursor: 'pointer', appearance: 'auto' }}>
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => handlePagado(detail.id, !detail.pagado)} style={{
                padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: detail.pagado ? '#ff8c00' : '#22c55e', color: '#fff'
              }}>
                {detail.pagado ? 'Desmarcar pago' : '✓ Marcar como pagado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
