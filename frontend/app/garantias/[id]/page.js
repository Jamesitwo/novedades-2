'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function GarantiaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useAuthStore();
  const [garantia, setGarantia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (m, t = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => { fetchGarantia(); }, [params.id]);

  const fetchGarantia = async () => {
    try { const { data } = await api.get(`/api/garantias/${params.id}`); setGarantia(data); }
    catch { showToast('Error al cargar', 'error'); }
    finally { setLoading(false); }
  };

  const handleEstado = async (estado) => {
    try { await api.patch(`/api/garantias/${params.id}/estado`, { estado }); fetchGarantia(); showToast('Estado actualizado'); }
    catch { showToast('Error', 'error'); }
  };

  let fotos = [];
  try { fotos = garantia ? JSON.parse(garantia.fotos || '[]') : []; } catch {}

  if (loading) return <div className="content"><div className="loading">Cargando...</div></div>;
  if (!garantia) return <div className="content"><div className="loading">Garantía no encontrada</div></div>;

  const expirada = new Date(garantia.fechaExpiracion) < new Date();

  return (
    <div className="content" style={{ maxWidth: 800 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500 }}>{toast.message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>
            Garantía de {garantia.clienteNombre || garantia.linkToken.substring(0, 8) + '...'}
          </h2>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
            background: { esperando: 'rgba(99,102,241,0.12)', pendiente: 'rgba(245,158,11,0.12)', revisada: 'rgba(59,130,246,0.12)', aprobada: 'rgba(34,197,94,0.12)', rechazada: 'rgba(239,68,68,0.12)' }[garantia.estado],
            color: { esperando: '#6366f1', pendiente: 'var(--amber)', revisada: '#3b82f6', aprobada: 'var(--green)', rechazada: 'var(--red)' }[garantia.estado]
          }}>{garantia.estado}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {garantia.estado === 'pendiente' && (
            <button onClick={() => handleEstado('revisada')} className="btn btn-secondary" style={{ padding: '8px 14px' }}>Marcar revisada</button>
          )}
          {garantia.estado === 'revisada' && (
            <>
              <button onClick={() => handleEstado('aprobada')} className="btn btn-success" style={{ padding: '8px 14px' }}>✅ Aprobar</button>
              <button onClick={() => handleEstado('rechazada')} className="btn btn-danger" style={{ padding: '8px 14px' }}>❌ Rechazar</button>
            </>
          )}
          <button onClick={() => router.push('/garantias')} className="btn btn-ghost">Volver</button>
        </div>
      </div>

      {expirada && garantia.estado === 'esperando' && (
        <div className="alert-banner" style={{ marginBottom: 16 }}>
          <span className="alert-icon">⚠</span>
          <span className="alert-text">Este link expiró el {new Date(garantia.fechaExpiracion).toLocaleDateString('es-CO')}</span>
        </div>
      )}

      <div className="table-card" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-header-title">Datos del cliente</span></div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Cliente</div><div>{garantia.clienteNombre || 'Sin registrar'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Producto</div><div>{garantia.producto || 'Sin registrar'}</div></div>
          {garantia.telefono && (
            <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Teléfono</div><div className="td-mono" style={{ fontSize: 13 }}>{garantia.telefono}</div></div>
          )}
          {garantia.precio > 0 && (
            <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Precio</div><div className="td-mono" style={{ fontSize: 13 }}>${Number(garantia.precio).toLocaleString()}</div></div>
          )}
          {garantia.conversacionLink && (
            <div className="span2"><div style={{ fontSize: 11, color: 'var(--text3)' }}>Conversación</div>
              <div><a href={garantia.conversacionLink} target="_blank" rel="noopener" style={{ color: 'var(--accent2)', fontSize: 13, wordBreak: 'break-all' }}>{garantia.conversacionLink}</a></div>
            </div>
          )}
          <div className="span2"><div style={{ fontSize: 11, color: 'var(--text3)' }}>Descripción</div><div>{garantia.descripcion || 'Sin descripción'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Token</div><div className="td-mono" style={{ fontSize: 12 }}>{garantia.linkToken}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Expira</div><div className="td-mono" style={{ fontSize: 12, color: expirada ? 'var(--red)' : 'var(--text2)' }}>{new Date(garantia.fechaExpiracion).toLocaleString('es-CO')}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Creado por</div><div>{garantia.creadoPor?.nombre}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Creado</div><div className="td-mono" style={{ fontSize: 12 }}>{new Date(garantia.createdAt).toLocaleString('es-CO')}</div></div>
        </div>
      </div>

      {fotos.length > 0 && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-header"><span className="table-header-title">Fotos ({fotos.length})</span></div>
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {fotos.map((f, i) => (
              <a key={i} href={f} target="_blank" rel="noopener">
                <img src={f} alt={`Foto ${i + 1}`} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, background: 'var(--bg3)' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {garantia.videoUrl && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-header"><span className="table-header-title">🎥 Video</span></div>
          <div style={{ padding: 12 }}>
            <video controls style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 400 }}
              src={garantia.videoUrl}>
              Tu navegador no soporta video.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
