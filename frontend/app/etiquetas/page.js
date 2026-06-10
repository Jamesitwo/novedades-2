'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { TableSkeleton } from '@/components/Skeleton';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#6b7280'
];

export default function EtiquetasPage() {
  const { usuario } = useAuthStore();
  const [etiquetas, setEtiquetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEtiquetas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/etiquetas');
      setEtiquetas(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEtiquetas(); }, []);

  const openModal = (e = null) => {
    if (e) {
      setEditando(e);
      setNombre(e.nombre);
      setColor(e.color);
    } else {
      setEditando(null);
      setNombre('');
      setColor('#6366f1');
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/api/etiquetas/${editando.id}`, { nombre: nombre.trim(), color });
      } else {
        await api.post('/api/etiquetas', { nombre: nombre.trim(), color });
      }
      setShowModal(false);
      fetchEtiquetas();
      showToast(editando ? 'Etiqueta actualizada' : 'Etiqueta creada');
    } catch (error) {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (etq) => {
    if (!confirm(`¿Eliminar etiqueta "${etq.nombre}"? Se desasignará de todos los registros.`)) return;
    try {
      await api.delete(`/api/etiquetas/${etq.id}`);
      fetchEtiquetas();
      showToast('Etiqueta eliminada');
    } catch (error) {
      showToast('Error al eliminar', 'error');
    }
  };

  return (
    <div className="content">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 500
        }}>{toast.message}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Etiquetas</h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Gestiona etiquetas para clasificar novedades y pedidos de oficina</div>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          + Nueva etiqueta
        </button>
      </div>

      {loading ? (
        <div className="table-card"><TableSkeleton rows={4} columns={4} /></div>
      ) : etiquetas.length === 0 ? (
        <div className="table-card">
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>
            No hay etiquetas. Crea la primera para empezar a clasificar registros.
          </div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Vista previa</th>
                <th>Nombre</th>
                <th>Color</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {etiquetas.map(e => (
                <tr key={e.id}>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                      fontSize: 11, fontWeight: 600, color: '#fff', background: e.color
                    }}>
                      {e.nombre}
                    </span>
                  </td>
                  <td className="td-name">{e.nombre}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: e.color }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{e.color}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {new Date(e.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td>
                    {usuario?.rol === 'admin' ? (
                      <div className="row-actions">
                        <button onClick={() => openModal(e)} className="action-btn">Editar</button>
                        <button onClick={() => handleDelete(e)} className="action-btn danger">Eliminar</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 14, width: 'min(400px, 92vw)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 16 }}>
              {editando ? 'Editar etiqueta' : 'Nueva etiqueta'}
            </div>
            <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Nombre
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  placeholder="Ej: Prioridad Alta"
                  autoFocus
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none'
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                Color
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: c, border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer', transition: 'transform 0.1s', transform: color === c ? 'scale(1.15)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: color, border: '1px solid var(--border)' }} />
                  <input
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)',
                      width: 100
                    }}
                  />
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6, background: 'transparent' }}
                  />
                </div>
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
