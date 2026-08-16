'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toaster';

const FIELD_DEFS = [
  { key: 'lucidbotApiKey', label: 'Token LucidBot (X-ACCESS-TOKEN)', ph: 'Token de acceso...' },
  { key: 'botFieldAdIds', label: 'bot_field_id — ad_id_lucidsales', ph: 'ID del campo' },
  { key: 'botFieldCatalogo', label: 'bot_field_id — Catalogo_productos_LucidSales', ph: 'ID del campo' },
  { key: 'botFieldIntegracion', label: 'bot_field_id — Integracion_LucidSales', ph: 'ID del campo' },
  { key: 'botFieldMensajes', label: 'bot_field_id — mensajes_iniciales_lucidsales', ph: 'ID del campo' },
  { key: 'botFieldMultimedia', label: 'bot_field_id — Multimedia_productos_LucidSales', ph: 'ID del campo' }
];

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

export default function PerfumesPage() {
  const [config, setConfig] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [productosLocales, setProductosLocales] = useState([]);
  const [cargandoLocales, setCargandoLocales] = useState(true);

  const [lsProductos, setLsProductos] = useState([]);
  const [lsCargando, setLsCargando] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');

  const [importando, setImportando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [importaciones, setImportaciones] = useState([]);
  const [reintentando, setReintentando] = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/api/perfumes/config');
      setConfig(data.config || {});
    } catch {
      toast.error('No se pudo cargar la configuración');
    }
  }, []);

  const fetchLocales = useCallback(async () => {
    try {
      const { data } = await api.get('/api/perfumes/productos');
      setProductosLocales(data.productos || []);
    } catch { /* sin catálogo local aún */ }
    finally { setCargandoLocales(false); }
  }, []);

  const fetchImportaciones = useCallback(async () => {
    try {
      const { data } = await api.get('/api/perfumes/importaciones');
      setImportaciones(data.logs || []);
    } catch { /* historial vacío */ }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchLocales();
    fetchImportaciones();
  }, [fetchConfig, fetchLocales, fetchImportaciones]);

  const guardarConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/api/perfumes/config', config);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const abrirImportador = async () => {
    setShowImportModal(true);
    setResumen(null);
    setSelectedIds(new Set());
    setLsCargando(true);
    try {
      const { data } = await api.get('/api/perfumes/lucidsales-productos');
      setLsProductos(data.productos || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar productos de LucidSales');
    } finally {
      setLsCargando(false);
    }
  };

  const toggleSeleccion = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    const filtrados = lsProductos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    const todosYa = filtrados.length > 0 && filtrados.every(p => selectedIds.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      filtrados.forEach(p => todosYa ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const importar = async () => {
    if (selectedIds.size === 0) { toast.error('Selecciona al menos un producto'); return; }
    setImportando(true);
    try {
      const { data } = await api.post('/api/perfumes/importar', { productoIds: Array.from(selectedIds) });
      setResumen(data);
      toast.success(`Importación: ${data.ok} ok, ${data.error} con error`);
      fetchImportaciones();
      fetchLocales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar');
    } finally {
      setImportando(false);
    }
  };

  const reintentar = async (log) => {
    setReintentando(log.id);
    try {
      const { data } = await api.post(`/api/perfumes/importaciones/${log.id}/reintentar`);
      setResumen(data);
      if (data.error === 0) toast.success(`${log.nombre} importado correctamente`);
      else toast.error(`${log.nombre}: ${data.detalle?.[0]?.errores?.join(' | ') || 'error'}`);
      fetchImportaciones();
      fetchLocales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reintentar');
    } finally {
      setReintentando(null);
    }
  };

  const toggleActivo = async (p) => {
    try {
      await api.patch(`/api/tienda/${p.id}/toggle`);
      fetchLocales();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const filtrados = lsProductos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Perfumes</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            Tienda independiente · catálogo, importación y sincronización con LucidBot
          </p>
        </div>
        <Button icon="cloud_download" onClick={abrirImportador}>Importar desde Lucid Sales</Button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
        {/* CONFIG */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="settings" size={18} style={{ color: 'var(--accent2)' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Configuración LucidBot</span>
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

        {/* CATALOGO LOCAL */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="inventory_2" size={18} style={{ color: 'var(--accent2)' }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Catálogo local ({productosLocales.length})</span>
          </div>
          {cargandoLocales ? (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: 20, textAlign: 'center' }}>Cargando...</div>
          ) : productosLocales.length === 0 ? (
            <EmptyState icon="sanitizer" title="Sin productos" text="Importa productos desde Lucid Sales para llenar este catálogo." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
              {productosLocales.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {p.imagen ? (
                    <img src={p.imagen} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', background: 'var(--bg2)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg2)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--accent2)' }}>
                      ${Number(p.precioVenta || 0).toLocaleString('es-CO')}
                    </div>
                  </div>
                  <button onClick={() => toggleActivo(p)} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>
                    {p.activo ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HISTORIAL */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="history" size={18} style={{ color: 'var(--accent2)' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Historial de importaciones</span>
        </div>
        {importaciones.length === 0 ? (
          <EmptyState icon="history" title="Sin importaciones" text="Las importaciones exitosas y fallidas aparecerán aquí." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {importaciones.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: log.estado === 'ok' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.nombre}</div>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL IMPORTAR */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar desde Lucid Sales"
        subtitle={`${selectedIds.size} seleccionado(s) · cada producto se sincroniza a los 5 bot fields y al catálogo local`}
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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <input
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <Button variant="ghost" onClick={seleccionarTodos} style={{ whiteSpace: 'nowrap' }}>
                {filtrados.length > 0 && filtrados.every(p => selectedIds.has(p.id)) ? 'Quitar todos' : 'Seleccionar todos'}
              </Button>
            </div>
            {lsCargando ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando productos de LucidSales...</div>
            ) : filtrados.length === 0 ? (
              <EmptyState icon="search_off" title="Sin resultados" text="No se encontraron productos." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                {filtrados.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: selectedIds.has(p.id) ? 'color-mix(in srgb, var(--accent) 10%, var(--bg3))' : 'var(--bg3)', borderRadius: 8, border: selectedIds.has(p.id) ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSeleccion(p.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                    {p.imagen ? (
                      <img src={p.imagen} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', background: 'var(--bg2)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg2)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                      {p.descripcion && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</div>}
                    </div>
                    {p.precio != null && <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--accent2)', flexShrink: 0 }}>${Number(p.precio).toLocaleString('es-CO')}</span>}
                  </label>
                ))}
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
