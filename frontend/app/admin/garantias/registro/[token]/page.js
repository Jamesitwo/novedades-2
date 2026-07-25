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
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp']
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
        resourceType: 'video',
        sources: ['local', 'camera'],
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ['mp4', 'mov', 'avi', 'webm'],
        maxFileSize: 100000000
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

  const bg = '#f5f6fa';
  const cardBg = '#ffffff';
  const cardBorder = '#d1d5e0';
  const inputBg = '#e8eaf0';
  const inputBorder = '#d1d5e0';
  const text = '#1a1d2e';
  const text2 = '#4a5168';
  const text3 = '#7c8299';
  const accent = '#5b6ef5';
  const accent2 = '#7c8fff';
  const green = '#22c87a';
  const red = '#ef4444';

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: text2, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${cardBorder}`, borderTopColor: accent, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          <div>Verificando link...</div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: text2, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <div style={{ color: red, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{error}</div>
          <div style={{ fontSize: 13, color: text3 }}>Contacta a quien te envió este link para solicitar uno nuevo.</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: text2, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ color: green, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>¡Garantía registrada!</div>
          <div style={{ fontSize: 13, color: text3 }}>Tu garantía ha sido enviada. Pronto nos pondremos en contacto contigo.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: 'system-ui, sans-serif', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: text }}>Registro de Garantía</h1>
          <div style={{ fontSize: 13, color: text3, marginTop: 8 }}>Completa el formulario para registrar tu garantía</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: red, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: text3, fontWeight: 500, marginBottom: 4 }}>Tu nombre *</label>
              <input type="text" value={form.clienteNombre} onChange={e => setForm({ ...form, clienteNombre: e.target.value })}
                required placeholder="Nombre completo"
                style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, padding: '10px 12px', color: text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: text3, fontWeight: 500, marginBottom: 4 }}>Producto</label>
              <input type="text" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}
                placeholder="Nombre del producto"
                style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, padding: '10px 12px', color: text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: text3, fontWeight: 500, marginBottom: 4 }}>Descripción breve</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describe el problema o motivo de la garantía..."
                rows={4}
                style={{ width: '100%', background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, padding: '10px 12px', color: text, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: text }}>📸 Fotos (opcional)</div>
            {fotos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {fotos.map((f, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={f} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                    <button type="button" onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, background: red, border: 'none', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={openPhotoUpload}
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, padding: '10px 16px', color: text2, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              + Agregar fotos
            </button>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: text }}>🎥 Video * (obligatorio, máx. 5 min)</div>
            {videoUrl ? (
              <div style={{ marginBottom: 12 }}>
                <video controls src={videoUrl} style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 250 }} />
                <button type="button" onClick={() => setVideoUrl(null)}
                  style={{ marginTop: 8, background: 'transparent', border: `1px solid ${red}`, borderRadius: 6, padding: '6px 12px', color: red, fontSize: 12, cursor: 'pointer' }}>Quitar video</button>
              </div>
            ) : (
              <button type="button" onClick={openVideoUpload}
                style={{ background: 'rgba(91,110,245,0.1)', border: `1px solid ${accent}`, borderRadius: 8, padding: '14px 20px', color: accent2, fontSize: 14, cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                📹 Grabar o seleccionar video
              </button>
            )}
          </div>

          <button type="submit" disabled={sending || !cloudinaryReady}
            style={{ width: '100%', background: sending ? '#4f46e5' : accent, border: 'none', borderRadius: 10, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: sending ? 'default' : 'pointer' }}>
            {sending ? 'Enviando...' : 'Enviar Garantía'}
          </button>
        </form>
      </div>
    </div>
  );
}
