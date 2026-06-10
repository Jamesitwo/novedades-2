'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ApiKeyPage() {
  const { usuario } = useAuthStore();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (usuario?.rol === 'admin') {
      fetchKeys();
    } else {
      setLoading(false);
    }
  }, [usuario]);

  const fetchKeys = async () => {
    try {
      const { data } = await api.get('/api/apikey');
      setKeys(data);
    } catch (error) {
      console.error('Error fetching keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showToast('Ingresa un nombre para la API key', 'error');
      return;
    }

    setCreating(true);
    try {
      const { data } = await api.post('/api/apikey', { nombre: newKeyName });
      setNewKey(data);
      setNewKeyName('');
      setShowForm(false);
      fetchKeys();
      showToast('API Key creada correctamente');
    } catch (error) {
      showToast('Error al crear API Key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/api/apikey/${id}/toggle`);
      fetchKeys();
      showToast('Estado actualizado');
    } catch (error) {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta API Key? Esta acción no se puede deshacer.')) return;

    try {
      await api.delete(`/api/apikey/${id}`);
      fetchKeys();
      showToast('API Key eliminada');
    } catch (error) {
      showToast('Error al eliminar', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copiado al portapapeles');
  };

  if (usuario?.rol !== 'admin') {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <h2>Acceso denegado</h2>
          <p>Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>API Keys</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>
            Usa estas claves para autenticar requests desde plataformas externas.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Nueva API Key
        </button>
      </div>

      {showForm && (
        <div className="table-card" style={{ maxWidth: 500, marginBottom: 20 }}>
          <div style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Crear nueva API Key</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                  Nombre / descripción
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ej: App Mobile, Sistema Externo"
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 14, color: 'var(--text)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => { setShowForm(false); setNewKeyName(''); }} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Creando...' : 'Crear Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newKey && (
        <div className="table-card" style={{ maxWidth: 500, marginBottom: 20, border: '2px solid var(--green)' }}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: 'var(--green)', fontSize: 18 }}>✓</span>
              <h3 style={{ fontSize: 16, color: 'var(--green)' }}>API Key creada - ¡Cópiala ahora!</h3>
            </div>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>
              Esta clave solo se muestra una vez. Guárdala en un lugar seguro.
            </p>
            <div style={{
              background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px', fontFamily: 'var(--mono)', fontSize: 13, wordBreak: 'break-all',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>{newKey.clave}</span>
              <button
                onClick={() => copyToClipboard(newKey.clave)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 12px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', marginLeft: 12
                }}
              >
                📋 Copiar
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-header">
          <span className="table-header-title">{keys.length} API Keys</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Clave</th>
              <th>Estado</th>
              <th>Creada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40 }}>Cargando...</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>No hay API Keys creadas</td></tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id}>
                  <td style={{ fontWeight: 500 }}>{key.nombre}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                      {key.clave.substring(0, 16)}...{key.clave.substring(key.clave.length - 8)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${key.activo ? 'green' : 'red'}`}>
                      {key.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {new Date(key.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleToggle(key.id)}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      >
                        {key.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card" style={{ marginTop: 20 }}>
        <div className="table-header">
          <span className="table-header-title">Cómo usar las API Keys</span>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>
            Para autenticar requests desde plataformas externas, usa el header:
          </p>
          <code style={{
            display: 'block', background: 'var(--bg3)', padding: '12px 16px', borderRadius: 8,
            fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 16
          }}>
            Authorization: ApiKey tu_clave_aqui
          </code>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>
            <strong>Ejemplo:</strong> Authorization: ApiKey abc123def456...
          </p>
        </div>
      </div>
    </div>
  );
}