'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function PedidosAdminPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tienda, setTienda] = useState('pizdo');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [pagoFilter, setPagoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [dropiQuotes, setDropiQuotes] = useState(null);
  const [dropiCargando, setDropiCargando] = useState(false);
  const [dropiIdx, setDropiIdx] = useState(null);
  const LIMIT = 15;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTienda(params.get('tienda') || 'pizdo');
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, tienda });
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

  useEffect(() => { fetchPedidos(); }, [page, estadoFilter, pagoFilter, search, tienda]);

  const cambiarTienda = (slug) => {
    setTienda(slug);
    setPage(1);
    setEstadoFilter('');
    setPagoFilter('');
    setSearch('');
    setDetail(null);
    setDropiQuotes(null);
    setDropiIdx(null);
    window.history.replaceState(null, '', `/admin/pedidos?tienda=${slug}`);
  };

  const handleEstado = async (id, estado) => {
    try {
      await api.put(`/api/pedidos/${id}`, { estado });
      showToast('Estado actualizado');
      fetchPedidos();
      if (detail?.id === id) setDetail(prev => ({ ...prev, estado }));
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al actualizar estado', 'error');
    }
  };

  const handlePagado = async (id, pagado) => {
    try {
      await api.put(`/api/pedidos/${id}`, { pagado });
      showToast(pagado ? 'Marcado como pagado' : 'Desmarcado');
      fetchPedidos();
      if (detail?.id === id) setDetail(prev => ({ ...prev, pagado }));
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al actualizar pago', 'error');
    }
  };

  const handleCotizarDropi = async () => {
    if (!detail) return;
    setDropiCargando(true);
    setDropiQuotes(null);
    setDropiIdx(null);
    try {
      const { data } = await api.post(`/api/pedidos/${detail.id}/cotizar-dropi`);
      const quotes = Array.isArray(data.quotes) ? data.quotes : [];
      if (!data.ok) {
        showToast(data.error || 'Error al cotizar Dropi', 'error');
      } else if (quotes.length === 0) {
        showToast('No se obtuvieron cotizaciones de Dropi', 'error');
      } else {
        setDropiQuotes(quotes);
        showToast('Cotización obtenida');
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al cotizar Dropi', 'error');
    } finally {
      setDropiCargando(false);
    }
  };

  const handleConfirmarDropi = async () => {
    if (!detail || dropiIdx == null || !dropiQuotes?.[dropiIdx]) return;
    setDropiCargando(true);
    try {
      const q = dropiQuotes[dropiIdx];
      const { data } = await api.post(`/api/pedidos/${detail.id}/confirmar-dropi`, {
        transportadora_id: q.transportadora_id,
        transportadora: q.transportadora
      });
      showToast(`Pedido subido a ${q.transportadora}`);
      setDetail(prev => ({ ...prev, ...data.pedido }));
      setDropiQuotes(null);
      setDropiIdx(null);
      fetchPedidos();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al confirmar Dropi', 'error');
    } finally {
      setDropiCargando(false);
    }
  };

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/api/pedidos/${id}`);
      setDetail(data);
    } catch { showToast('Error al cargar detalle', 'error'); }
  };

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  const formatDate = (d) => new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const estadoColors = { pendiente: '#feb700', confirmado: '#2196F3', enviado: '#ff8c00', entregado: '#22c55e', cancelado: '#ba1a1a' };
  const S = { border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', borderRadius: '8px' };

  return (
    <div style={{ fontFamily: '"Inter", -apple-system, sans-serif', color: '#0b1c30' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .admin-input { background: #ffffff; border: 1px solid #E2E8F0; padding: 10px 14px; font-size: 15px; font-weight: 600; color: #0b1c30; outline: none; border-radius: 8px; font-family: 'Inter', sans-serif; }
        .admin-input:focus { border-color: #ff8c00; box-shadow: 0 0 0 3px rgba(255,140,0,0.15); }
        .pedido-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .pedido-table th { background: #eff4ff; border-bottom: 1px solid #E2E8F0; padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #564334; text-align: left; white-space: nowrap; }
        .pedido-table td { padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 14px; vertical-align: middle; }
        .pedido-table tr:hover td { background: #eff4ff; cursor: pointer; }
        @media (max-width: 768px) { .pedido-table th, .pedido-table td { padding: 6px 8px; font-size: 12px; } }
      `}} />

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#ba1a1a' : '#22c55e', color: '#fff', padding: '12px 20px', fontSize: 14, fontWeight: 600, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontFamily: '"Inter", sans-serif' }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0b1c30', margin: '0 0 4px', borderLeft: '4px solid #ff8c00', paddingLeft: 12 }}>
            📦 Pedidos
          </h2>
          <div style={{ fontSize: 13, color: '#897362', marginTop: 4, fontWeight: 500 }}>{total} pedidos · {tienda === 'perfumes' ? 'Perfumes' : 'Pizdo'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ slug: 'pizdo', label: '🛠 Pizdo' }, { slug: 'perfumes', label: '💐 Perfumes' }].map(t => (
          <button
            key={t.slug}
            onClick={() => cambiarTienda(t.slug)}
            style={{
              padding: '10px 20px',
              borderRadius: 20,
              border: tienda === t.slug ? 'none' : '1px solid #E2E8F0',
              background: tienda === t.slug ? '#ff8c00' : '#ffffff',
              color: tienda === t.slug ? '#fff' : '#564334',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              minHeight: 44,
              fontFamily: '"Inter", sans-serif'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="admin-input" type="text" placeholder="🔍 Buscar cliente o producto..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 260, minHeight: 44 }} />
        <select className="admin-input" value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1); }}
          style={{ minHeight: 44, cursor: 'pointer', appearance: 'auto' }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmado">Confirmado</option>
          <option value="enviado">Enviado</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select className="admin-input" value={pagoFilter} onChange={e => { setPagoFilter(e.target.value); setPage(1); }}
          style={{ minHeight: 44, cursor: 'pointer', appearance: 'auto' }}>
          <option value="">Todos los pagos</option>
          <option value="contraentrega">Contra entrega</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#897362', fontWeight: 700 }}>
          Página {page} de {totalPages}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, fontSize: 16, fontWeight: 700, color: '#897362' }}>Cargando...</div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', borderRadius: 10, overflow: 'auto' }}>
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#897362', fontSize: 15, fontWeight: 700 }}>No se encontraron pedidos</td></tr>
              ) : (
                pedidos.map(p => (
                  <tr key={p.id} onClick={() => openDetail(p.id)}>
                    <td data-label="Fecha" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatDate(p.createdAt)}</td>
                    <td data-label="Cliente" style={{ fontWeight: 600 }}>{p.nombre} {p.apellido}</td>
                    <td data-label="Producto" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productoNombre}</td>
                    <td data-label="Total" style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatPrice(p.total)}</td>
                    <td data-label="Pago">
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                        background: p.metodoPago === 'transferencia' ? '#e5eeff' : '#f0fdf4',
                        color: p.metodoPago === 'transferencia' ? '#904d00' : '#166534'
                      }}>
                        {p.metodoPago === 'transferencia' ? '🏦 Transf.' : '💵 Contra entrega'}
                      </span>
                      {p.pagado && <span style={{ marginLeft: 4, fontSize: 12, color: '#22c55e', fontWeight: 700 }}>✓</span>}
                    </td>
                    <td data-label="Estado">
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: estadoColors[p.estado] || '#E2E8F0', color: '#fff'
                      }}>
                        {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
            ...S, background: page <= 1 ? '#eff4ff' : '#ffffff', color: '#0b1c30', opacity: page <= 1 ? 0.4 : 1,
            fontSize: 14, padding: '6px 16px', minHeight: 40, cursor: 'pointer'
          }}>← Anterior</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
            <span key={p}>
              {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#897362', margin: '0 4px' }}>…</span>}
              <button onClick={() => setPage(p)} style={{
                minWidth: 40, height: 40, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                border: '1px solid #E2E8F0', background: p === page ? '#ff8c00' : '#ffffff',
                color: p === page ? '#fff' : '#564334',
                boxShadow: p === page ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                borderRadius: 4
              }}>{p}</button>
            </span>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
            ...S, background: page >= totalPages ? '#eff4ff' : '#ffffff', color: '#0b1c30', opacity: page >= totalPages ? 0.4 : 1,
            fontSize: 14, padding: '6px 16px', minHeight: 40, cursor: 'pointer'
          }}>Siguiente →</button>
        </div>
      )}

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDetail(null)}>
          <div style={{
            background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
            width: 'min(520px, 96vw)', maxHeight: '90vh', overflow: 'auto', padding: 28, fontFamily: '"Inter", sans-serif'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0b1c30' }}>Detalle del pedido</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#897362' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Producto</span>
                <span style={{ fontWeight: 700 }}>{detail.productoNombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Cliente</span>
                <span style={{ fontWeight: 600 }}>{detail.nombre} {detail.apellido}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Celular</span>
                <span style={{ fontWeight: 600 }}>{detail.celular}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Dirección</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{detail.direccion}, {detail.ciudad}, {detail.departamento}</span>
              </div>
              {detail.email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Email</span>
                  <span style={{ fontWeight: 600 }}>{detail.email}</span>
                </div>
              )}
              {detail.notas && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Notas</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{detail.notas}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Cantidad</span>
                <span style={{ fontWeight: 600 }}>{detail.cantidad}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Precio unitario</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(detail.precioUnitario)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Envío</span>
                <span style={{ fontWeight: 600, color: detail.envio > 0 ? '#0b1c30' : '#22c55e' }}>{detail.envio > 0 ? formatPrice(detail.envio) : 'Gratis'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', background: '#eff4ff', margin: '0 -12px', paddingLeft: 12, paddingRight: 12, borderRadius: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#0b1c30' }}>{formatPrice(detail.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Método de pago</span>
                <span style={{ fontWeight: 600 }}>{detail.metodoPago === 'transferencia' ? '🏦 Transferencia' : '💵 Contra entrega'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Pagado</span>
                <span style={{ fontWeight: 700, color: detail.pagado ? '#22c55e' : '#ba1a1a' }}>{detail.pagado ? '✅ Sí' : '❌ No'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#897362', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Fecha</span>
                <span style={{ fontWeight: 600 }}>{formatDate(detail.createdAt)}</span>
              </div>
            </div>

            {Array.isArray(detail.items) && detail.items.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#564334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  📦 Items del pedido
                </div>
                {detail.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < detail.items.length - 1 ? '1px solid #E2E8F0' : 'none', fontSize: 13 }}>
                    <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{item.productoNombre}</span>
                    <span style={{ marginLeft: 6, whiteSpace: 'nowrap' }}>x{item.cantidad}</span>
                    <span style={{ marginLeft: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(item.precioUnitario * item.cantidad)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#564334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cambiar estado</div>
                <select value={detail.estado} onChange={e => handleEstado(detail.id, e.target.value)}
                  className="admin-input" style={{ width: '100%', cursor: 'pointer', appearance: 'auto' }}>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <button onClick={() => handlePagado(detail.id, !detail.pagado)} style={{
                width: '100%', minHeight: 44, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: detail.pagado ? '#ff8c00' : '#22c55e', color: '#fff',
                boxShadow: detail.pagado ? '0 4px 12px rgba(255,140,0,0.2)' : '0 4px 12px rgba(34,197,94,0.2)',
                fontFamily: '"Inter", sans-serif'
              }}>
                {detail.pagado ? 'Desmarcar pago' : '✓ Marcar como pagado'}
              </button>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#564334', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                🚚 Envío Dropi
              </div>

              {detail.transportadora ? (
                <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#166534', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ✓ Subido a {detail.transportadora} · Estado: {detail.estado}
                  {detail.subidoPor && <div style={{ fontSize: 11, color: '#897362', marginTop: 4 }}>Subido por: {detail.subidoPor.nombre}</div>}
                </div>
              ) : (
                <>
                  {dropiQuotes && dropiQuotes.length > 0 ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {dropiQuotes.map((q, i) => (
                        <div key={i} onClick={() => setDropiIdx(i)} style={{
                          padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                          border: dropiIdx === i ? '2px solid #ff8c00' : '1px solid #E2E8F0',
                          background: dropiIdx === i ? '#fff7ed' : '#fff',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 700 }}>{q.transportadora}</span>
                          <span style={{ fontWeight: 700, color: '#904d00' }}>{q.objects?.precioEnvio ? formatPrice(Number(q.objects.precioEnvio)) : '—'}</span>
                        </div>
                      ))}
                      <button onClick={handleConfirmarDropi} disabled={dropiCargando || dropiIdx == null} style={{
                        width: '100%', minHeight: 44, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                        background: dropiIdx == null ? '#E2E8F0' : '#213145', color: dropiIdx == null ? '#897362' : '#ffb77d',
                        fontFamily: '"Inter", sans-serif', opacity: dropiCargando ? 0.6 : 1
                      }}>
                        {dropiCargando ? 'Subiendo...' : dropiIdx != null ? `⬆️ Subir con ${dropiQuotes[dropiIdx].transportadora}` : 'Selecciona transportadora'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleCotizarDropi} disabled={dropiCargando} style={{
                      width: '100%', minHeight: 44, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                      background: '#213145', color: '#ffb77d', fontFamily: '"Inter", sans-serif', opacity: dropiCargando ? 0.6 : 1
                    }}>
                      {dropiCargando ? 'Cotizando...' : '🔄 Cotizar envío Dropi'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
