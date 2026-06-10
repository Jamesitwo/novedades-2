'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NuevaOficinaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    celular: '',
    producto: '',
    precio: '',
    transportadora: '',
    guia: '',
    imagenGuiaUrl: '',
    fechaLlegada: '',
    notas: '',
    notasInternas: '',
    conversacionLink: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/oficina', formData);
      router.push('/oficina');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="form-container">
        <div className="form-card">
          <div className="form-title">Nuevo registro — En oficina</div>
          <div className="form-subtitle">Paquete disponible para recogida en punto de la transportadora. La fecha límite se calcula automáticamente en 7 días.</div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: 'var(--red)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16
              }}>
                {error}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="María" />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required placeholder="López" />
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input type="text" name="celular" value={formData.celular} onChange={handleChange} required placeholder="3009876543" />
              </div>
              <div className="form-group">
                <label>Fecha de llegada (opcional)</label>
                <input type="date" name="fechaLlegada" value={formData.fechaLlegada} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Producto</label>
                <input type="text" name="producto" value={formData.producto} onChange={handleChange} required placeholder="Nombre del producto" />
              </div>
              <div className="form-group">
                <label>Precio (COP)</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleChange} placeholder="0" min="0" />
              </div>
              <div className="form-group">
                <label>Transportadora</label>
                <input type="text" name="transportadora" value={formData.transportadora} onChange={handleChange} required placeholder="Servientrega" />
              </div>
              <div className="form-group">
                <label>Número de guía</label>
                <input type="text" name="guia" value={formData.guia} onChange={handleChange} required placeholder="SE123456789" />
              </div>
              <div className="form-group span2">
                <label>Link imagen de guía</label>
                <input type="url" name="imagenGuiaUrl" value={formData.imagenGuiaUrl} onChange={handleChange} placeholder="https://..." />
              </div>
              <div className="form-group span2">
                <label>Notas (visible para todos)</label>
                <textarea name="notas" value={formData.notas} onChange={handleChange} placeholder="Observaciones relevantes..." rows={2}></textarea>
              </div>
              <div className="form-group span2">
                <label>Notas internas (solo operadores)</label>
                <textarea name="notasInternas" value={formData.notasInternas} onChange={handleChange} placeholder="Notas privadas del equipo..." rows={2}></textarea>
              </div>
              <div className="form-group span2">
                <label>Link de conversación</label>
                <input type="url" name="conversacionLink" value={formData.conversacionLink} onChange={handleChange} placeholder="https://wa.me/... o https://..." />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}