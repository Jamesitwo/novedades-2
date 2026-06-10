'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ESTADOS = {
  devolucion: { label: 'Devolución', color: 'purple' }
};

export default function DevolucionesPage() {
  const { usuario } = useAuthStore();
  const [novedades, setNovedades] = useState([]);
  const [oficina, setOficina] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchDevoluciones();
  }, [filtroOrigen]);

  const fetchDevoluciones = async () => {
    setLoading(true);
    try {
      if (filtroOrigen === 'todos' || filtroOrigen === 'novedades') {
        const { data: dataNovedades } = await api.get('/api/novedades?estados=["devolucion"]&limit=1000');
        setNovedades(dataNovedades.data || []);
      } else {
        setNovedades([]);
      }

      if (filtroOrigen === 'todos' || filtroOrigen === 'oficina') {
        const { data: dataOficina } = await api.get('/api/oficina?estados=["devolucion"]&limit=1000');
        setOficina(dataOficina.data || []);
      } else {
        setOficina([]);
      }
    } catch (error) {
      console.error('Error fetching devoluciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => {
      // Search is applied client-side
    }, 300));
  };

  const filterBySearch = (items) => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(item =>
      item.nombre?.toLowerCase().includes(lower) ||
      item.apellido?.toLowerCase().includes(lower) ||
      item.guia?.toLowerCase().includes(lower) ||
      item.producto?.toLowerCase().includes(lower) ||
      item.celular?.toLowerCase().includes(lower) ||
      item.transportadora?.toLowerCase().includes(lower)
    );
  };

  const novedadesFiltradas = filterBySearch(novedades);
  const oficinaFiltrada = filterBySearch(oficina);
  const totalDevoluciones = novedadesFiltradas.length + oficinaFiltrada.length;

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

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Devoluciones</h1>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>
          Todos los pedidos marcados como devolución de novedades y oficina.
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card c-purple">
          <div className="stat-label">Total Devoluciones</div>
          <div className="stat-value purple">{totalDevoluciones}</div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-label">De Novedades</div>
          <div className="stat-value" style={{ color: 'var(--accent2)' }}>{novedadesFiltradas.length}</div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-label">De Oficina</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{oficinaFiltrada.length}</div>
        </div>
      </div>

      <div className="filters">
        <button
          onClick={() => setFiltroOrigen('todos')}
          className={`filter-tab ${filtroOrigen === 'todos' ? 'active' : ''}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltroOrigen('novedades')}
          className={`filter-tab ${filtroOrigen === 'novedades' ? 'active' : ''}`}
          style={{ color: filtroOrigen === 'novedades' ? 'var(--accent2)' : 'var(--text2)' }}
        >
          ⚠ Novedades ({novedades.length})
        </button>
        <button
          onClick={() => setFiltroOrigen('oficina')}
          className={`filter-tab ${filtroOrigen === 'oficina' ? 'active' : ''}`}
          style={{ color: filtroOrigen === 'oficina' ? 'var(--teal)' : 'var(--text2)' }}
        >
          📦 Oficina ({oficina.length})
        </button>

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
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : totalDevoluciones === 0 ? (
        <div className="table-card">
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h3 style={{ marginBottom: 8 }}>No hay devoluciones</h3>
            <p style={{ fontSize: 13 }}>Los pedidos marcados como devolución aparecerán aquí.</p>
          </div>
        </div>
      ) : (
        <>
          {(filtroOrigen === 'todos' || filtroOrigen === 'novedades') && novedadesFiltradas.length > 0 && (
            <div className="table-card" style={{ marginBottom: 20 }}>
              <div className="table-header">
                <span className="table-header-title">⚠ Novedades ({novedadesFiltradas.length})</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Total</th>
                    <th>Transportadora</th>
                    <th>Guía</th>
                    <th>Asignado</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {novedadesFiltradas.map((item) => (
                    <tr key={`novedad-${item.id}`}>
                      <td>
                        <div className="td-name">{item.nombre} {item.apellido}</div>
                        <div className="td-mono" style={{ color: 'var(--text3)' }}>{item.celular}</div>
                      </td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.producto}</td>
                      <td className="td-mono">${Number(item.totalAPagar).toLocaleString()}</td>
                      <td>{item.transportadora}</td>
                      <td className="td-mono">{item.guia}</td>
                      <td>
                        {item.asignado ? (
                          <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 500 }}>
                            {item.asignado.nombre}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td className="td-mono" style={{ color: 'var(--text2)', fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link href={`/novedades/${item.id}`} className="action-btn">Ver</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(filtroOrigen === 'todos' || filtroOrigen === 'oficina') && oficinaFiltrada.length > 0 && (
            <div className="table-card">
              <div className="table-header">
                <span className="table-header-title">📦 Oficina ({oficinaFiltrada.length})</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Producto</th>
                    <th>Transportadora</th>
                    <th>Guía</th>
                    <th>Asignado</th>
                    <th>Fecha Límite</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {oficinaFiltrada.map((item) => {
                    const dias = Math.ceil((new Date(item.fechaLimite) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={`oficina-${item.id}`}>
                        <td>
                          <div className="td-name">{item.nombre} {item.apellido}</div>
                          <div className="td-mono" style={{ color: 'var(--text3)' }}>{item.celular}</div>
                        </td>
                        <td>{item.producto}</td>
                        <td>{item.transportadora}</td>
                        <td className="td-mono">{item.guia}</td>
                        <td>
                          {item.asignado ? (
                            <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 500 }}>
                              {item.asignado.nombre}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td className="td-mono">
                          {new Date(item.fechaLimite).toLocaleDateString('es-CO')}
                          {dias <= 0 ? (
                            <span className="vence-tag vence-hoy">hoy</span>
                          ) : dias <= 3 ? (
                            <span className="vence-tag vence-pronto">{dias}d</span>
                          ) : null}
                        </td>
                        <td>
                          <div className="row-actions">
                            <Link href={`/oficina/${item.id}`} className="action-btn">Ver</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}