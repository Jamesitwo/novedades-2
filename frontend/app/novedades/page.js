'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';

const ESTADOS = {
  novedad: { label: 'Novedad', color: 'amber' },
  contactado: { label: 'Contactado', color: 'blue' },
  solucionado: { label: 'Solucionado', color: 'green' },
  entregado: { label: 'Entregado', color: 'teal' },
  devolucion: { label: 'Devolución', color: 'purple' }
};

const TRANSPORTADORAS = ['Servientrega', 'Coordinadora', 'Envia', 'TCC', 'Interrapidisimo', 'Deprisa'];

export default function NovedadesPage() {
  const { usuario } = useAuthStore();
  const getParam = (key, fallback = '') => {
    if (typeof window === 'undefined') return fallback;
    const p = new URLSearchParams(window.location.search);
    return p.get(key) || fallback;
  };
  const [novedades, setNovedades] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [transferencias, setTransferencias] = useState([]);
  const [filtrosEstado, setFiltrosEstado] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { const e = new URLSearchParams(window.location.search).get('estados'); return e ? JSON.parse(e) : []; } catch { return []; }
  });
  const [mostrarAsignados, setMostrarAsignados] = useState(false);
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
  });
  const [transportadora, setTransportadora] = useState(() => getParam('transportadora'));
  const [search, setSearch] = useState(() => getParam('search'));
  const [fechaDesde, setFechaDesde] = useState(() => getParam('fechaDesde'));
  const [fechaHasta, setFechaHasta] = useState(() => getParam('fechaHasta'));
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [showBulkMenuEstado, setShowBulkMenuEstado] = useState(false);
  const [showBulkMenuAsignar, setShowBulkMenuAsignar] = useState(false);
  const [operadores, setOperadores] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return 20;
    return parseInt(new URLSearchParams(window.location.search).get('pageSize')) || 20;
  });
  const [soloFavoritos, setSoloFavoritos] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').has('favorito'));
  const [etiquetaId, setEtiquetaId] = useState('');
  const [etiquetas, setEtiquetas] = useState([]);
  const [counts, setCounts] = useState({ novedad: 0, contactado: 0, solucionado: 0, cancelado: 0, devolucion: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchNovedades = useCallback(async (page = 1) => {
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
      if (etiquetaId) params.append('etiquetaId', etiquetaId);

      const { data } = await api.get(`/api/novedades?${params}`);
      setNovedades(data.data);
      setPagination(data.pagination);
      setTransferencias(data.transferencia || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filtrosEstado, mostrarAsignados, transportadora, search, fechaDesde, fechaHasta, pageSize, soloFavoritos, etiquetaId]);

  useEffect(() => {
    fetchNovedades(page);
  }, [fetchNovedades]);

  const fetchRef = useRef(fetchNovedades);
  useEffect(() => { fetchRef.current = fetchNovedades; }, [fetchNovedades]);

  useEffect(() => {
    api.get('/api/etiquetas').then(({ data }) => setEtiquetas(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (filtrosEstado.length > 0) params.set('estados', JSON.stringify(filtrosEstado));
    if (transportadora) params.set('transportadora', transportadora);
    if (search) params.set('search', search);
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    if (soloFavoritos) params.set('favorito', 'true');
    params.set('pageSize', pageSize);
    params.set('page', page);
    const url = `/novedades?${params.toString()}`;
    sessionStorage.setItem('novedades_prev_url', url);
  }, [filtrosEstado, transportadora, search, fechaDesde, fechaHasta, soloFavoritos, pageSize, page]);

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

  const fetchCounts = async () => {
    try {
      const { data } = await api.get('/api/dashboard/resumen');
      setCounts(data.novedades);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handlePrevRow = useCallback(() => {
    if (novedades.length === 0) return;
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, [novedades.length]);

  const handleNextRow = useCallback(() => {
    if (novedades.length === 0) return;
    setSelectedIndex(prev => Math.min(novedades.length - 1, prev + 1));
  }, [novedades.length]);

  const handleEditRow = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < novedades.length) {
      window.location.href = `/novedades/${novedades[selectedIndex].id}/editar`;
    }
  }, [selectedIndex, novedades]);

  const handleNewRow = useCallback(() => {
    window.location.href = '/novedades/nueva';
  }, []);

  const handleSearchFocus = useCallback(() => {
    document.querySelector('.topbar-search input')?.focus();
  }, []);

  useKeyboardShortcuts({
    onNext: handleNextRow,
    onPrev: handlePrevRow,
    onEdit: handleEditRow,
    onNew: handleNewRow,
    onSearch: handleSearchFocus
  });

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

  const toggleFavorito = async (id, currentFav) => {
    try {
      await api.patch(`/api/novedades/${id}/favorito`);
      fetchNovedades(pagination?.page || 1);
    } catch (error) {
      showToast('Error al actualizar favorito', 'error');
    }
  };

  const duplicarRegistro = async (id) => {
    try {
      await api.post(`/api/novedades/${id}/duplicar`);
      showToast('Registro duplicado correctamente');
      setPage(1);
      fetchNovedades(1);
    } catch (error) {
      showToast('Error al duplicar registro', 'error');
    }
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => fetchRef.current(1), 300);
    setSearchTimeout(timeout);
  };

  const getTransferenciaForRegistro = (registroId) => {
    return transferencias.filter(t => t.registroId === registroId).slice(0, 2);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(novedades.map(n => n.id));
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
          setPage(1);
          await api.patch('/api/novedades/bulk-estado', { ids: selected, estado });
          setSelected([]);
          setShowBulkMenuEstado(false);
          fetchNovedades(1);
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
          await api.patch('/api/novedades/bulk-asignar', { ids: selected, asignadoId });
          setSelected([]);
          setShowBulkMenuAsignar(false);
          setPage(1);
          fetchNovedades(1);
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

  const handleExport = async () => {
    try {
      const response = await api.get('/api/novedades/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'novedades.xlsx';
      link.click();
    } catch (error) {
      showToast('Error al exportar', 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setConfirmModal({
      title: 'Eliminar registros',
      message: `¿Eliminar ${selected.length} registro${selected.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setBulkLoading(true);
        try {
          await api.delete('/api/novedades/bulk', { data: { ids: selected } });
          setSelected([]);
          setPage(1);
          fetchNovedades(1);
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

  const getBadgeClass = (estado) => ({ novedad: 'novedad', contactado: 'contactado', solucionado: 'solucionado', cancelado: 'cancelado' }[estado] || estado);
  const getLabelEstado = (estado) => ESTADOS[estado]?.label || estado;

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

      <div className="stats-grid">
        <div className="stat-card c-amber">
          <div className="stat-label">Novedad</div>
          <div className="stat-value amber">{counts.novedad}</div>
        </div>
        <div className="stat-card c-blue">
          <div className="stat-label">Contactado</div>
          <div className="stat-value blue">{counts.contactado}</div>
        </div>
        <div className="stat-card c-red">
          <div className="stat-label">Devolución</div>
          <div className="stat-value red">{counts.devolucion}</div>
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
              {key === 'novedad' ? '⚠ ' : ''}{val.label}
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

        <select
          value={etiquetaId}
          onChange={(e) => setEtiquetaId(e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20,
            padding: '5px 14px', fontSize: 12, fontWeight: 500,
            color: etiquetaId ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer'
          }}
        >
          <option value="">Todas etiquetas</option>
          {etiquetas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
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
            <Link href="/novedades/nueva" className="btn btn-primary">+ Nuevo</Link>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              🔍 Buscar &nbsp;|&nbsp; ↑↓ Navegar &nbsp;|&nbsp; E Editar &nbsp;|&nbsp; N Nuevo
            </span>
          </div>

          <div className="table-card">
            <div className="table-header">
              <span className="table-header-title">{novedades.length} registro{novedades.length !== 1 ? 's' : ''}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selected.length === novedades.length && novedades.length > 0} onChange={handleSelectAll} />
                  </th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Motivo</th>
                  <th>Total</th>
                  <th>Transportadora</th>
                  <th>Guía</th>
                  <th>Asignado</th>
                  <th>Transferencias</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {novedades.map((novedad, idx) => (
                  <tr
                    key={novedad.id}
                    style={{
                      background: selected.includes(novedad.id)
                        ? 'rgba(91,110,245,0.1)'
                        : selectedIndex === idx
                        ? 'rgba(91,110,245,0.15)'
                        : 'transparent',
                      outline: selectedIndex === idx ? '2px solid var(--accent)' : 'none',
                      outlineOffset: -2
                    }}
                  >
                    <td style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(novedad.id)}
                        onChange={() => toggleSelect(novedad.id)}
                      />
                    </td>
                    <td>
                      <div className="td-name">{novedad.nombre} {novedad.apellido}</div>
                      <div className="td-mono" style={{ color: 'var(--text3)' }}>{novedad.celular}</div>
                      {novedad.celular2 && (
                        <div className="td-mono" style={{ color: 'var(--accent2)', fontSize: 11 }}>{novedad.celular2}</div>
                      )}
                      {novedad._etiquetas && novedad._etiquetas.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {novedad._etiquetas.map(e => (
                            <span key={e.id} style={{
                              display: 'inline-block', padding: '1px 7px', borderRadius: 10,
                              fontSize: 10, fontWeight: 600, color: '#fff', background: e.color
                            }}>{e.nombre}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{novedad.producto}</td>
                    <td>
                      {novedad.motivoNovedad ? (
                        <span style={{ color: 'var(--amber)', fontSize: 12 }} title={novedad.motivoNovedad}>
                          {novedad.motivoNovedad.length > 20 ? novedad.motivoNovedad.substring(0, 20) + '...' : novedad.motivoNovedad}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td className="td-mono">${Number(novedad.totalAPagar).toLocaleString()}</td>
                    <td>{novedad.transportadora}</td>
                    <td className="td-mono">{novedad.guia}</td>
                    <td>
                      {novedad.asignado ? (
                        <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 500 }}>
                          {novedad.asignado.nombre}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const transfer = getTransferenciaForRegistro(novedad.id);
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
                    <td><span className={`badge ${getBadgeClass(novedad.estado)}`}>{getLabelEstado(novedad.estado)}</span></td>
                    <td className="td-mono" style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {new Date(novedad.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleFavorito(novedad.id, novedad.favorito)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 16, padding: '2px 4px', color: novedad.favorito ? 'var(--amber)' : 'var(--text3)',
                          transition: 'color 0.15s'
                        }}
                        title={novedad.favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        {novedad.favorito ? '★' : '☆'}
                      </button>
                      <div className="row-actions">
                        <button onClick={() => duplicarRegistro(novedad.id)} className="action-btn" title="Duplicar">📋</button>
                        <Link href={`/novedades/${novedad.id}/editar`} className="action-btn" prefetch={false}>Editar</Link>
                        <Link href={`/novedades/${novedad.id}`} className="action-btn" prefetch={false}>Ver</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={!pagination.hasPrevPage} onClick={() => { const p = pagination.page - 1; setPage(p); fetchNovedades(p); }}>Anterior</button>
              <span>Página {pagination.page} de {pagination.totalPages}</span>
              <button disabled={!pagination.hasNextPage} onClick={() => { const p = pagination.page + 1; setPage(p); fetchNovedades(p); }}>Siguiente</button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                  fetchNovedades(1);
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