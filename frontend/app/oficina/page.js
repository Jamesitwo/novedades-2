'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';

const ESTADOS = {
  pendiente_llamar: { label: 'Pend. llamar', color: 'pendiente' },
  contactado: { label: 'Contactado', color: 'contactado' },
  va_a_recoger: { label: 'Va a recoger', color: 'va_recoger' },
  entregado: { label: 'Entregado', color: 'entregado' },
  no_va_a_recoger: { label: 'No va a recoger', color: 'no_recoger' },
  devolucion: { label: 'Devolución', color: 'purple' }
};

const TRANSPORTADORAS = ['Servientrega', 'Coordinadora', 'Envia', 'TCC', 'Interrapidisimo', 'Deprisa'];

export default function OficinaPage() {
  const { usuario } = useAuthStore();
  const [pedidos, setPedidos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [transferencias, setTransferencias] = useState([]);
  const [filtrosEstado, setFiltrosEstado] = useState([]);
  const [mostrarAsignados, setMostrarAsignados] = useState(false);
  const [transportadora, setTransportadora] = useState('');
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [showBulkMenuEstado, setShowBulkMenuEstado] = useState(false);
  const [showBulkMenuAsignar, setShowBulkMenuAsignar] = useState(false);
  const [operadores, setOperadores] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [counts, setCounts] = useState({ pendiente_llamar: 0, contactado: 0, va_a_recoger: 0, no_va_a_recoger: 0, devolucion: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPedidos = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pageSize });

      if (mostrarAsignados) {
        params.append('asignado_a_mi', 'true');
      }

      if (filtrosEstado.length > 0) {
        params.append('estados', JSON.stringify(filtrosEstado));
      }

      if (transportadora) params.append('transportadora', transportadora);
      if (search) params.append('search', search);
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      if (soloFavoritos) params.append('favorito', 'true');

      const { data } = await api.get(`/api/oficina?${params}`);
      setPedidos(data.data);
      setPagination(data.pagination);
      setTransferencias(data.transferencia || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filtrosEstado, mostrarAsignados, transportadora, search, fechaDesde, fechaHasta, pageSize, soloFavoritos]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data } = await api.get('/api/dashboard/resumen');
        setCounts(data.oficina);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchOperadores();
  }, []);

  const fetchOperadores = async () => {
    try {
      const { data } = await api.get('/api/usuarios/operadores');
      setOperadores(data);
    } catch (error) {
      console.error('Error fetching operadores:', error);
    }
  };

  const toggleEstado = (estado) => {
    setFiltrosEstado(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  const toggleAsignados = () => {
    setMostrarAsignados(prev => !prev);
  };

  const limpiarFiltros = () => {
    setFiltrosEstado([]);
    setMostrarAsignados(false);
    setTransportadora('');
    setSearch('');
    setFechaDesde('');
    setFechaHasta('');
    setSoloFavoritos(false);
  };

  const toggleFavorito = async (id) => {
    try {
      await api.patch(`/api/oficina/${id}/favorito`);
      fetchPedidos(pagination?.page || 1);
    } catch (error) {
      showToast('Error al actualizar favorito', 'error');
    }
  };

  const duplicarRegistro = async (id) => {
    try {
      await api.post(`/api/oficina/${id}/duplicar`);
      showToast('Registro duplicado correctamente');
      fetchPedidos(1);
    } catch (error) {
      showToast('Error al duplicar registro', 'error');
    }
  };

  const handleSearchChange = (value) => {
    setSearch(value);
  };

  const getTransferenciaForRegistro = (registroId) => {
    return transferencias.filter(t => t.registroId === registroId).slice(0, 2);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(pedidos.map(p => p.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkEstado = async (estado) => {
    if (selected.length === 0) return;
    setConfirmModal({
      title: 'Cambiar estado',
      message: `¿Cambiar estado a "${ESTADOS[estado]?.label}" en ${selected.length} registro${selected.length !== 1 ? 's' : ''}?`,
      onConfirm: async () => {
        setBulkLoading(true);
        try {
          await api.patch('/api/oficina/bulk-estado', { ids: selected, estado });
          setSelected([]);
          setShowBulkMenuEstado(false);
          fetchPedidos(1);
          showToast('Estado actualizado correctamente');
        } catch (error) {
          showToast('Error al actualizar registros', 'error');
        } finally {
          setBulkLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleBulkAsignar = async (asignadoId) => {
    if (selected.length === 0) return;
    const operador = operadores.find(o => o.id === asignadoId);
    setConfirmModal({
      title: 'Asignar operador',
      message: `¿Asignar ${selected.length} registro${selected.length !== 1 ? 's' : ''} a ${operador?.nombre}?`,
      onConfirm: async () => {
        setBulkLoading(true);
        try {
          await api.patch('/api/oficina/bulk-asignar', { ids: selected, asignadoId });
          setSelected([]);
          setShowBulkMenuAsignar(false);
          fetchPedidos(1);
          showToast('Registros asignados correctamente');
        } catch (error) {
          showToast('Error al asignar registros', 'error');
        } finally {
          setBulkLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setConfirmModal({
      title: 'Eliminar registros',
      message: `¿Eliminar ${selected.length} registro${selected.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setBulkLoading(true);
        try {
          await api.delete('/api/oficina/bulk', { data: { ids: selected } });
          setSelected([]);
          fetchPedidos(1);
          showToast(`${selected.length} registro(s) eliminado(s)`);
        } catch (error) {
          showToast('Error al eliminar registros', 'error');
        } finally {
          setBulkLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/oficina/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pedidos_oficina.xlsx';
      link.click();
    } catch (error) {
      showToast('Error al exportar', 'error');
    }
  };

  const getDiasRestantes = (fechaLimite) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24));
  };

  const totalFiltrosActivos = filtrosEstado.length + (mostrarAsignados ? 1 : 0) + (transportadora ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="content">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 16, padding: 24, maxWidth: 360,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>{confirmModal.title}</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: 14 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} className="btn btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} className="btn btn-primary" style={{ padding: '8px 16px' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="alert-banner">
        <span className="alert-icon">⚠</span>
        <span className="alert-text">Los pedidos en oficina tienen <strong>7 días</strong> para ser recogidos antes de volver al remitente.</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card c-amber">
          <div className="stat-label">Pend. Llamar</div>
          <div className="stat-value amber">{counts.pendiente_llamar}</div>
        </div>
        <div className="stat-card c-blue">
          <div className="stat-label">Contactado</div>
          <div className="stat-value blue">{counts.contactado}</div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-label">Va a Recoger</div>
          <div className="stat-value green">{counts.va_a_recoger}</div>
        </div>
        <div className="stat-card c-red">
          <div className="stat-label">No Va a Recoger</div>
          <div className="stat-value red">{counts.no_va_a_recoger}</div>
        </div>
      </div>

      <div className="filters">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            onClick={toggleAsignados}
            className={`filter-tab ${mostrarAsignados ? 'active' : ''}`}
            style={{ color: mostrarAsignados ? 'var(--accent)' : 'var(--text2)' }}
          >
            👤 Asignados a mí
          </button>

          <button
            onClick={() => setSoloFavoritos(!soloFavoritos)}
            className={`filter-tab ${soloFavoritos ? 'active' : ''}`}
            style={{ color: soloFavoritos ? 'var(--amber)' : 'var(--text2)' }}
          >
            ⭐ Favoritos
          </button>

          {Object.entries(ESTADOS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => toggleEstado(key)}
              className={`filter-tab ${filtrosEstado.includes(key) ? 'active' : ''}`}
              style={{
                color: filtrosEstado.includes(key) ? `var(--${val.color})` : 'var(--text2)',
                borderColor: filtrosEstado.includes(key) ? `var(--${val.color})` : 'transparent'
              }}
            >
              {val.label}
            </button>
          ))}
        </div>

        <select
          value={transportadora}
          onChange={(e) => setTransportadora(e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20,
            padding: '5px 14px', fontSize: 12, fontWeight: 500,
            color: transportadora ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer'
          }}
        >
          <option value="">Todas transportadoras</option>
          {TRANSPORTADORAS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 500 }}>📅</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, color: 'var(--text)',
              cursor: 'pointer', outline: 'none', transition: 'border-color 0.2s'
            }}
          />
          <span style={{ color: 'var(--text3)' }}>→</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, color: 'var(--text)',
              cursor: 'pointer', outline: 'none', transition: 'border-color 0.2s'
            }}
          />
        </div>

        {totalFiltrosActivos > 0 && (
          <button
            onClick={limpiarFiltros}
            style={{
              background: 'var(--red)', border: 'none', borderRadius: 6,
              color: '#fff', cursor: 'pointer', fontSize: 11, padding: '6px 12px',
              fontWeight: 500
            }}
            title="Limpiar todos los filtros"
          >
            ✕ Limpiar ({totalFiltrosActivos})
          </button>
        )}

        <div className="filters-right">
          <div className="topbar-search" style={{ width: 220 }}>
            <span style={{ color: 'var(--text3)' }}>⌕</span>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button onClick={handleExport} className="btn btn-ghost">↓ Exportar</button>
          {usuario?.rol !== 'viewer' && (
            <Link href="/oficina/nueva" className="btn btn-primary">+ Nuevo</Link>
          )}
        </div>
      </div>

      {totalFiltrosActivos > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {mostrarAsignados && (
            <span style={{
              background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 16,
              padding: '4px 10px', fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4
            }}>
              Asignados a mí
              <button onClick={toggleAsignados} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>✕</button>
            </span>
          )}
          {soloFavoritos && (
            <span style={{
              background: 'var(--bg3)', border: '1px solid var(--amber)', borderRadius: 16,
              padding: '4px 10px', fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4
            }}>
              ⭐ Favoritos
              <button onClick={() => setSoloFavoritos(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>✕</button>
            </span>
          )}
          {filtrosEstado.map(estado => (
            <span key={estado} style={{
              background: 'var(--bg3)', border: '1px solid var(--text3)', borderRadius: 16,
              padding: '4px 10px', fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4
            }}>
              {ESTADOS[estado]?.label}
              <button onClick={() => toggleEstado(estado)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>✕</button>
            </span>
          ))}
          {transportadora && (
            <span style={{
              background: 'var(--bg3)', border: '1px solid var(--text3)', borderRadius: 16,
              padding: '4px 10px', fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4
            }}>
              {transportadora}
              <button onClick={() => setTransportadora('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>✕</button>
            </span>
          )}
          {(fechaDesde || fechaHasta) && (
            <span style={{
              background: 'var(--bg3)', border: '1px solid var(--text3)', borderRadius: 16,
              padding: '4px 10px', fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4
            }}>
              📅 {fechaDesde || '...'} → {fechaHasta || '...'}
              <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>✕</button>
            </span>
          )}
          {search && (
            <span style={{
              background: 'var(--bg3)', border: '1px solid var(--text3)', borderRadius: 16,
              padding: '4px 10px', fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4
            }}>
              🔍 {search}
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 4 }}>✕</button>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="table-card">
          <div className="table-header">
            <span className="table-header-title">Cargando...</span>
          </div>
          <TableSkeleton rows={10} columns={10} />
        </div>
      ) : (
        <>
          {selected.length > 0 && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 10,
              padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{selected.length} seleccionado{selected.length !== 1 ? 's' : ''}</span>

              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowBulkMenuAsignar(!showBulkMenuAsignar)} className="btn btn-secondary" disabled={bulkLoading}>
                  {bulkLoading ? 'Asignando...' : '👤 Asignar →'}
                </button>
                {showBulkMenuAsignar && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                    padding: 8, zIndex: 50, minWidth: 180
                  }}>
                    {operadores.map(op => (
                      <button
                        key={op.id}
                        onClick={() => handleBulkAsignar(op.id)}
                        style={{
                          display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                          background: 'none', color: 'var(--text2)', fontSize: 12,
                          textAlign: 'left', borderRadius: 6, cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg3)'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        {op.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowBulkMenuEstado(!showBulkMenuEstado)} className="btn btn-primary" disabled={bulkLoading}>
                  {bulkLoading ? 'Actualizando...' : 'Cambiar estado →'}
                </button>
                {showBulkMenuEstado && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                    padding: 8, zIndex: 50, minWidth: 150
                  }}>
                    {Object.entries(ESTADOS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => handleBulkEstado(key)}
                        style={{
                          display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                          background: 'none', color: 'var(--text2)', fontSize: 12,
                          textAlign: 'left', borderRadius: 6, cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg3)'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {usuario?.rol === 'admin' && (
                <button onClick={handleBulkDelete} className="btn btn-danger" disabled={bulkLoading} style={{ padding: '7px 14px', fontSize: 13 }}>
                  🗑 Eliminar ({selected.length})
                </button>
              )}

              <button onClick={() => setSelected([])} className="btn btn-ghost" style={{ marginLeft: 'auto' }}>✕ Cancelar</button>
            </div>
          )}

          <div className="table-card">
            <div className="table-header">
              <span className="table-header-title">{pedidos.length} registro{pedidos.length !== 1 ? 's' : ''}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selected.length === pedidos.length && pedidos.length > 0} onChange={handleSelectAll} />
                  </th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Transportadora</th>
                  <th>Guía</th>
                  <th>Ingreso</th>
                  <th>Vence</th>
                  <th>Asignado</th>
                  <th>Transferencias</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => {
                  const dias = getDiasRestantes(pedido.fechaLimite);
                  const fechaIngreso = new Date(new Date(pedido.fechaLimite).getTime() - 7 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={pedido.id} style={{ background: selected.includes(pedido.id) ? 'rgba(91,110,245,0.1)' : 'transparent' }}>
                      <td>
                        <input type="checkbox" checked={selected.includes(pedido.id)} onChange={() => handleSelect(pedido.id)} />
                      </td>
                      <td>
                        <div className="td-name">{pedido.nombre} {pedido.apellido}</div>
                        <div className="td-mono" style={{ color: 'var(--text3)' }}>{pedido.celular}</div>
                        {pedido.celular2 && (
                          <div className="td-mono" style={{ color: 'var(--accent2)', fontSize: 11 }}>{pedido.celular2}</div>
                        )}
                        {pedido._etiquetas && pedido._etiquetas.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {pedido._etiquetas.map(e => (
                              <span key={e.id} style={{
                                display: 'inline-block', padding: '1px 7px', borderRadius: 10,
                                fontSize: 10, fontWeight: 600, color: '#fff', background: e.color
                              }}>{e.nombre}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>{pedido.producto}</td>
                      <td className="td-mono">{pedido.precio > 0 ? `$${Number(pedido.precio).toLocaleString()}` : '—'}</td>
                      <td>{pedido.transportadora}</td>
                      <td className="td-mono">{pedido.guia}</td>
                      <td className="td-mono" style={{ color: 'var(--text2)' }}>
                        {fechaIngreso.toLocaleDateString('es-CO')}
                      </td>
                      <td className="td-mono">
                        {new Date(pedido.fechaLimite).toLocaleDateString('es-CO')}
                        {dias <= 0 ? (
                          <span className="vence-tag vence-hoy">hoy</span>
                        ) : dias <= 3 ? (
                          <span className="vence-tag vence-pronto">{dias}d</span>
                        ) : null}
                      </td>
                      <td>
                        {pedido.asignado ? (
                          <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 500 }}>
                            {pedido.asignado.nombre}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {(() => {
                          const transfer = getTransferenciaForRegistro(pedido.id);
                          if (transfer.length === 0) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {transfer.map((t, i) => (
                                <span key={i} style={{ fontSize: 11, color: 'var(--teal)' }} title={new Date(t.createdAt).toLocaleString('es-CO')}>
                                  {t.deUsuario.nombre} → {t.aUsuario.nombre}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td><span className={`badge ${ESTADOS[pedido.estado]?.color}`}>{ESTADOS[pedido.estado]?.label}</span></td>
                      <td>
                        <button
                          onClick={() => toggleFavorito(pedido.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 16, padding: '2px 4px', color: pedido.favorito ? 'var(--amber)' : 'var(--text3)',
                            transition: 'color 0.15s'
                          }}
                          title={pedido.favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                          {pedido.favorito ? '★' : '☆'}
                        </button>
                        <div className="row-actions">
                          <button onClick={() => duplicarRegistro(pedido.id)} className="action-btn" title="Duplicar">📋</button>
                          <Link href={`/oficina/${pedido.id}`} className="action-btn">Ver</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={!pagination.hasPrevPage} onClick={() => fetchPedidos(pagination.page - 1)}>Anterior</button>
              <span>Página {pagination.page} de {pagination.totalPages}</span>
              <button disabled={!pagination.hasNextPage} onClick={() => fetchPedidos(pagination.page + 1)}>Siguiente</button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  fetchPedidos(1);
                }}
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  padding: '6px 10px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}