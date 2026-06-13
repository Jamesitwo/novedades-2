'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const ROLES = ['admin', 'operador', 'viewer'];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'operador' });
  const [error, setError] = useState('');

  const fetchUsuarios = async () => {
    try {
      const { data } = await api.get('/api/usuarios');
      setUsuarios(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ nombre: '', email: '', password: '', rol: 'operador' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (usuario) => {
    setEditingUser(usuario);
    setFormData({ nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        await api.put(`/api/usuarios/${editingUser.id}`, formData);
      } else {
        await api.post('/api/usuarios', formData);
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleToggleActivo = async (usuario) => {
    if (!confirm(`¿${usuario.activo ? 'Desactivar' : 'Activar'} a ${usuario.nombre}?`)) return;
    try {
      await api.put(`/api/usuarios/${usuario.id}`, { activo: !usuario.activo, password: '' });
      fetchUsuarios();
    } catch (error) {
      showToast('Error al actualizar usuario', 'error');
    }
  };

  const handleToggleVerSoloAsignados = async (usuario) => {
    try {
      await api.put(`/api/usuarios/${usuario.id}`, { verSoloAsignados: !usuario.verSoloAsignados, password: '' });
      fetchUsuarios();
    } catch (error) {
      showToast('Error al actualizar', 'error');
    }
  };

  const getBadgeClass = (rol) => {
    const m = { admin: 'admin', operador: 'operador', viewer: 'viewer' };
    return m[rol] || rol;
  };

  return (
    <div className="content">
      <div className="table-card">
        <div className="table-header">
          <span className="table-header-title">{usuarios.length} usuarios registrados</span>
          <button onClick={openCreateModal} className="btn btn-primary">+ Nuevo usuario</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Visibilidad</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td><div className="td-name">{usuario.nombre}</div></td>
                <td className="td-mono" style={{ fontSize: 12 }}>{usuario.email}</td>
                <td><span className={`badge ${getBadgeClass(usuario.rol)}`}>{usuario.rol}</span></td>
                <td>
                  <span className={`badge ${usuario.activo ? 'activo' : 'inactivo'}`}>
                    {usuario.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  {usuario.rol !== 'admin' && (
                    <button
                      onClick={() => handleToggleVerSoloAsignados(usuario)}
                      style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', border: '1px solid var(--border)',
                        background: usuario.verSoloAsignados ? 'rgba(99,102,241,0.15)' : 'var(--bg3)',
                        color: usuario.verSoloAsignados ? 'var(--accent)' : 'var(--text3)',
                        transition: 'all 0.15s'
                      }}
                      title={usuario.verSoloAsignados ? 'Viendo solo asignados' : 'Viendo todos'}
                    >
                      {usuario.verSoloAsignados ? '👤 Solo asignados' : '🌐 Todos'}
                    </button>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => openEditModal(usuario)} className="action-btn">Editar</button>
                    <button
                      onClick={() => handleToggleActivo(usuario)}
                      className={`action-btn ${usuario.activo ? 'danger' : ''}`}
                    >
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="form-title">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</div>
            <div className="form-subtitle">
              {editingUser ? 'Actualiza los datos del usuario' : 'Completa la información del nuevo usuario'}
            </div>

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

              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña {editingUser && '(dejar vacío para no cambiar)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>

              <div className="form-group">
                <label>Rol</label>
                <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
                  {ROLES.map((rol) => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}