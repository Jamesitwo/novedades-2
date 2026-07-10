'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const ROLES = ['admin', 'operador', 'viewer'];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'operador', accesoLucidsales: false, gestionaNovedades: true, gestionaOficina: true, gestionaPedidos: false });
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
    setFormData({ nombre: '', email: '', password: '', rol: 'operador', accesoLucidsales: false, gestionaNovedades: true, gestionaOficina: true, gestionaPedidos: false });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (usuario) => {
    setEditingUser(usuario);
    setFormData({ nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol, accesoLucidsales: usuario.accesoLucidsales || false, gestionaNovedades: usuario.gestionaNovedades !== false, gestionaOficina: usuario.gestionaOficina !== false, gestionaPedidos: usuario.gestionaPedidos || false });
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
              <th>LucidSales</th>
              <th>Novedades</th>
              <th>Oficina</th>
              <th>Pedidos</th>
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
                  <span className={`badge ${usuario.accesoLucidsales ? 'activo' : 'inactivo'}`} style={{ fontSize: 11 }}>
                    {usuario.accesoLucidsales ? 'Sí' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${usuario.gestionaNovedades !== false ? 'activo' : 'inactivo'}`} style={{ fontSize: 11 }}>
                    {usuario.gestionaNovedades !== false ? 'Sí' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${usuario.gestionaOficina !== false ? 'activo' : 'inactivo'}`} style={{ fontSize: 11 }}>
                    {usuario.gestionaOficina !== false ? 'Sí' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${usuario.gestionaPedidos ? 'activo' : 'inactivo'}`} style={{ fontSize: 11 }}>
                    {usuario.gestionaPedidos ? 'Sí' : 'No'}
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

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: formData.gestionaNovedades !== false ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>⚠ Gestiona Novedades</span>
                  <span style={{
                    width: 40, height: 22, borderRadius: 11, background: formData.gestionaNovedades !== false ? 'var(--green)' : 'var(--bg4)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: formData.gestionaNovedades !== false ? 20 : 2,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </span>
                  <input type="checkbox" checked={formData.gestionaNovedades !== false} onChange={(e) => setFormData({ ...formData, gestionaNovedades: e.target.checked })} style={{ display: 'none' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: formData.gestionaOficina !== false ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>📦 Gestiona Oficina</span>
                  <span style={{
                    width: 40, height: 22, borderRadius: 11, background: formData.gestionaOficina !== false ? 'var(--green)' : 'var(--bg4)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: formData.gestionaOficina !== false ? 20 : 2,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </span>
                  <input type="checkbox" checked={formData.gestionaOficina !== false} onChange={(e) => setFormData({ ...formData, gestionaOficina: e.target.checked })} style={{ display: 'none' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: formData.accesoLucidsales ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>💎 Acceso a LucidSales</span>
                  <span style={{
                    width: 40, height: 22, borderRadius: 11, background: formData.accesoLucidsales ? 'var(--green)' : 'var(--bg4)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: formData.accesoLucidsales ? 20 : 2,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </span>
                  <input type="checkbox" checked={formData.accesoLucidsales} onChange={(e) => setFormData({ ...formData, accesoLucidsales: e.target.checked })} style={{ display: 'none' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: formData.gestionaPedidos ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>📋 Gestiona Pedidos</span>
                  <span style={{
                    width: 40, height: 22, borderRadius: 11, background: formData.gestionaPedidos ? 'var(--green)' : 'var(--bg4)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: formData.gestionaPedidos ? 20 : 2,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </span>
                  <input type="checkbox" checked={formData.gestionaPedidos} onChange={(e) => setFormData({ ...formData, gestionaPedidos: e.target.checked })} style={{ display: 'none' }} />
                </label>
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