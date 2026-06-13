'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ESTADOS_OFICINA = ['pendiente_llamar', 'contactado', 'va_a_recoger', 'no_va_a_recoger', 'devolucion'];
const RESULTADOS = ['no_contesta', 'ocupado', 'equivocado', 'contactado', 'buzon'];

const labelEstado = (e) => {
  const m = {
    pendiente_llamar: 'Pend. llamar',
    contactado: 'Contactado',
    va_a_recoger: 'Va a recoger',
    no_va_a_recoger: 'No va a recoger',
    devolucion: 'Devolución'
  };
  return m[e] || e;
};

const labelResultado = (e) => {
  const m = {
    no_contesta: 'No contesta',
    ocupado: 'Ocupado',
    equivocado: 'Número equivocado',
    contactado: 'Contactado',
    buzon: 'Buzón de voz'
  };
  return m[e] || e;
};

const getBadgeClass = (estado) => {
  const m = {
    pendiente_llamar: 'pendiente',
    contactado: 'contactado',
    va_a_recoger: 'va_recoger',
    no_va_a_recoger: 'no_recoger',
    devolucion: 'purple'
  };
  return m[estado] || estado;
};

export default function OficinaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useAuthStore();
  const [pedido, setPedido] = useState(null);
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPedido = async () => {
    try {
      const [pedidoRes, operadoresRes, etiquetasRes] = await Promise.all([
        api.get(`/api/oficina/${params.id}`),
        api.get('/api/usuarios/operadores'),
        api.get('/api/etiquetas')
      ]);
      setPedido(pedidoRes.data);
      setOperadores(operadoresRes.data);
      setTodasEtiquetas(etiquetasRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedido();
  }, [params.id]);

  const handleEstadoChange = async (nuevoEstado) => {
    setConfirmModal({
      title: 'Cambiar estado',
      message: `¿Cambiar estado a "${labelEstado(nuevoEstado)}"?`,
      onConfirm: async () => {
        setUpdating(true);
        try {
          await api.patch(`/api/oficina/${params.id}/estado`, { estado: nuevoEstado });
          await fetchPedido();
          showToast('Estado actualizado correctamente');
        } catch (error) {
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
      await api.post(`/api/oficina/${params.id}/intento`, intentoData);
      await fetchPedido();
      setShowIntentoForm(false);
      setIntentoData({ resultado: '', notas: '' });
      showToast('Intento registrado correctamente');
    } catch (error) {
      showToast('Error al registrar intento', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setConfirmModal({
      title: 'Eliminar pedido',
      message: '¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/oficina/${params.id}`);
          router.push('/oficina');
        } catch (error) {
          showToast('Error al eliminar', 'error');
          setConfirmModal(null);
        }
      }
    });
  };

  const handleTransfer = async () => {
    if (!transferData.aUsuarioId) {
      showToast('Selecciona un operador destino', 'error');
      return;
    }
    setUpdating(true);
    try {
      await api.patch(`/api/oficina/${params.id}/transferir`, {
        aUsuarioId: transferData.aUsuarioId,
        notas: transferData.notas
      });
      await fetchPedido();
      setShowTransferModal(false);
      setTransferData({ aUsuarioId: '', notas: '' });
      showToast('Pedido transferido correctamente');
    } catch (error) {
      showToast('Error al transferir', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const canTransfer = () => {
    if (usuario?.rol === 'admin') return true;
    if (['operador', 'operador_asignado'].includes(usuario?.rol) && pedido?.asignadoId === usuario.id) return true;
    return false;
  };

  const getDiasRestantes = (fechaLimite) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="loading">Cargando...</div>;
  if (!pedido) return <div className="loading">Pedido no encontrado</div>;

  const dias = getDiasRestantes(pedido.fechaLimite);

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
              <button
                onClick={() => setConfirmModal(null)}
                className="btn btn-ghost"
                style={{ padding: '8px 16px' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="btn btn-primary"
                style={{ padding: '8px 16px' }}
              >
                Confirmar
              </button>
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
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Transferir pedido</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Operador destino</label>
              <select
                value={transferData.aUsuarioId}
                onChange={(e) => setTransferData(prev => ({ ...prev, aUsuarioId: e.target.value }))}
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '10px 12px', fontSize: 14, color: 'var(--text)', cursor: 'pointer'
                }}
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
                placeholder="Agregar una nota sobre esta transferencia..."
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '10px 12px', fontSize: 14, color: 'var(--text)', minHeight: 80, resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowTransferModal(false); setTransferData({ aUsuarioId: '', notas: '' }); }} className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                Cancelar
              </button>
              <button onClick={handleTransfer} disabled={updating} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                {updating ? 'Transferiendo...' : 'Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-panel" style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        <div className="detail-header">
          <div>
            <div className="detail-title">{pedido.nombre} {pedido.apellido}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <span className={`badge ${getBadgeClass(pedido.estado)}`}>{labelEstado(pedido.estado)}</span>
              {dias <= 3 && (
                <span className="vence-tag" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--amber)' }}>
                  {dias <= 0 ? 'Vence hoy' : `${dias} días`}
                </span>
              )}
              {pedido.asignado && (
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Asignado: <strong style={{ color: 'var(--accent)' }}>{pedido.asignado.nombre}</strong>
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canTransfer() && (
              <button onClick={() => setShowTransferModal(true)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                ↔ Transferir
              </button>
            )}
            <button onClick={() => router.push('/oficina')} className="detail-close">✕</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-field-label">Celular</div>
            <div className="detail-field-value td-mono">{pedido.celular}</div>
          </div>
          {pedido.celular2 && (
            <div className="detail-field">
              <div className="detail-field-label">Celular 2</div>
              <div className="detail-field-value td-mono" style={{ color: 'var(--accent2)' }}>{pedido.celular2}</div>
            </div>
          )}
          <div className="detail-field">
            <div className="detail-field-label">Fecha límite</div>
            <div className="detail-field-value td-mono">
              {new Date(pedido.fechaLimite).toLocaleDateString('es-CO')}
              {dias <= 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>⚠ VENCIDO</span>}
            </div>
          </div>
          <div className="detail-field full">
            <div className="detail-field-label">Producto</div>
            <div className="detail-field-value">{pedido.producto}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Transportadora</div>
            <div className="detail-field-value">{pedido.transportadora}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Guía</div>
            <div className="detail-field-value td-mono">{pedido.guia}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Intentos llamada</div>
            <div className="detail-field-value">{pedido.intentosLlamada}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label">Creado por</div>
            <div className="detail-field-value">{pedido.createdBy?.nombre}</div>
          </div>
          <div className="detail-field full">
            <div className="detail-field-label">Notas</div>
            <div className="detail-field-value">{pedido.notas || 'Sin notas registradas'}</div>
          </div>
          {pedido.conversacionLink && (
            <div className="detail-field full">
              <div className="detail-field-label">Link de conversación</div>
              <div className="detail-field-value">
                <a href={pedido.conversacionLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'underline' }}>
                  {pedido.conversacionLink}
                </a>
              </div>
            </div>
          )}
        </div>

        {pedido.imagenGuiaUrl && (
          <div className="detail-section">
            <div className="detail-section-title">Imagen de guía</div>
            <img src={pedido.imagenGuiaUrl} alt="Guía" className="image-preview" />
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">Cambiar estado</div>
          <div className="estado-buttons">
            {ESTADOS_OFICINA.map((est) => (
              <button
                key={est}
                onClick={() => handleEstadoChange(est)}
                disabled={updating || est === pedido.estado}
                className={`action-btn ${est === 'no_va_a_recoger' ? 'danger' : ''}`}
                style={{
                  ...(est === pedido.estado ? { borderColor: 'var(--accent)', color: 'var(--accent2)' } : {}),
                  ...(est === 'devolucion' ? { color: 'var(--purple)' } : {})
                }}
              >
                {labelEstado(est)}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">Registrar intento de contacto</div>
          {!showIntentoForm ? (
            <button onClick={() => setShowIntentoForm(true)} className="btn btn-primary">
              📞 Registrar intento
            </button>
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
                    {labelResultado(r)}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Nota del intento..."
                value={intentoData.notas}
                onChange={(e) => setIntentoData({ ...intentoData, notas: e.target.value })}
                style={{ width: '100%', marginBottom: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, color: 'var(--text)', minHeight: 60 }}
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

        {pedido.intentosContacto?.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Historial de intentos</div>
            {pedido.intentosContacto.map((int) => (
              <div key={int.id} className="intento-item">
                <div className="intento-resultado" style={{
                  color: int.resultado === 'contactado' ? 'var(--green)' : int.resultado === 'no_contesta' ? 'var(--amber)' : 'var(--text2)'
                }}>
                  {labelResultado(int.resultado)}
                </div>
                {int.notas && <div className="intento-nota">{int.notas}</div>}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                  {int.usuario?.nombre} — {new Date(int.createdAt).toLocaleString('es-CO')}
                </div>
              </div>
            ))}
          </div>
        )}

        {pedido.historialCambios?.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Historial de cambios</div>
            {pedido.historialCambios.map((h) => (
              <div key={h.id} className="historial-item">
                <div className="historial-dot"></div>
                <div>
                  <div className="historial-text">
                    <strong>{h.campo}</strong>: {h.valorAnterior} → {h.valorNuevo}
                    {' — '}<span style={{ color: 'var(--accent2)' }}>{h.usuario?.nombre}</span>
                  </div>
                  <div className="historial-time">
                    {new Date(h.createdAt).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pedido.transferencias?.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Historial de transferencias</div>
            {pedido.transferencias.map((t) => (
              <div key={t.id} className="historial-item">
                <div className="historial-dot" style={{ background: 'var(--teal)' }}></div>
                <div>
                  <div className="historial-text">
                    <span style={{ color: 'var(--amber)' }}>{t.deUsuario?.nombre}</span>
                    {' → '}
                    <span style={{ color: 'var(--teal)' }}>{t.aUsuario?.nombre}</span>
                    {t.notas && <span style={{ color: 'var(--text3)' }}> — "{t.notas}"</span>}
                  </div>
                  <div className="historial-time">
                    {new Date(t.createdAt).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">Etiquetas</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {pedido.etiquetas?.length > 0 ? pedido.etiquetas.map(e => (
              <span key={e.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                color: '#fff', background: e.color
              }}>
                {e.nombre}
                <button
                  onClick={async () => {
                    try {
                      await api.delete(`/api/oficina/${params.id}/etiquetas/${e.id}`);
                      await fetchPedido();
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
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', flex: 1
              }}
            >
              <option value="">Agregar etiqueta...</option>
              {todasEtiquetas.filter(e => !pedido.etiquetas?.some(ne => ne.id === e.id)).map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!selectedEtiqueta) return;
                try {
                  await api.post(`/api/oficina/${params.id}/etiquetas`, { etiquetaId: selectedEtiqueta });
                  setSelectedEtiqueta('');
                  await fetchPedido();
                } catch { showToast('Error al agregar etiqueta', 'error'); }
              }}
              disabled={!selectedEtiqueta}
              className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}
            >
              Agregar
            </button>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/oficina')} className="btn btn-ghost">← Volver</button>
          {usuario?.rol === 'admin' && (
            <button onClick={handleDelete} className="btn btn-danger">Eliminar</button>
          )}
        </div>
      </div>
    </div>
  );
}