'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ESTADOS_NOVEDAD = ['novedad', 'contactado', 'solucionado', 'entregado', 'devolucion'];
const ESTADOS_OFICINA = ['pendiente_llamar', 'contactado', 'va_a_recoger', 'entregado', 'devolucion'];
const RESULTADOS = ['no_contesta', 'ocupado', 'equivocado', 'contactado', 'buzon'];

const LABEL_NOVEDAD = { novedad: 'Novedad', contactado: 'Contactado', solucionado: 'Solucionado', entregado: 'Entregado', devolucion: 'Devolución' };
const LABEL_OFICINA = { pendiente_llamar: 'Pend. llamar', contactado: 'Contactado', va_a_recoger: 'Va a recoger', entregado: 'Entregado', devolucion: 'Devolución' };
const LABEL_RESULTADO = { no_contesta: 'No contesta', ocupado: 'Ocupado', equivocado: 'Número equivocado', contactado: 'Contactado', buzon: 'Buzón de voz' };
const BADGE_CLASS = {
  novedad: 'novedad', contactado: 'contactado', solucionado: 'solucionado', entregado: 'entregado', devolucion: 'purple',
  pendiente_llamar: 'pendiente', va_a_recoger: 'va_recoger', no_va_a_recoger: 'danger'
};

const getBadgeClass = (estado) => BADGE_CLASS[estado] || estado;

function formatTimeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

function getTimeRemaining(date) {
  if (!date) return null;
  const elapsed = Date.now() - new Date(date).getTime();
  const remaining = 24 * 3600000 - elapsed;
  if (remaining <= 0) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m restantes` : `${m}m restantes`;
}

export default function DetailPanel({ id, tipo, onClose, onUpdate }) {
  const { usuario } = useAuthStore();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showIntentoForm, setShowIntentoForm] = useState(false);
  const [intentoData, setIntentoData] = useState({ resultado: '', notas: '' });
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ aUsuarioId: '', notas: '' });
  const [operadores, setOperadores] = useState([]);
  const [todasEtiquetas, setTodasEtiquetas] = useState([]);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState('');

  const isNovedad = tipo === 'novedad';
  const LABEL_ESTADO = isNovedad ? LABEL_NOVEDAD : LABEL_OFICINA;
  const ESTADOS = isNovedad ? ESTADOS_NOVEDAD : ESTADOS_OFICINA;
  const apiBase = isNovedad ? 'novedades' : 'oficina';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRecord = async () => {
    try {
      const [recordRes, operadoresRes, etiquetasRes] = await Promise.all([
        api.get(`/api/${apiBase}/${id}`),
        api.get('/api/usuarios/operadores'),
        api.get('/api/etiquetas')
      ]);
      setRecord(recordRes.data);
      setOperadores(operadoresRes.data);
      setTodasEtiquetas(etiquetasRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const refreshAfterAction = async () => {
    await fetchRecord();
    if (onUpdate) onUpdate();
  };

  const handleEstadoChange = async (nuevoEstado) => {
    setConfirmModal({
      title: 'Cambiar estado',
      message: `¿Cambiar estado a "${LABEL_ESTADO[nuevoEstado]}"?`,
      onConfirm: async () => {
        setUpdating(true);
        try {
          await api.patch(`/api/${apiBase}/${id}/estado`, { estado: nuevoEstado });
          await refreshAfterAction();
          showToast('Estado actualizado correctamente');
        } catch {
          showToast('Error al cambiar estado', 'error');
        } finally {
          setUpdating(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleRegistrarIntento = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.post(`/api/${apiBase}/${id}/intento`, intentoData);
      await refreshAfterAction();
      setShowIntentoForm(false);
      setIntentoData({ resultado: '', notas: '' });
      showToast('Intento registrado correctamente');
    } catch {
      showToast('Error al registrar intento', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.aUsuarioId) {
      showToast('Selecciona un operador destino', 'error');
      return;
    }
    setUpdating(true);
    try {
      await api.patch(`/api/${apiBase}/${id}/transferir`, {
        aUsuarioId: transferData.aUsuarioId,
        notas: transferData.notas
      });
      await refreshAfterAction();
      setShowTransferModal(false);
      setTransferData({ aUsuarioId: '', notas: '' });
      showToast(`${isNovedad ? 'Novedad' : 'Pedido'} transferido correctamente`);
    } catch {
      showToast('Error al transferir', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setConfirmModal({
      title: `Eliminar ${isNovedad ? 'novedad' : 'pedido'}`,
      message: '¿Estás seguro? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/${apiBase}/${id}`);
          if (onUpdate) onUpdate();
          onClose();
        } catch {
          showToast('Error al eliminar', 'error');
          setConfirmModal(null);
        }
      }
    });
  };

  const canTransfer = () => {
    if (usuario?.rol === 'admin') return true;
    if (['operador', 'operador_asignado'].includes(usuario?.rol) && record?.asignadoId === usuario.id) return true;
    return false;
  };

  const getDiasRestantes = (fechaLimite) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24));
  };

  const handleToggleChat = async () => {
    setUpdating(true);
    try {
      await api.patch(`/api/${apiBase}/${id}/chat`, { chatActivo: !record.chatActivo });
      await refreshAfterAction();
      showToast(record.chatActivo ? 'Chat desactivado' : 'Chat activado');
    } catch {
      showToast('Error al actualizar chat', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <div className="detail-title" style={{ color: 'var(--text3)' }}>Cargando...</div>
          <button onClick={onClose} className="detail-close">✕</button>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <div className="detail-title" style={{ color: 'var(--text3)' }}>No encontrado</div>
          <button onClick={onClose} className="detail-close">✕</button>
        </div>
      </div>
    );
  }

  const dias = !isNovedad ? getDiasRestantes(record.fechaLimite) : null;

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 500, zIndex: 9999,
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

      {showTransferModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 16, padding: 24, maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Transferir {isNovedad ? 'novedad' : 'pedido'}</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Operador destino</label>
              <select
                value={transferData.aUsuarioId}
                onChange={(e) => setTransferData(prev => ({ ...prev, aUsuarioId: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}
              >
                <option value="">Seleccionar operador...</option>
                {operadores.filter(op => op.id !== usuario?.id).map(op => (
                  <option key={op.id} value={op.id}>{op.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Notas (opcional)</label>
              <textarea
                value={transferData.notas}
                onChange={(e) => setTransferData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Motivo de la transferencia..."
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: 'var(--text)', minHeight: 80, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowTransferModal(false); setTransferData({ aUsuarioId: '', notas: '' }); }} className="btn btn-ghost" style={{ padding: '8px 16px' }}>Cancelar</button>
              <button onClick={handleTransfer} disabled={updating} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                {updating ? 'Transferiendo...' : 'Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-panel-inner">
          <div className="detail-header">
            <div>
              <div className="detail-title">{record.nombre} {record.apellido}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: isNovedad ? 8 : 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${getBadgeClass(record.estado)}`}>{LABEL_ESTADO[record.estado]}</span>
                {!isNovedad && dias <= 3 && (
                  <span className="vence-tag" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                    {dias <= 0 ? 'Vence hoy' : `${dias} días`}
                  </span>
                )}
                {record.asignado && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Asignado: <strong style={{ color: 'var(--accent)' }}>{record.asignado.nombre}</strong>
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {canTransfer() && (
                <button onClick={() => setShowTransferModal(true)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>↔ Transferir</button>
              )}
              <button onClick={onClose} className="detail-close">✕</button>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-field">
              <div className="detail-field-label">Celular</div>
              <div className="detail-field-value td-mono">{record.celular}</div>
            </div>
            {record.celular2 && (
              <div className="detail-field">
                <div className="detail-field-label">Celular 2</div>
                <div className="detail-field-value td-mono" style={{ color: 'var(--accent2)' }}>{record.celular2}</div>
              </div>
            )}
            {isNovedad ? (
              <div className="detail-field">
                <div className="detail-field-label">Total a pagar</div>
                <div className="detail-field-value td-mono">${Number(record.totalAPagar).toLocaleString()}</div>
              </div>
            ) : (
              <>
                <div className="detail-field">
                  <div className="detail-field-label">Precio</div>
                  <div className="detail-field-value td-mono">${Number(record.precio || 0).toLocaleString()}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Fecha límite</div>
                  <div className="detail-field-value td-mono">
                    {new Date(record.fechaLimite).toLocaleDateString('es-CO')}
                    {dias <= 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>⚠ VENCIDO</span>}
                  </div>
                </div>
              </>
            )}
            <div className="detail-field full">
              <div className="detail-field-label">Producto</div>
              <div className="detail-field-value">{record.producto}</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Transportadora</div>
              <div className="detail-field-value">{record.transportadora}</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Guía</div>
              <div className="detail-field-value td-mono">{record.guia}</div>
            </div>
            {isNovedad && (
              <div className="detail-field full">
                <div className="detail-field-label">Motivo de la novedad</div>
                <div className="detail-field-value" style={{ color: 'var(--amber)' }}>{record.motivoNovedad || 'Sin motivo registrado'}</div>
              </div>
            )}
            <div className="detail-field">
              <div className="detail-field-label">Intentos llamada</div>
              <div className="detail-field-value">{record.intentosLlamada}</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Creado por</div>
              <div className="detail-field-value">{record.createdBy?.nombre}</div>
            </div>
            <div className="detail-field full">
              <div className="detail-field-label">Notas</div>
              <div className="detail-field-value">{record.notas || 'Sin notas registradas'}</div>
            </div>
            {!isNovedad && record.notasInternas && (
              <div className="detail-field full">
                <div className="detail-field-label">Notas internas</div>
                <div className="detail-field-value" style={{ color: 'var(--accent2)' }}>{record.notasInternas}</div>
              </div>
            )}
            {record.conversacionLink && (
              <div className="detail-field full">
                <div className="detail-field-label">Link de conversación</div>
                <div className="detail-field-value">
                  <a href={record.conversacionLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'underline' }}>
                    {record.conversacionLink}
                  </a>
                </div>
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 10,
                  background: record.chatActivo ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${record.chatActivo ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: record.chatActivo ? 'var(--green)' : 'var(--text3)',
                      flexShrink: 0
                    }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: record.chatActivo ? 'var(--green)' : 'var(--text3)' }}>
                        Chat {record.chatActivo ? 'activo' : 'inactivo'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                        {record.chatActivo
                          ? (getTimeRemaining(record.fechaUltimoMsjCliente) || 'Ventana abierta')
                          : (record.fechaUltimoMsjCliente
                            ? `${formatTimeAgo(record.fechaUltimoMsjCliente)} — ventana cerrada`
                            : 'Ventana de 24h cerrada')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleChat}
                    disabled={updating}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 500,
                      background: record.chatActivo ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: record.chatActivo ? 'var(--red)' : 'var(--green)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {record.chatActivo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isNovedad && record.imagenGuiaUrl && (
            <div className="detail-section">
              <div className="detail-section-title">Imagen de guía</div>
              <img src={record.imagenGuiaUrl} alt="Guía" className="image-preview" />
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">Cambiar estado</div>
            <div className="estado-buttons">
              {ESTADOS.map((est) => (
                <button
                  key={est}
                  onClick={() => handleEstadoChange(est)}
                  disabled={updating || est === record.estado}
                  className={`action-btn ${(isNovedad && est === 'cancelado') || (!isNovedad && est === 'no_va_a_recoger') ? 'danger' : ''}`}
                  style={{
                    ...(est === record.estado ? { borderColor: 'var(--accent)', color: 'var(--accent2)' } : {}),
                    ...(est === 'devolucion' ? { color: 'var(--purple)' } : {})
                  }}
                >
                  {LABEL_ESTADO[est]}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Registrar intento de contacto</div>
            {!showIntentoForm ? (
              <button onClick={() => setShowIntentoForm(true)} className="btn btn-primary">📞 Registrar intento</button>
            ) : (
              <form onSubmit={handleRegistrarIntento}>
                <div className="intento-buttons">
                  {RESULTADOS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setIntentoData({ ...intentoData, resultado: r })}
                      className={`action-btn ${intentoData.resultado === r ? 'active' : ''}`}
                      style={intentoData.resultado === r ? { borderColor: 'var(--accent)', color: 'var(--accent2)' } : {}}
                    >
                      {LABEL_RESULTADO[r]}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Nota del intento..."
                  value={intentoData.notas}
                  onChange={(e) => setIntentoData({ ...intentoData, notas: e.target.value })}
                  style={{ width: '100%', marginBottom: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, color: 'var(--text)', minHeight: 60, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setShowIntentoForm(false)} className="btn btn-ghost">Cancelar</button>
                  <button type="submit" disabled={updating || !intentoData.resultado} className="btn btn-success">
                    {updating ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {record.intentosContacto?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Historial de intentos</div>
              {record.intentosContacto.map((int) => (
                <div key={int.id} className="intento-item">
                  <div className="intento-resultado" style={{
                    color: int.resultado === 'contactado' ? 'var(--green)' : int.resultado === 'no_contesta' ? 'var(--amber)' : 'var(--text2)'
                  }}>
                    {LABEL_RESULTADO[int.resultado]}
                  </div>
                  {int.notas && <div className="intento-nota">{int.notas}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                    {int.usuario?.nombre} — {new Date(int.createdAt).toLocaleString('es-CO')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {record.historialCambios?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Historial de cambios</div>
              {record.historialCambios.map((h) => (
                <div key={h.id} className="historial-item">
                  <div className="historial-dot"></div>
                  <div>
                    <div className="historial-text">
                      <strong>{h.campo}</strong>: {h.valorAnterior} → {h.valorNuevo}
                      {' — '}<span style={{ color: 'var(--accent2)' }}>{h.usuario?.nombre}</span>
                    </div>
                    <div className="historial-time">{new Date(h.createdAt).toLocaleString('es-CO')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {record.transferencias?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Historial de transferencias</div>
              {record.transferencias.map((t) => (
                <div key={t.id} className="historial-item">
                  <div className="historial-dot" style={{ background: 'var(--teal)' }}></div>
                  <div>
                    <div className="historial-text">
                      <span style={{ color: 'var(--amber)' }}>{t.deUsuario?.nombre}</span>
                      {' → '}
                      <span style={{ color: 'var(--teal)' }}>{t.aUsuario?.nombre}</span>
                      {t.notas && <span style={{ color: 'var(--text3)' }}> — "{t.notas}"</span>}
                    </div>
                    <div className="historial-time">{new Date(t.createdAt).toLocaleString('es-CO')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">Etiquetas</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {record.etiquetas?.length > 0 ? record.etiquetas.map(e => (
                <span key={e.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  color: '#fff', background: e.color
                }}>
                  {e.nombre}
                  <button
                    onClick={async () => {
                      try {
                        await api.delete(`/api/${apiBase}/${id}/etiquetas/${e.id}`);
                        await fetchRecord();
                      } catch { showToast('Error al quitar etiqueta', 'error'); }
                    }}
                    style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, padding: 0, lineHeight: 1 }}
                  >✕</button>
                </span>
              )) : (
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Sin etiquetas</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={selectedEtiqueta}
                onChange={e => setSelectedEtiqueta(e.target.value)}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', flex: 1 }}
              >
                <option value="">Agregar etiqueta...</option>
                {todasEtiquetas.filter(e => !record.etiquetas?.some(ne => ne.id === e.id)).map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedEtiqueta) return;
                  try {
                    await api.post(`/api/${apiBase}/${id}/etiquetas`, { etiquetaId: selectedEtiqueta });
                    setSelectedEtiqueta('');
                    await fetchRecord();
                  } catch { showToast('Error al agregar etiqueta', 'error'); }
                }}
                disabled={!selectedEtiqueta}
                className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}
              >Agregar</button>
            </div>
          </div>

          {usuario?.rol === 'admin' && (
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={handleDelete} className="btn btn-danger" style={{ width: '100%' }}>🗑 Eliminar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
