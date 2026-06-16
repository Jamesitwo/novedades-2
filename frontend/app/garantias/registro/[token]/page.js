'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegistroGarantiaPage() {
  const params = useParams();
  const router = useRouter();
  const [tokenValid, setTokenValid] = useState(null);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ clienteNombre: '', producto: '', descripcion: '' });
  const [fotos, setFotos] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cloudinaryReady, setCloudinaryReady] = useState(false);

  useEffect(() => {
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = () => setCloudinaryReady(true);
      document.head.appendChild(script);
    } else {
      setCloudinaryReady(true);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        await api.get(`/api/garantias/check/${params.token}`);
        setTokenValid(true);
      } catch (e) {
        if (e.response?.status === 410) setError('Este link ha expirado.');
        else if (e.response?.status === 400) setError('Esta garantía ya fue registrada.');
        else setError('Link no válido.');
        setTokenValid(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [params.token]);

  const openPhotoUpload = () => {
    if (!window.cloudinary) return;
    window.cloudinary.openUploadWidget(
      {
        cloudName: 'dgbz1ze71',
        uploadPreset: 'garantias_preset',
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 10,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        styles: { palette: { window: '#171a23', windowBorder: '#2e3250', tabIcon: '#fff', menuIcons: '#8b90b0', textDark: '#e8eaf2', textLight: '#8b90b0', link: '#5b6ef5', action: '#22c87a', inactiveTabIcon: '#565a7a', error: '#ef4444', inProgress: '#6366f1', complete: '#22c87a', sourceBg: '#1e2130' } }
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          setFotos(prev => [...prev, result.info.secure_url]);
        }
      }
    );
  };

  const openVideoUpload = () => {
    if (!window.cloudinary) return;
    window.cloudinary.openUploadWidget(
      {
        cloudName: 'dgbz1ze71',
        uploadPreset: 'garantias_preset',
        sources: ['local', 'camera'],
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ['mp4', 'mov', 'avi', 'webm'],
        maxFileSize: 100000000,
        styles: { palette: { window: '#171a23', windowBorder: '#2e3250', tabIcon: '#fff', menuIcons: '#8b90b0', textDark: '#e8eaf2', textLight: '#8b90b0', link: '#5b6ef5', action: '#22c87a', inactiveTabIcon: '#565a7a', error: '#ef4444', inProgress: '#6366f1', complete: '#22c87a', sourceBg: '#1e2130' } }
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          setVideoUrl(result.info.secure_url);
        }
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clienteNombre) { setError('El nombre es requerido'); return; }
    if (!videoUrl) { setError('El video es obligatorio'); return; }
    setSending(true);
    setError('');
    try {
      await api.post(`/api/garantias/registro/${params.token}`, {
        clienteNombre: form.clienteNombre,
        producto: form.producto,
        descripcion: form.descripcion,
        fotos,
        videoUrl
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#8b90b0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #2e3250', borderTopColor: '#5b6ef5', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          <div>Verificando link...</div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#8b90b0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{error}</div>
          <div style={{ fontSize: 13, color: '#565a7a' }}>Contacta a quien te envió este link para solicitar uno nuevo.</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#8b90b0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ color: '#22c87a', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¡Garantía registrada!</div>
          <div style={{ fontSize: 13, color: '#565a7a' }}>Tu garantía ha sido enviada. Pronto nos pondremos en contacto contigo.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e8eaf2', fontFamily: 'system-ui, sans-serif', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Registro de Garantía</h1>
          <div style={{ fontSize: 13, color: '#8b90b0', marginTop: 8 }}>Completa el formulario para registrar tu garantía</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ background: '#171a23', border: '1px solid #2e3250', borderRadius: 12, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8b90b0', fontWeight: 500, marginBottom: 4 }}>Tu nombre *</label>
              <input type="text" value={form.clienteNombre} onChange={e => setForm({ ...form, clienteNombre: e.target.value })}
                required placeholder="Nombre completo"
                style={{ width: '100%', background: '#1e2130', border: '1px solid #2e3250', borderRadius: 8, padding: '10px 12px', color: '#e8eaf2', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8b90b0', fontWeight: 500, marginBottom: 4 }}>Producto</label>
              <input type="text" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}
                placeholder="Nombre del producto"
                style={{ width: '100%', background: '#1e2130', border: '1px solid #2e3250', borderRadius: 8, padding: '10px 12px', color: '#e8eaf2', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8b90b0', fontWeight: 500, marginBottom: 4 }}>Descripción breve</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe el problema o motivo de la garantía..."
                rows={4}
                style={{ width: '100%', background: '#1e2130', border: '1px solid #2e3250', borderRadius: 8, padding: '10px 12px', color: '#e8eaf2', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ background: '#171a23', border: '1px solid #2e3250', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📸 Fotos (opcional)</div>
            {fotos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {fotos.map((f, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={f} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                    <button type="button" onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={openPhotoUpload}
              style={{ background: '#1e2130', border: '1px solid #2e3250', borderRadius: 8, padding: '10px 16px', color: '#8b90b0', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              + Agregar fotos
            </button>
          </div>

          <div style={{ background: '#171a23', border: '1px solid #2e3250', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🎥 Video * (obligatorio, máx. 5 min)</div>
            {videoUrl ? (
              <div style={{ marginBottom: 12 }}>
                <video controls src={videoUrl} style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 250 }} />
                <button type="button" onClick={() => setVideoUrl(null)}
                  style={{ marginTop: 8, background: 'transparent', border: '1px solid #ef4444', borderRadius: 6, padding: '6px 12px', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Quitar video</button>
              </div>
            ) : (
              <button type="button" onClick={openVideoUpload}
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', borderRadius: 8, padding: '14px 20px', color: '#818cf8', fontSize: 14, cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                📹 Grabar o seleccionar video
              </button>
            )}
          </div>

          <button type="submit" disabled={sending || !cloudinaryReady}
            style={{ width: '100%', background: sending ? '#4f46e5' : '#6366f1', border: 'none', borderRadius: 10, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: sending ? 'default' : 'pointer' }}>
            {sending ? 'Enviando...' : 'Enviar Garantía'}
          </button>
        </form>
      </div>
    </div>
  );
}
