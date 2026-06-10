'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NuevaNovedadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    celular: '',
    producto: '',
    totalAPagar: '',
    transportadora: '',
    guia: '',
    motivoNovedad: '',
    notas: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/novedades', formData);
      router.push('/novedades');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear novedad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="form-container">
        <div className="form-card">
          <div className="form-title">Nuevo registro — Novedad</div>
          <div className="form-subtitle">Completa la información del pedido con novedad de entrega</div>

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
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Juan" />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required placeholder="García" />
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input type="text" name="celular" value={formData.celular} onChange={handleChange} required placeholder="3001234567" />
              </div>
              <div className="form-group">
                <label>Total a pagar</label>
                <input type="number" name="totalAPagar" value={formData.totalAPagar} onChange={handleChange} required placeholder="120000" />
              </div>
              <div className="form-group span2">
                <label>Producto</label>
                <input type="text" name="producto" value={formData.producto} onChange={handleChange} required placeholder="Nombre del producto" />
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
                <label>Motivo de la novedad</label>
                <input type="text" name="motivoNovedad" value={formData.motivoNovedad} onChange={handleChange} required placeholder="Ej: No atendido, dirección incorrecta, etc." />
              </div>
              <div className="form-group span2">
                <label>Notas internas</label>
                <textarea name="notas" value={formData.notas} onChange={handleChange} placeholder="Observaciones relevantes..." rows={3}></textarea>
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