'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toaster';

const FIELD_DEFS = [
  { key: 'lucidbotApiKey', label: 'Token LucidBot (X-ACCESS-TOKEN) — Zunto', ph: 'Token de acceso...' },
  { key: 'botFieldPedidos', label: 'bot_field_id — pedidos_lucidsales', ph: 'ID del campo' },
  { key: 'botFieldIntegracionPedidos', label: 'bot_field_id — Integracion_pedidos_LucidSales', ph: 'ID del campo' }
];

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: '0', label: 'Por confirmar' },
  { value: '1', label: 'Cancelado' },
  { value: '2', label: 'Confirmado' },
  { value: '3', label: 'Modificado' }
];

const ESTADO_BADGE = {
  0: { label: 'Por confirmar', color: 'var(--amber)' },
  1: { label: 'Cancelado', color: 'var(--red)' },
  2: { label: 'Confirmado', color: 'var(--green)' },
  3: { label: 'Modificado', color: 'var(--purple)' }
};

const inputStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

const cardStyle = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 16
};

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function ImportadorPedidosPage() {
  const [config, setConfig] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);

  const [lsPedidos, setLsPedidos] = useState([]);
  const [lsCargando, setLsCargando] = useState(false);
  const [lsPage, setLsPage] = useState(1);
  const [lsNumPages, setLsNumPages] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const [importando, setImportando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [importaciones, setImportaciones] = useState([]);
  const [reintentando, setReintentando] = useState(null);
  const [desimportando, setDesimportando] = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/api/importador-pedidos/config');
      setConfig(data.config || {});
    } catch {
      toast.error('No se pudo cargar la configuración');
    }
  }, []);

  const fetchImportaciones = useCallback(async () => {
    try {
      const { data } = await api.get('/api/importador-pedidos/importaciones');
      setImportaciones(data.logs || []);
    } catch { /* historial vacío */ }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchImportaciones();
  }, [fetchConfig, fetchImportaciones]);

  const guardarConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/api/importador-pedidos/config', config);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const cargarPedidosLS = useCallback(async (pageNum) => {
    setLsCargando(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), itemsPerPage: '50' });
      if (busqueda) params.set('search', busqueda);
      if (estadoFilter !== '') params.set('estado', estadoFilter);
      const { data } = await api.get(`/api/importador-pedidos/lucidsales-pedidos?${params}`);
      setLsPedidos(data.pedidos || []);
      setLsNumPages(data.numPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar pedidos de LucidSales');
    } finally {
      setLsCargando(false);
    }
  }, [busqueda, estadoFilter]);

  const abrirImportador = async () => {
    setShowImportModal(true);
    setResumen(null);
    setSelectedIds(new Set());
    setBusqueda('');
    setEstadoFilter('');
    setLsPage(1);
    cargarPedidosLS(1);
  };

  const toggleSeleccion = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    const todosYa = lsPedidos.length > 0 && lsPedidos.every(p => selectedIds.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      lsPedidos.forEach(p => todosYa ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const importar = async () => {
    if (selectedIds.size === 0) { toast.error('Selecciona al menos un pedido'); return; }
    setImportando(true);
    try {
      const { data } = await api.post('/api/importador-pedidos/importar', { pedidoIds: Array.from(selectedIds) });
      setResumen(data);
      toast.success(`Importación: ${data.ok} ok, ${data.error} con error`);
      fetchImportaciones();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar');
    } finally {
      setImportando(false);
    }
  };

  const reintentar = async (log) => {
    setReintentando(log.id);
    try {
      const { data } = await api.post(`/api/importador-pedidos/importaciones/${log.id}/reintentar`);
      setResumen(data);
      if (data.error === 0) toast.success(`${log.cliente} importado correctamente`);
      else toast.error(`${log.cliente}: ${data.detalle?.[0]?.errores?.join(' | ') || 'error'}`);
      fetchImportaciones();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reintentar');
    } finally {
      setReintentando(null);
    }
  };

  const desimportar = async (log) => {
    if (!window.confirm(`¿Desimportar el pedido de "${log.cliente}"?\n\nSe eliminará de los bot fields del bot (LucidBot) de Zunto.`)) return;
    setDesimportando(log.id);
    try {
      await api.delete(`/api/importador-pedidos/importaciones/${log.id}`);
      toast.success('Pedido desimportado');
      fetchImportaciones();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desimportar');
    } finally {
      setDesimportando(null);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Zunto · Importar Pedidos</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            Tienda Zunto · importación de pedidos de LucidSales hacia LucidBot
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button icon="cloud_download" onClick={abrirImportador}>Importar pedidos desde Lucid Sales</Button>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
        {/* CONFIG */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="settings" size={18} style={{ color: 'var(--accent2)' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Configuración LucidBot (Zunto)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FIELD_DEFS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', display: 'block', marginBottom: 4, fontFamily: 'var(--label-font)' }}>
                  {f.label}
                </label>
                <input
                  type={f.key === 'lucidbotApiKey' ? 'password' : 'text'}
                  placeholder={f.ph}
                  value={config[f.key] || ''}
                  onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <Button onClick={guardarConfig} disabled={savingConfig} style={{ alignSelf: 'flex-start' }}>
              {savingConfig ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        </div>

        {/* HISTORIAL */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="history" size={18} style={{ color: 'var(--accent2)' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Historial de importaciones ({importaciones.length})</span>
          </div>
          {importaciones.length === 0 ? (
            <EmptyState icon="history" title="Sin importaciones" text="Las importaciones exitosas y fallidas aparecerán aquí." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {importaciones.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: log.estado === 'ok' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Pedido #{log.lucidsalesPedidoId} · {log.cliente}
                    </div>
                    {log.detalle && <div style={{ fontSize: 11, color: 'var(--red)' }}>{log.detalle.substring(0, 160)}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {log.estado !== 'ok' && (
                    <Button variant="ghost" size="sm" icon="refresh" onClick={() => reintentar(log)} disabled={reintentando === log.id} style={{ flexShrink: 0 }}>
                      Reintentar
                    </Button>
                  )}
                  <button
                    onClick={() => desimportar(log)}
                    disabled={desimportando === log.id}
                    className="btn btn-ghost"
                    title="Desimportar: elimina de los bot fields"
                    style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red)', borderColor: 'color-mix(in srgb, var(--red) 40%, transparent)', flexShrink: 0 }}
                  >
                    {desimportando === log.id ? '...' : 'Desimportar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL IMPORTAR */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar pedidos desde Lucid Sales"
        subtitle={`${selectedIds.size} seleccionado(s) · cada pedido se sincroniza a los bot fields de pedidos de Zunto`}
        size="lg"
      >
        {resumen ? (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ ...cardStyle, flex: 1, textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{resumen.total}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Total</div>
              </div>
              <div style={{ ...cardStyle, flex: 1, textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)' }}>{resumen.ok}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Importados</div>
              </div>
              <div style={{ ...cardStyle, flex: 1, textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--red)' }}>{resumen.error}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Con error</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {resumen.detalle.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{d.estado === 'ok' ? '✅' : '❌'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</span>
                  {d.estado !== 'ok' && d.errores?.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--red)' }}>{d.errores.join(' | ').substring(0, 120)}</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" onClick={() => { setShowImportModal(false); setResumen(null); }}>Cerrar</Button>
              <Button variant="secondary" onClick={() => { setResumen(null); }}>Nueva importación</Button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Buscar cliente o referencia..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setLsPage(1); cargarPedidosLS(1); } }}
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              />
              <select
                value={estadoFilter}
                onChange={e => { setEstadoFilter(e.target.value); setLsPage(1); cargarPedidosLS(1); }}
                style={{ ...inputStyle, width: 'auto', minWidth: 150, cursor: 'pointer' }}
              >
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <Button variant="ghost" onClick={() => { setLsPage(1); cargarPedidosLS(1); }} style={{ whiteSpace: 'nowrap' }}>
                Buscar
              </Button>
              <Button variant="ghost" onClick={seleccionarTodos} style={{ whiteSpace: 'nowrap' }}>
                {lsPedidos.length > 0 && lsPedidos.every(p => selectedIds.has(p.id)) ? 'Quitar todos' : 'Seleccionar todos'}
              </Button>
            </div>
            {lsCargando ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando pedidos de LucidSales...</div>
            ) : lsPedidos.length === 0 ? (
              <EmptyState icon="search_off" title="Sin resultados" text="No se encontraron pedidos." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                {lsPedidos.map(p => {
                  const badge = ESTADO_BADGE[p.estadoPedido] || { label: `Estado ${p.estadoPedido}`, color: 'var(--text3)' };
                  return (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: selectedIds.has(p.id) ? 'color-mix(in srgb, var(--accent) 10%, var(--bg3))' : 'var(--bg3)', borderRadius: 8, border: selectedIds.has(p.id) ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSeleccion(p.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          #{p.id} · {p.cliente}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.movil || 'Sin teléfono'}{p.referencias ? ` · ${p.referencias}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, color: badge.color, background: 'var(--bg2)', border: `1px solid ${badge.color}44`, flexShrink: 0 }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--accent2)', flexShrink: 0 }}>{formatMoney(p.total)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {lsNumPages > 1 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  onClick={() => { setLsPage(lsPage - 1); cargarPedidosLS(lsPage - 1); }}
                  disabled={lsPage <= 1 || lsCargando}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '4px 12px', opacity: lsPage <= 1 ? 0.4 : 1 }}
                >
                  ← Anterior
                </button>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Página {lsPage} de {lsNumPages}</span>
                <button
                  onClick={() => { setLsPage(lsPage + 1); cargarPedidosLS(lsPage + 1); }}
                  disabled={lsPage >= lsNumPages || lsCargando}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '4px 12px', opacity: lsPage >= lsNumPages ? 0.4 : 1 }}
                >
                  Siguiente →
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>Cancelar</Button>
              <Button icon="cloud_upload" onClick={importar} disabled={importando || selectedIds.size === 0}>
                {importando ? 'Importando...' : `Importar (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
