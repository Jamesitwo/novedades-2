'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';
import { on, isConnected } from '@/lib/websocket';

const ESTADOS = {
  0: { label: 'Por confirmar', class: 'pendiente' },
  1: { label: 'Cancelado', class: 'red' },
  2: { label: 'Confirmado', class: 'entregado' },
  3: { label: 'Modificado', class: 'purple' }
};

export default function LucidSalesPage() {
  const { usuario } = useAuthStore();
  const [pedidos, setPedidos] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [conexionStatus, setConexionStatus] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [itemsPerPage] = useState(50);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [vincularId, setVincularId] = useState('');
  const [vinculando, setVinculando] = useState(false);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('itemsPerPage', String(itemsPerPage));
      if (search) params.set('search', search);
      if (estadoFilter !== '') params.set('estadoFilter', estadoFilter);
      params.set('filters', '[]');

      const { data } = await api.get(`/api/lucidsales/vinculados?${params.toString()}`);
      if (data.ok) {
        setPedidos(data.pedidos || []);
        setTotalRecords(data.totalRecords || 0);
        setNumPages(data.numPages || 0);
      } else {
        setError(data.error || 'Error al obtener pedidos');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [page, search, itemsPerPage, estadoFilter]);

  useEffect(() => {
    setConnected(isConnected());
    const unsub1 = on('__connect__', () => setConnected(true));
    const unsub2 = on('__disconnect__', () => setConnected(false));
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    verificarConexion();
  }, []);

  // Cargar vinculados al montar y cuando cambien page/search
  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const verificarConexion = async () => {
    try {
      const { data } = await api.get('/api/lucidsales/verificar-conexion');
      setConexionStatus(data);
    } catch {
      setConexionStatus({ conectado: false, mensaje: 'Error al verificar' });
    }
  };

  const formatMoney = (val) => {
    if (!val) return '$0';
    return '$' + Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleEstadoFilter = (estado) => {
    setEstadoFilter(estado === estadoFilter ? '' : estado);
    setPage(1);
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!vincularId) return;
    setVinculando(true);
    try {
      await api.post('/api/lucidsales/vincular', { lucidsalesPedidoId: Number(vincularId) });
      setVincularId('');
      fetchPedidos();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al vincular');
    } finally {
      setVinculando(false);
    }
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>LucidSales · Pedidos</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{totalRecords.toLocaleString()} pedidos</span>
            {conexionStatus && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: conexionStatus.conectado ? 'var(--green)' : 'var(--red)',
                fontSize: 11
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: conexionStatus.conectado ? 'var(--green)' : 'var(--red)'
                }} />
                {conexionStatus.conectado ? 'Conectado' : 'Desconectado'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {conexionStatus && !conexionStatus.conectado && (
            <button onClick={verificarConexion} className="btn btn-ghost" style={{ fontSize: 12 }}>
              Reintentar conexión
            </button>
          )}
        </div>
      </div>

      {conexionStatus && !conexionStatus.conectado && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--red)', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13
        }}>
          {conexionStatus.mensaje}. Configura LucidSales en <Link href="/configuracion" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Configuración</Link>.
        </div>
      )}

      <form onSubmit={handleVincular} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="number"
          placeholder="ID de pedido LucidSales"
          value={vincularId}
          onChange={e => setVincularId(e.target.value)}
          className="topbar-search"
          style={{ width: 200 }}
        />
        <button type="submit" disabled={vinculando || !vincularId} className="btn btn-primary" style={{ fontSize: 12 }}>
          {vinculando ? 'Vinculando...' : 'Vincular pedido'}
        </button>
        <button type="button" onClick={fetchPedidos} className="btn btn-ghost" style={{ fontSize: 12 }}>
          ⟳ Refrescar
        </button>
      </form>

      <div className="filters">
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handleEstadoFilter(k)}
              className={`filter-tab ${estadoFilter === k ? 'active' : ''}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="filters-right">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              className="topbar-search"
              placeholder="Buscar pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 250 }}
            />
            <button type="submit" className="btn btn-ghost">Buscar</button>
          </form>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--red)', marginBottom: 12, fontSize: 16 }}>{error}</div>
          <button onClick={fetchPedidos} className="btn btn-primary">Reintentar</button>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          No se encontraron pedidos
        </div>
      ) : (
        <>
          <div className="table-card">
            <div className="table-header">
              <span className="table-header-title">Pedidos ({totalRecords})</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Referencias</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td className="td-mono">#{p.idPedido}</td>
                    <td className="td-name">{p.Nombre} {p.Apellido}</td>
                    <td>{p.Movil}</td>
                    <td className="td-mono">{formatMoney(p.Total)}</td>
                    <td>
                      <span className={`badge ${(ESTADOS[p.EstadoPedido] || ESTADOS[0]).class}`}>
                        {(ESTADOS[p.EstadoPedido] || ESTADOS[0]).label}
                      </span>
                    </td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.Referencias || '-'}
                    </td>
                    <td className="row-actions">
                      <Link href={`/lucidsales/${p.id}`} className="action-btn" title="Editar">
                        ✎
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {numPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ‹ Anterior
              </button>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>
                Página {page} de {numPages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= numPages}
                onClick={() => setPage(p => Math.min(numPages, p + 1))}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
