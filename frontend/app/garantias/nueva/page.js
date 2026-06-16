'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NuevaGarantiaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [producto, setProducto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [conversacionLink, setConversacionLink] = useState('');
  const [precio, setPrecio] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/garantias', {
        nombre: nombre || null, producto: producto || null,
        telefono, conversacionLink, precio
      });
      setCreated(data);
    } catch { /* error */ }
    finally { setLoading(false); }
  };

  const linkUrl = created ? `${window.location.origin}/garantias/registro/${created.linkToken}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="content" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Nuevo Link de Garantía</h2>
        <button onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
      </div>

      {created ? (
        <div className="table-card">
          <div className="table-header"><span className="table-header-title">✅ Link generado</span></div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Comparte este link con el cliente:</div>
            <div style={{
              background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 8,
              padding: '12px 14px', fontSize: 13, fontFamily: 'var(--mono)', wordBreak: 'break-all',
              marginBottom: 12, color: 'var(--accent2)'
            }}>
              {linkUrl}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={copyLink} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                {copied ? '✅ Copiado' : '📋 Copiar link'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Expira: {new Date(created.fechaExpiracion).toLocaleString('es-CO')} · Token: <span className="td-mono">{created.linkToken}</span>
            </div>
            <button onClick={() => setCreated(null)} className="btn btn-ghost" style={{ marginTop: 16 }}>Generar otro link</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="table-card" style={{ marginBottom: 16 }}>
            <div className="table-header"><span className="table-header-title">Datos (opcional)</span></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Nombre del cliente</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Opcional - el cliente lo llenará" style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Producto</label>
                <input value={producto} onChange={e => setProducto(e.target.value)} placeholder="Opcional - el cliente lo llenará" style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Teléfono *</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} required placeholder="Celular del cliente" style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Link de conversación *</label>
                <input type="url" value={conversacionLink} onChange={e => setConversacionLink(e.target.value)} required placeholder="https://wa.me/..." style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Opcional" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            {loading ? 'Generando...' : '🔗 Generar Link'}
          </button>
        </form>
      )}
    </div>
  );
}
